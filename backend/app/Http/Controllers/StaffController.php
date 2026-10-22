<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\BarangayRegistry;
use App\Models\DocumentRequest;
use App\Models\DocumentRequestEvent;
use App\Models\DocumentType;
use App\Models\Resident;
use App\Models\ResidentNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

class StaffController extends Controller
{
    public function documentRequests(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:all,pending,under_review,processing,for_correction,ready_for_release,completed,rejected'],
            'document_type' => ['sometimes', 'string', 'max:100'],
            'search' => ['sometimes', 'string', 'max:150'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'sort_by' => ['sometimes', 'string', 'in:created_at,id,document_type,resident_name'],
            'sort_direction' => ['sometimes', 'string', 'in:asc,desc'],
        ]);
        $query = DocumentRequest::query()->with(['resident', 'type', 'assignedStaff']);

        if (array_key_exists('status', $validated)) {
            $status = $validated['status'];
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        } else {
            $query->whereNotIn('status', ['completed', 'rejected']);
        }

        if (!empty($validated['document_type'])) {
            $query->where('document_type', $validated['document_type']);
        }

        if (!empty($validated['from'])) {
            $query->whereDate('created_at', '>=', $validated['from']);
        }

        if (!empty($validated['to'])) {
            $query->whereDate('created_at', '<=', $validated['to']);
        }

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhere('document_type', 'like', "%{$search}%")
                    ->orWhereHas('resident', function ($residentQuery) use ($search) {
                        $residentQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $direction = $validated['sort_direction'] ?? 'desc';
        $sortBy = $validated['sort_by'] ?? 'created_at';
        if ($sortBy === 'resident_name') {
            $query->orderBy(
                Resident::query()
                    ->select('name')
                    ->whereColumn('residents.id', 'document_requests.resident_id'),
                $direction,
            );
        } else {
            $query->orderBy($sortBy, $direction);
        }

        $page = $query->paginate($validated['per_page'] ?? 25);
        $page->getCollection()->transform(function (DocumentRequest $documentRequest) {
            $documentRequest->setAttribute(
                'identity_review',
                $this->documentRequestIdentityReview($documentRequest),
            );

            return $documentRequest;
        });

        return $page;
    }

    public function documentRequestDashboard()
    {
        $statuses = ['pending', 'under_review', 'processing', 'for_correction', 'ready_for_release', 'completed', 'rejected'];
        $counts = DocumentRequest::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');
        $countsByType = DocumentRequest::query()
            ->selectRaw('document_type, status, COUNT(*) as count')
            ->groupBy('document_type', 'status')
            ->get()
            ->groupBy('document_type')
            ->map(function ($typeRows, string $documentType) use ($statuses) {
                $statusCounts = $typeRows->keyBy('status');
                $result = ['value' => $documentType];
                foreach ($statuses as $status) {
                    $result[$status] = (int) ($statusCounts->get($status)?->count ?? 0);
                }

                return $result;
            })
            ->values();
        return response()->json([
            'data' => [
                'total' => (int) $counts->sum(),
                'counts' => collect($statuses)->mapWithKeys(fn (string $status) => [
                    $status => (int) ($counts[$status] ?? 0),
                ]),
                'summary_by_type' => $countsByType,
                'updated_at' => Carbon::now()->toIso8601String(),
            ],
        ]);
    }

    public function showDocumentRequest(DocumentRequest $documentRequest)
    {
        return response()->json([
            'data' => $documentRequest->load(['resident', 'type', 'assignedStaff']),
        ]);
    }

    public function generateDocumentPreview(Request $request, DocumentRequest $documentRequest)
    {
        if (!in_array($documentRequest->status, ['processing', 'ready_for_release'], true)) {
            return response()->json([
                'message' => 'A document preview can only be generated while the request is processing or ready for release.',
            ], 409);
        }

        $rules = [
            'document_content' => ['sometimes', 'required', 'array'],
            'staff_remarks' => ['nullable', 'string', 'max:2000'],
        ];
        $configuredType = DocumentType::where('value', $documentRequest->document_type)->first();
        $configuredFields = collect($configuredType?->applicant_fields ?? [])
            ->merge($configuredType?->fields ?? []);
        $isResidencyCertificate = $documentRequest->document_type === 'Barangay Residency';
        $derivesAge = !$isResidencyCertificate
            && $configuredFields->contains('key', 'date_of_birth')
            && $configuredFields->contains('key', 'age');
        if ($derivesAge || $documentRequest->document_type === 'Barangay Certification') {
            $rules['document_content.date_of_birth'] = ['required', 'date', 'before_or_equal:today'];
        }
        $validated = $request->validate($rules);
        $hadPreview = $documentRequest->document_generated_at !== null;
        $preview = $request->input('document_content', $this->buildDocumentPayload($documentRequest));
        if (
            ($derivesAge || $documentRequest->document_type === 'Barangay Certification')
            && !empty($preview['date_of_birth'])
        ) {
            $preview['age'] = Carbon::parse($preview['date_of_birth'])->age;
        }

        if (Schema::hasColumn('document_requests', 'document_content')) {
            $documentRequest->document_content = $preview;
        }

        if (Schema::hasColumn('document_requests', 'document_generated_at')) {
            $documentRequest->document_generated_at = now();
        }

        if (Schema::hasColumn('document_requests', 'staff_remarks') && array_key_exists('staff_remarks', $validated)) {
            $documentRequest->staff_remarks = $validated['staff_remarks'];
        }

        $documentRequest->save();
        if (filled($validated['staff_remarks'] ?? null)) {
            $this->notifyResidentOfStaffRemarks($documentRequest, $validated['staff_remarks']);
        }
        DocumentRequestEvent::record(
            $documentRequest,
            $request->user(),
            $hadPreview ? 'document_edited' : 'preview_generated',
            $documentRequest->status,
            $documentRequest->status,
        );

        return response()->json([
            'message' => 'Document preview generated successfully.',
            'data' => $documentRequest->fresh()->load(['resident', 'type', 'assignedStaff']),
        ]);
    }

    private function notifyResidentOfStaffRemarks(DocumentRequest $documentRequest, ?string $staffRemarks): void
    {
        if (blank($staffRemarks)) {
            return;
        }

        $documentLabel = $documentRequest->document_type_label ?? $documentRequest->document_type;
        ResidentNotification::create([
            'resident_id' => $documentRequest->resident_id,
            'type' => 'document_request_staff_remarks',
            'title' => 'Barangay staff has left a note',
            'message' => "For your {$documentLabel} request, barangay staff left this note:\n\n{$staffRemarks}",
        ]);
    }

    public function updateDocumentRequestStatus(Request $request, DocumentRequest $documentRequest)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,under_review,processing,for_correction,ready_for_release,completed,rejected'],
            'staff_remarks' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'rejection_reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);
        $status = $validated['status'];

        $validTransitions = [
            'pending' => ['under_review', 'for_correction', 'rejected'],
            'under_review' => ['processing', 'for_correction', 'rejected'],
            'processing' => ['ready_for_release', 'for_correction', 'rejected'],
            'ready_for_release' => ['completed'],
            'completed' => [],
            'rejected' => [],
        ];

        if (!in_array($status, $validTransitions[$documentRequest->status] ?? [], true)) {
            return response()->json([
                'message' => 'This status transition is not allowed.',
            ], 409);
        }

        if ($status === 'for_correction' && blank($validated['staff_remarks'] ?? null)) {
            return response()->json([
                'message' => 'Staff remarks explaining the required correction are required.',
            ], 422);
        }

        if ($status === 'rejected' && blank($validated['staff_remarks'] ?? null)) {
            return response()->json([
                'message' => 'Staff remarks explaining the rejection are required.',
            ], 422);
        }

        if ($status === 'rejected' && blank($validated['rejection_reason'] ?? null)) {
            return response()->json([
                'message' => 'A rejection reason is required.',
            ], 422);
        }

        if ($status === 'ready_for_release' && (
            $documentRequest->document_content === null
            || (Schema::hasColumn('document_requests', 'document_generated_at') && !$documentRequest->document_generated_at)
        )) {
            return response()->json([
                'message' => 'Generate and review the document before marking it ready for release.',
            ], 409);
        }
        if ($status === 'ready_for_release' && ($documentRequest->details['fee_mode'] ?? null) === 'assessed'
            && empty($documentRequest->details['fee_assessed'])) {
            return response()->json([
                'message' => 'Assess and save the business fee before marking the document ready for release.',
            ], 409);
        }

        $previousStatus = $documentRequest->status;
        $update = [
            'status' => $status,
            'status_changed_at' => now(),
        ];
        if (in_array($status, ['under_review', 'processing'], true) && !$documentRequest->assigned_staff_id) {
            $update['assigned_staff_id'] = $request->user()->id;
        }

        if (array_key_exists('staff_remarks', $validated)) {
            $update['staff_remarks'] = $validated['staff_remarks'];
        }

        if ($status === 'rejected') {
            $update['rejection_reason'] = $validated['rejection_reason'];
        } elseif (Schema::hasColumn('document_requests', 'rejection_reason')) {
            $update['rejection_reason'] = null;
        }

        if ($status === 'completed' && Schema::hasColumn('document_requests', 'released_at')) {
            $update['released_at'] = now();
        }

        if ($status === 'for_correction') {
            if (Schema::hasColumn('document_requests', 'document_content')) {
                $update['document_content'] = null;
            }
            if (Schema::hasColumn('document_requests', 'document_generated_at')) {
                $update['document_generated_at'] = null;
            }
        }

        $documentRequest->fill($update);
        $documentRequest->save();
        if ($status === 'rejected' && $documentRequest->document_type === 'First-Time Jobseeker Certification') {
            DB::table('first_time_jobseeker_availments')
                ->where('document_request_id', $documentRequest->id)
                ->delete();
        }
        DocumentRequestEvent::record(
            $documentRequest,
            $request->user(),
            'status_changed',
            $previousStatus,
            $status,
            array_filter([
                'staff_remarks' => $validated['staff_remarks'] ?? null,
                'rejection_reason' => $validated['rejection_reason'] ?? null,
            ], fn ($value) => $value !== null && $value !== ''),
        );

        $messages = [
            'under_review' => ['Document request under review', 'Your document request is being reviewed by barangay staff.'],
            'processing' => ['Document request approved', 'Your requirements were verified and your document request is now being processed.'],
            'for_correction' => ['Correction needed for your document request', $validated['staff_remarks'] ?? null],
            'ready_for_release' => ['Document ready for release', 'Your document is ready. Please claim it at the barangay office.'],
            'completed' => ['Document request completed', 'Your document request was marked complete after release.'],
            'rejected' => ['Document request rejected', $validated['rejection_reason'] ?? null],
        ];
        [$notificationTitle, $notificationMessage] = $messages[$status];
        ResidentNotification::create([
            'resident_id' => $documentRequest->resident_id,
            'type' => 'document_request_'.$status,
            'title' => $notificationTitle,
            'message' => $notificationMessage,
        ]);

        return response()->json([
            'message' => 'Document request updated successfully.',
            'data' => $documentRequest->fresh()->load(['resident', 'type', 'assignedStaff'])->setAttribute(
                'identity_review',
                $this->documentRequestIdentityReview($documentRequest),
            ),
        ]);
    }

