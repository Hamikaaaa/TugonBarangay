<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
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

        return $query->paginate($validated['per_page'] ?? 25);
    }

    public function documentRequestDashboard()
    {
        $statuses = ['pending', 'under_review', 'processing', 'for_correction', 'ready_for_release', 'completed', 'rejected'];
        $counts = DocumentRequest::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');
        $typeCounts = DocumentRequest::query()
            ->selectRaw('document_type, status, COUNT(*) as count')
            ->groupBy('document_type', 'status')
            ->get()
            ->groupBy('document_type');
        $types = DocumentType::query()
            ->whereNotNull('value')
            ->where('active', true)
            ->orderBy('label')
            ->get(['value', 'label'])
            ->map(fn (DocumentType $type) => [
                'value' => $type->value,
                'label' => $type->label,
            ]);

        foreach ($typeCounts as $value => $statusCounts) {
            if (!$types->contains('value', $value)) {
                $types->push([
                    'value' => $value,
                    'label' => DocumentType::where('value', $value)->value('label') ?? $value,
                ]);
            }
        }

        $summaryByType = $types->map(function (array $type) use ($typeCounts, $statuses) {
            $countsForType = $typeCounts->get($type['value'], collect())->keyBy('status');
            $result = [
                'value' => $type['value'],
                'label' => $type['label'],
                'total' => $countsForType->sum('count'),
            ];
            foreach ($statuses as $status) {
                $result[$status] = (int) ($countsForType->get($status)?->count ?? 0);
            }

            return $result;
        })->values();

        $relations = ['resident', 'type', 'assignedStaff'];
        $attention = DocumentRequest::query()
            ->with($relations)
            ->whereIn('status', ['pending', 'under_review', 'processing', 'for_correction', 'ready_for_release'])
            ->orderByRaw("CASE status WHEN 'for_correction' THEN 0 WHEN 'pending' THEN 1 WHEN 'under_review' THEN 2 ELSE 3 END")
            ->orderBy('created_at')
            ->limit(8)
            ->get();
        $recent = DocumentRequest::query()
            ->with($relations)
            ->whereNotIn('id', $attention->modelKeys())
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => [
                'total' => (int) $counts->sum(),
                'counts' => collect($statuses)->mapWithKeys(fn (string $status) => [
                    $status => (int) ($counts[$status] ?? 0),
                ]),
                'summary_by_type' => $summaryByType,
                'attention' => $attention,
                'recent' => $recent,
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
        if ($documentRequest->status !== 'processing') {
            return response()->json([
                'message' => 'A document preview can only be generated while the request is processing.',
            ], 409);
        }

        $rules = [
            'document_content' => ['sometimes', 'required', 'array'],
            'staff_remarks' => ['nullable', 'string', 'max:2000'],
        ];
        $configuredType = DocumentType::where('value', $documentRequest->document_type)->first();
        $configuredFields = collect($configuredType?->applicant_fields ?? [])
            ->merge($configuredType?->fields ?? []);
        $derivesAge = $configuredFields->contains('key', 'date_of_birth')
            && $configuredFields->contains('key', 'age');
        if ($derivesAge || in_array($documentRequest->document_type, ['Barangay Certification', 'Barangay Residency'], true)) {
            $rules['document_content.date_of_birth'] = ['required', 'date', 'before_or_equal:today'];
        }
        $validated = $request->validate($rules);
        $hadPreview = $documentRequest->document_generated_at !== null;
        $preview = $request->input('document_content', $this->buildDocumentPayload($documentRequest));
        if (
            ($derivesAge || in_array($documentRequest->document_type, ['Barangay Certification', 'Barangay Residency'], true))
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
            'data' => $documentRequest->fresh()->load(['resident', 'type', 'assignedStaff']),
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
}