    public function updateDocumentRequestFee(Request $request, DocumentRequest $documentRequest)
    {
        $validated = $request->validate([
            'fee' => ['required', 'numeric', 'min:0', 'max:1000000000'],
        ]);
        abort_unless(
            ($documentRequest->details['fee_mode'] ?? null) === 'assessed',
            422,
            'This document type does not use an assessed fee.',
        );
        abort_unless(in_array($documentRequest->status, ['pending', 'under_review', 'processing'], true), 409, 'The fee can only be assessed before release.');

        $previousFee = (float) $documentRequest->fee;
        $documentRequest->fee = $validated['fee'];
        $details = $documentRequest->details ?? [];
        $details['fee_assessed'] = true;
        $documentRequest->details = $details;
        $documentRequest->save();
        DocumentRequestEvent::record(
            $documentRequest,
            $request->user(),
            'fee_assessed',
            $documentRequest->status,
            $documentRequest->status,
            ['previous_fee' => $previousFee, 'fee' => (float) $documentRequest->fee],
        );
        $documentLabel = $documentRequest->document_type_label;
        ResidentNotification::create([
            'resident_id' => $documentRequest->resident_id,
            'type' => 'document_request_fee_assessed',
            'title' => "{$documentLabel} fee assessed",
            'message' => "The fee for your {$documentLabel} request is ₱".number_format((float) $documentRequest->fee, 2).'. It is payable at the barangay upon release.',
        ]);

        return response()->json([
            'message' => 'Assessed fee updated.',
            'data' => $documentRequest->fresh()->load(['resident', 'type', 'assignedStaff']),
        ]);
    }

    public function downloadDocumentRequirement(DocumentRequest $documentRequest, string $requirement)
    {
        $requirements = $documentRequest->details['requirements'] ?? [];
        $file = $requirements[$requirement] ?? null;
        abort_unless(is_array($file) && !empty($file['path']), 404);
        $disk = Storage::disk('local');
        abort_unless($disk->exists($file['path']), 404);

        $filename = $file['original_name'] ?? basename($file['path']);
        $headers = [
            'Cache-Control' => 'private, no-store',
            'Content-Disposition' => (new ResponseHeaderBag)->makeDisposition(
                ResponseHeaderBag::DISPOSITION_INLINE,
                $filename,
                preg_replace('/[^A-Za-z0-9_.-]/', '_', $filename),
            ),
        ];

        $headers['Content-Type'] = mime_content_type($disk->path($file['path'])) ?: 'application/octet-stream';

        return response()->stream(function () use ($disk, $file): void {
            $stream = $disk->readStream($file['path']);
            if (is_resource($stream)) {
                fpassthru($stream);
                fclose($stream);
            }
        }, 200, $headers);
    }

    public function complaints(Request $request)
    {
        $query = Complaint::query()->with('user');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $search = trim($request->string('search')->toString());
            $query->where(function ($complaintQuery) use ($search) {
                $complaintQuery->where('id', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($residentQuery) use ($search) {
                        $residentQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $complaints = (clone $query)
            ->orderByRaw("CASE
                WHEN priority = 'urgent' AND status NOT IN ('resolved', 'rejected', 'closed') THEN 0
                WHEN status NOT IN ('resolved', 'rejected', 'closed') THEN 1
                ELSE 2
            END")
            ->latest()
            ->paginate(25);
        $counts = (clone $query)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');
        $priorityCounts = (clone $query)
            ->selectRaw('priority, COUNT(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority');
        $categoryCounts = (clone $query)
            ->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->orderByDesc('count')
            ->get();

        return response()->json(array_merge($complaints->toArray(), [
            'counts' => $counts,
            'priority_counts' => $priorityCounts,
            'category_counts' => $categoryCounts,
        ]));
    }

    public function showComplaint(Complaint $complaint)
    {
        return response()->json([
            'data' => $complaint->load('user'),
        ]);
    }

    public function updateComplaintClassification(Request $request, Complaint $complaint)
    {
        $validated = $request->validate([
            'priority' => ['required', 'string', 'in:normal,urgent'],
        ]);

        $complaint->update(['priority' => $validated['priority']]);

        return response()->json([
            'message' => 'Complaint priority updated.',
            'data' => $complaint->fresh()->load('user'),
        ]);
    }

    public function updateComplaintStatus(Request $request, Complaint $complaint)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,in_progress,resolved,rejected,closed'],
            'staff_remarks' => ['nullable', 'string', 'max:2000'],
            'resolution_details' => ['nullable', 'string', 'max:5000'],
        ]);

        $transitions = [
            'pending' => ['in_progress', 'resolved', 'rejected'],
            'in_progress' => ['resolved', 'rejected'],
            'resolved' => ['closed'],
            'rejected' => [],
            'closed' => [],
        ];
        if (!in_array($validated['status'], $transitions[$complaint->status] ?? [], true)) {
            return response()->json([
                'message' => 'This complaint status transition is not allowed.',
            ], 409);
        }

        if (in_array($validated['status'], ['resolved', 'rejected'], true) && blank($validated['resolution_details'] ?? null)) {
            return response()->json([
                'message' => 'Resolution details are required to resolve or reject a complaint.',
            ], 422);
        }

        DB::transaction(function () use ($complaint, $validated): void {
            $complaint->status = $validated['status'];
            $complaint->staff_remarks = $validated['staff_remarks'] ?? null;
            $complaint->resolution_details = $validated['resolution_details'] ?? null;
            $complaint->resolved_at = in_array($validated['status'], ['resolved', 'closed'], true)
                ? ($complaint->resolved_at ?? now())
                : null;
            $complaint->save();

            $statusLabel = str_replace('_', ' ', ucfirst($validated['status']));
            $caseReference = 'CMP-'.str_pad((string) $complaint->id, 5, '0', STR_PAD_LEFT);
            $message = "The status of your complaint {$caseReference} is now {$statusLabel}.";
            if (filled($validated['staff_remarks'] ?? null)) {
                $message .= "\n\nStaff remarks: ".$validated['staff_remarks'];
            }
            if (filled($validated['resolution_details'] ?? null)) {
                $message .= "\n\nCase resolution: ".$validated['resolution_details'];
            }

            ResidentNotification::create([
                'resident_id' => $complaint->resident_id,
                'type' => 'complaint_status_updated',
                'title' => "Update on complaint {$caseReference}",
                'message' => $message,
            ]);
        });

        return response()->json([
            'message' => 'Complaint updated successfully.',
            'data' => $complaint->fresh()->load('user'),
        ]);
    }

    public function downloadComplaintEvidence(Complaint $complaint)
    {
        $path = $complaint->evidence_path;
        $disk = Storage::disk('local');
        abort_unless($path && $disk->exists($path), 404);
        $stream = $disk->readStream($path);
        abort_unless(is_resource($stream), 404);
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $filename = 'complaint-evidence-'.$complaint->id.($extension ? ".{$extension}" : '');
        $mimeType = mime_content_type($disk->path($path)) ?: 'application/octet-stream';

        return response()->streamDownload(function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, $filename, [
            'Cache-Control' => 'private, no-store',
            'Content-Type' => $mimeType,
        ]);
    }

    public function destroyDocumentRequest(DocumentRequest $documentRequest)
    {
        if (!in_array($documentRequest->status, ['completed', 'rejected'], true)) {
            return response()->json([
                'message' => 'Only completed or rejected requests can be deleted.',
            ], 403);
        }

        $documentRequest->delete();

        return response()->json([
            'message' => 'Document request deleted successfully.',
        ]);
    }

    private function buildDocumentPayload(DocumentRequest $documentRequest): array
    {
        return array_merge($documentRequest->details['form_fields'] ?? [], [
            'title' => $documentRequest->document_type,
            'resident_name' => $documentRequest->resident?->name ?? 'Resident',
            'issued_at' => now()->toIso8601String(),
            'status' => $documentRequest->status,
            'notes' => $documentRequest->staff_remarks ?? 'No remarks',
        ]);
    }

    private function documentRequestIdentityReview(DocumentRequest $documentRequest): array
    {
        $resident = $documentRequest->resident;
        if (!$resident) {
            return [
                'ok' => false,
                'registry_found' => false,
                'fields' => [],
                'message' => 'The resident profile could not be found.',
            ];
        }

        $registryQuery = BarangayRegistry::query()
            ->whereRaw('LOWER(first_name) = ?', [mb_strtolower(trim((string) $resident->first_name))])
            ->whereRaw('LOWER(last_name) = ?', [mb_strtolower(trim((string) $resident->last_name))]);
        $registry = (clone $registryQuery)
            ->whereDate('date_of_birth', $resident->date_of_birth)
            ->whereRaw('LOWER(sex) = ?', [mb_strtolower(trim((string) $resident->sex))])
            ->whereRaw('LOWER(purok) = ?', [mb_strtolower(trim((string) $resident->purok))])
            ->first();
        if (!$registry) {
            $dateMatches = (clone $registryQuery)
                ->whereDate('date_of_birth', $resident->date_of_birth)
                ->limit(2)
                ->get();
            if ($dateMatches->count() === 1) {
                $registry = $dateMatches->first();
            }
        }
        if (!$registry) {
            $nameMatches = (clone $registryQuery)->limit(2)->get();
            if ($nameMatches->count() === 1) {
                $registry = $nameMatches->first();
            }
        }

        if (!$registry) {
            return [
                'ok' => false,
                'registry_found' => false,
                'fields' => [],
                'message' => 'No unique barangay registry record matches this resident. Ask an administrator to verify the resident records.',
            ];
        }

        $profileFullName = collect([
            $resident->first_name,
            $resident->middle_name,
            $resident->last_name,
            $resident->suffix,
        ])->filter()->implode(' ');
        $registryFullName = collect([
            $registry->first_name,
            $registry->middle_name,
            $registry->last_name,
            $registry->suffix,
        ])->filter()->implode(' ');
        $submitted = $documentRequest->details['form_fields'] ?? [];
        $values = [
            'full_name' => ['label' => 'Full name', 'profile' => $profileFullName, 'registry' => $registryFullName],
            'date_of_birth' => ['label' => 'Date of birth', 'profile' => $resident->date_of_birth, 'registry' => $registry->date_of_birth],
            'sex' => ['label' => 'Sex', 'profile' => $resident->sex, 'registry' => $registry->sex],
            'purok' => ['label' => 'Purok', 'profile' => $resident->purok, 'registry' => $registry->purok],
            'address' => ['label' => 'Address', 'profile' => $resident->address, 'registry' => $registry->address],
        ];

        $fields = [];
        foreach ($values as $key => $value) {
            if ($key === 'address' && blank($value['registry'])) {
                continue;
            }
            $submittedValue = $key === 'full_name'
                ? (collect([$submitted['first_name'] ?? null, $submitted['middle_name'] ?? null, $submitted['last_name'] ?? null, $submitted['suffix'] ?? null])->filter()->implode(' ') ?: ($submitted['full_name'] ?? $profileFullName))
                : ($submitted[$key] ?? null);
            $profileMatches = blank($value['profile']) || ($key === 'full_name'
                ? $this->profileNameMatchesRegistry($resident, $registry)
                : $this->sameIdentityValue($value['profile'], $value['registry'], $key));
            $submissionMatches = blank($submittedValue) || ($key === 'full_name'
                ? (in_array($documentRequest->document_type, [
                    'Barangay Indigency',
                    'Barangay Residency',
                    'Barangay Certificate',
                    'First-Time Jobseeker Certification',
                ], true)
                    ? $this->requestNameMatchesRegistry($submittedValue, $registry)
                    : $this->sameIdentityValue($submittedValue, $value['registry'], $key))
                : $this->sameIdentityValue($submittedValue, $value['registry'], $key));
            $fields[] = [
                'key' => $key,
                'label' => $value['label'],
                'profile' => $value['profile'],
                'registry' => $value['registry'],
                'submitted' => $submittedValue,
                'ok' => $profileMatches && $submissionMatches,
            ];
        }

        $registryAge = Carbon::parse($registry->date_of_birth)->age;
        if (array_key_exists('age', $submitted)) {
            $fields[] = [
                'key' => 'age',
                'label' => 'Age',
                'profile' => null,
                'registry' => $registryAge,
                'submitted' => $submitted['age'],
                'ok' => (string) $submitted['age'] === (string) $registryAge,
            ];
        }

        return [
            'ok' => collect($fields)->every(fn (array $field) => $field['ok']),
            'registry_found' => true,
            'fields' => $fields,
            'message' => null,
        ];
    }

    private function sameIdentityValue(mixed $left, mixed $right, string $key): bool
    {
        if ($key === 'date_of_birth') {
            return substr((string) $left, 0, 10) === substr((string) $right, 0, 10);
        }

        $normalize = fn ($value) => mb_strtolower(preg_replace('/\s+/', ' ', trim((string) $value)));

        return $normalize($left) === $normalize($right);
    }

    private function profileNameMatchesRegistry(Resident $resident, BarangayRegistry $registry): bool
    {
        foreach ([
            'first_name' => 'first_name',
            'middle_name' => 'middle_name',
            'last_name' => 'last_name',
            'suffix' => 'suffix',
        ] as $profileField => $registryField) {
            $profileValue = $resident->{$profileField};
            if (!blank($profileValue) && !$this->sameIdentityValue($profileValue, $registry->{$registryField}, $profileField)) {
                return false;
            }
        }

        return true;
    }

    private function requestNameMatchesRegistry(mixed $candidateName, BarangayRegistry $registry): bool
    {
        $candidate = $this->normalizedNameParts($candidateName);
        $registryFirst = $this->normalizedNameParts($registry->first_name);
        $registryMiddle = $this->normalizedNameParts($registry->middle_name);
        $registryLast = $this->normalizedNameParts($registry->last_name);
        $registrySuffix = $this->normalizedNameParts($registry->suffix);

        if (!$candidate || !$registryFirst || !$registryLast || count($candidate) < 2) {
            return false;
        }

        $candidateSuffix = [];
        if ($registrySuffix) {
            if (array_slice($candidate, -count($registrySuffix)) !== $registrySuffix) {
                return false;
            }
            $candidateSuffix = $registrySuffix;
            $candidate = array_slice($candidate, 0, -count($registrySuffix));
        }

        $registryNameLength = count($registryFirst) + count($registryLast);
        if (count($candidate) < $registryNameLength
            || array_slice($candidate, 0, count($registryFirst)) !== $registryFirst
            || array_slice($candidate, -count($registryLast)) !== $registryLast) {
            return false;
        }

        $candidateMiddle = array_slice($candidate, count($registryFirst), count($candidate) - $registryNameLength);
        if (!$candidateMiddle) {
            return true;
        }

        return $candidateMiddle === $registryMiddle && $candidateSuffix === $registrySuffix;
    }

    private function normalizedNameParts(mixed $value): array
    {
        $normalized = mb_strtolower(trim((string) $value));
        $normalized = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $normalized) ?? '';

        return array_values(array_filter(explode(' ', trim($normalized)), fn (string $part) => $part !== ''));
    }
}
