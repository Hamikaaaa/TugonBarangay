<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\BarangayRegistry;
use App\Models\BlotterEntry;
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
            $documentRequest->setAttribute(
                'clearance_number',
                $documentRequest->clearanceSequenceNumber(),
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
        $documentRequest->load(['resident', 'type', 'assignedStaff']);
        $documentRequest->setAttribute(
            'identity_review',
            $this->getDocumentRequestIdentityReview($documentRequest),
        );
        $documentRequest->setAttribute(
            'clearance_number',
            $documentRequest->clearanceSequenceNumber(),
        );

        return response()->json([
            'data' => $documentRequest,
        ]);
    }

    public function getDocumentRequestIdentityReview(DocumentRequest $documentRequest): array
    {
        $documentRequest->loadMissing('resident');

        return $this->documentRequestIdentityReview($documentRequest);
    }

    public function saveConstructionInspection(Request $request, DocumentRequest $documentRequest)
    {
        abort_unless(in_array($documentRequest->document_type, ['Construction Permit', 'Fencing Permit'], true), 404);
        abort_unless($documentRequest->status === 'processing', 409, 'Permit inspection can only be recorded while the request is processing.');

        $details = $documentRequest->details ?? [];
        $existingReport = $details['inspection_report'] ?? [];
        $feeWasAssessed = !empty($details['fee_assessed']);
        $fileRules = ['file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'];
        if (empty($existingReport['file_path'])) {
            array_unshift($fileRules, 'required');
        } else {
            array_unshift($fileRules, 'sometimes');
        }
        $validated = $request->validate([
            'inspection_report' => $fileRules,
            'councilor_go_ahead' => ['required', 'boolean'],
            'staff_note' => ['nullable', 'string', 'max:2000'],
            'assessed_fee' => ['required', 'numeric', 'min:0', 'max:1000000000'],
        ]);

        $previousFee = (float) $documentRequest->fee;
        $documentRequest->fee = (float) $validated['assessed_fee'];
        $details['fee_assessed'] = true;
        $newFilePath = null;
        if ($request->hasFile('inspection_report')) {
            $newFilePath = $request->file('inspection_report')->store(
                "document-requests/{$documentRequest->id}/permit-inspection",
                'local',
            );
        }
        $report = array_merge($existingReport, [
            'decision' => $validated['councilor_go_ahead'] ? 'go_ahead' : 'needs_correction',
            'assessed_fee' => (float) $validated['assessed_fee'],
            'staff_note' => $validated['staff_note'] ?? null,
            'recorded_by' => $request->user()->name,
            'recorded_at' => now()->toIso8601String(),
        ]);
        if ($newFilePath) {
            $report['file_path'] = $newFilePath;
            $report['original_name'] = $request->file('inspection_report')->getClientOriginalName();
            $report['mime_type'] = $request->file('inspection_report')->getMimeType();
        }
        $details['inspection_report'] = $report;
        $documentRequest->details = $details;
        $documentRequest->save();
        if ($newFilePath && !empty($existingReport['file_path'])) {
            Storage::disk('local')->delete($existingReport['file_path']);
        }

        DocumentRequestEvent::record(
            $documentRequest,
            $request->user(),
            'permit_inspection_recorded',
            $documentRequest->status,
            $documentRequest->status,
            $report,
        );
        if (!$feeWasAssessed || $previousFee !== (float) $validated['assessed_fee']) {
            DocumentRequestEvent::record(
                $documentRequest,
                $request->user(),
                'fee_assessed',
                $documentRequest->status,
                $documentRequest->status,
                ['previous_fee' => $previousFee, 'fee' => (float) $documentRequest->fee],
            );
        }

        return response()->json([
            'message' => 'Permit inspection report saved.',
            'data' => $documentRequest->fresh()->load(['resident', 'type', 'assignedStaff']),
        ]);
    }

    public function viewConstructionInspection(DocumentRequest $documentRequest)
    {
        abort_unless(in_array($documentRequest->document_type, ['Construction Permit', 'Fencing Permit'], true), 404);
        $report = $documentRequest->details['inspection_report'] ?? [];
        abort_unless(!empty($report['file_path']), 404);

        $disk = Storage::disk('local');
        abort_unless($disk->exists($report['file_path']), 404);
        $filename = $report['original_name'] ?? 'permit-inspection-report';
        $headers = [
            'Cache-Control' => 'private, no-store',
            'Content-Disposition' => (new ResponseHeaderBag)->makeDisposition(
                ResponseHeaderBag::DISPOSITION_INLINE,
                $filename,
                preg_replace('/[^A-Za-z0-9_.-]/', '_', $filename),
            ),
            'Content-Type' => $report['mime_type'] ?? (mime_content_type($disk->path($report['file_path'])) ?: 'application/octet-stream'),
        ];

        return response()->stream(function () use ($disk, $report): void {
            $stream = $disk->readStream($report['file_path']);
            if (is_resource($stream)) {
                fpassthru($stream);
                fclose($stream);
            }
        }, 200, $headers);
    }

    public function generateDocumentPreview(Request $request, DocumentRequest $documentRequest)
    {
        if (!in_array($documentRequest->status, ['processing', 'ready_for_release'], true)) {
            return response()->json([
                'message' => 'A document preview can only be generated while the request is processing or ready for release.',
            ], 409);
        }
        if (in_array($documentRequest->document_type, ['Construction Permit', 'Fencing Permit'], true)
            && (($documentRequest->details['inspection_report']['decision'] ?? null) !== 'go_ahead'
                || empty($documentRequest->details['inspection_report']['file_path']))) {
            return response()->json([
                'message' => 'Upload the completed inspection report and record the councilor go-ahead before generating this permit.',
            ], 409);
        }

        $rules = [
            'document_content' => ['sometimes', 'required', 'array'],
            'staff_remarks' => ['nullable', 'string', 'max:2000'],
        ];
        $isBarangayClearance = $documentRequest->document_type === 'Barangay Certification';
        $isGoodMoralCertificate = $documentRequest->document_type === 'Certificate of Good Moral Character';
        $requiresCaseReview = $isBarangayClearance || $isGoodMoralCertificate;
        $hasUnresolvedComplaint = $requiresCaseReview && Complaint::query()
            ->where('resident_id', $documentRequest->resident_id)
            ->whereIn('status', ['pending', 'in_progress'])
            ->exists();
        $hasOpenBlotterCase = $requiresCaseReview && $this->hasOpenBlotterCase($documentRequest);
        $hasInvolvedPersonMatch = $requiresCaseReview && $this->clearanceNameMatchesInvolvedPersons($documentRequest);
        if ($isBarangayClearance) {
            $rules['document_content.derogatory_status'] = [
                'sometimes',
                'string',
                'in:required_review,pending_verification,no_derogatory_record,refer_authorized_review',
            ];
        }
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
        if ($isBarangayClearance) {
            $recordCheckStatus = $preview['derogatory_status']
                ?? ($hasUnresolvedComplaint || $hasOpenBlotterCase
                    ? 'pending_verification'
                    : ($hasInvolvedPersonMatch ? 'required_review' : 'no_derogatory_record'));

            if ($hasInvolvedPersonMatch && empty($preview['derogatory_reviewed'])
                && !$hasUnresolvedComplaint && !$hasOpenBlotterCase) {
                $recordCheckStatus = 'required_review';
            }
            if (!$hasInvolvedPersonMatch && !$hasUnresolvedComplaint && !$hasOpenBlotterCase
                && empty($preview['derogatory_reviewed'])) {
                $recordCheckStatus = 'no_derogatory_record';
            }

            if ($hasUnresolvedComplaint && $recordCheckStatus !== 'pending_verification') {
                return response()->json([
                    'message' => 'A pending or in-progress complaint requires PENDING VERIFICATION. A complaint alone is not a finding of wrongdoing.',
                ], 409);
            }
            if ($hasOpenBlotterCase && $recordCheckStatus !== 'pending_verification') {
                return response()->json([
                    'message' => 'An open or referred blotter case requires PENDING VERIFICATION and blocks clearance approval and printing.',
                ], 409);
            }

            $preview['derogatory_status'] = $recordCheckStatus;
        }
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
            $isBarangayClearance ? [
                'record_check_outcome' => $documentRequest->document_content['derogatory_status'] ?? 'pending_verification',
            ] : [],
        );

        return response()->json([
            'message' => 'Document preview generated successfully.',
            'data' => tap($documentRequest->fresh()->load(['resident', 'type', 'assignedStaff']), function (DocumentRequest $freshRequest) {
                $freshRequest->setAttribute('identity_review', $this->documentRequestIdentityReview($freshRequest));
                $freshRequest->setAttribute('clearance_number', $freshRequest->clearanceSequenceNumber());
            }),
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

        if ($status === 'processing' && $documentRequest->document_type === 'Barangay Certification'
            && Complaint::query()
                ->where('resident_id', $documentRequest->resident_id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->exists()) {
            return response()->json([
                'message' => 'This Barangay Clearance cannot be approved for processing while the resident has a pending or in-progress complaint.',
            ], 409);
        }
        if ($status === 'processing' && $documentRequest->document_type === 'Barangay Certification'
            && $this->hasOpenBlotterCase($documentRequest)) {
            return response()->json([
                'message' => 'This Barangay Clearance cannot be approved for processing while the resident has an open or referred blotter case.',
            ], 409);
        }
        if ($status === 'processing'
            && $documentRequest->document_type === 'Certificate of Good Moral Character') {
            $identityReview = $this->documentRequestIdentityReview($documentRequest);
            if ($identityReview['has_blocking_case'] || $identityReview['has_involved_person_match']) {
                return response()->json([
                    'message' => 'This Certificate of Good Moral Character cannot be processed while the resident has an unresolved complaint, an open or referred blotter case, or a match in an unresolved complaint’s involved-person list.',
                ], 409);
            }
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
        if ($status === 'ready_for_release'
            && in_array($documentRequest->document_type, ['Construction Permit', 'Fencing Permit'], true)
            && (($documentRequest->details['inspection_report']['decision'] ?? null) !== 'go_ahead'
                || empty($documentRequest->details['inspection_report']['file_path']))) {
            return response()->json([
                'message' => 'This permit cannot be released until the completed inspection report is uploaded and the councilor go-ahead is recorded.',
            ], 409);
        }
        if (in_array($status, ['ready_for_release', 'completed'], true)
            && $documentRequest->document_type === 'Barangay Certification') {
            if (($documentRequest->document_content['derogatory_status'] ?? null) !== 'no_derogatory_record') {
                return response()->json([
                'message' => 'This Barangay Clearance is not eligible for release until the record check is completed and NO DEROGATORY RECORDS is confirmed.',
                ], 409);
            }

            $hasUnresolvedComplaint = Complaint::query()
                ->where('resident_id', $documentRequest->resident_id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->exists();
            if ($hasUnresolvedComplaint) {
                return response()->json([
                    'message' => 'A pending or in-progress complaint requires PENDING VERIFICATION. A complaint alone is not a finding of wrongdoing.',
                ], 409);
            }
            if ($this->hasOpenBlotterCase($documentRequest)) {
                return response()->json([
                    'message' => 'An open or referred blotter case blocks Barangay Clearance release.',
                ], 409);
            }
            if ($this->clearanceNameMatchesInvolvedPersons($documentRequest)
                && empty($documentRequest->document_content['derogatory_reviewed'])) {
                return response()->json([
                    'message' => 'A close name match in complaint involved-person records requires staff review before clearance release.',
                ], 409);
            }
        }
        if (in_array($status, ['ready_for_release', 'completed'], true)
            && $documentRequest->document_type === 'Certificate of Good Moral Character') {
            $identityReview = $this->documentRequestIdentityReview($documentRequest);
            if ($identityReview['has_blocking_case'] || $identityReview['has_involved_person_match']) {
                return response()->json([
                    'message' => 'This Certificate of Good Moral Character cannot be released while the resident has an unresolved complaint, an open or referred blotter case, or a match in an unresolved complaint’s involved-person list.',
                ], 409);
            }
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
        if ($status === 'ready_for_release'
            && ($documentRequest->details['fee_mode'] ?? null) === 'assessed') {
            $documentLabel = $documentRequest->document_type_label;
            $assessedFee = number_format((float) $documentRequest->fee, 2);
            if ($documentRequest->document_type === 'Cedula') {
                $formFields = $documentRequest->document_content
                    ?? $documentRequest->details['form_fields']
                    ?? [];
                $annualGrossSalary = max(0, (float) ($formFields['taxable_amount'] ?? 0));
                $additionalTax = floor($annualGrossSalary / 1000);
                $totalCommunityTax = 5 + $additionalTax;
                $totalPayable = number_format($totalCommunityTax, 2);
                $messages['ready_for_release'] = [
                    "{$documentLabel} ready for release",
                    "Your {$documentLabel} is ready to claim. The total amount payable is ₱{$totalPayable} (₱5.00 basic community tax plus ₱".number_format($additionalTax, 2)." additional tax), payable at the barangay office upon release.",
                ];
            } else {
                $messages['ready_for_release'] = [
                    "{$documentLabel} ready for release",
                    "Your {$documentLabel} is ready to claim. The assessed fee is ₱{$assessedFee}, payable at the barangay office upon release.",
                ];
            }
        }
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
        if (isset($details['inspection_report']) && is_array($details['inspection_report'])) {
            $details['inspection_report']['assessed_fee'] = (float) $validated['fee'];
        }
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
        return response()->json([
            'message' => 'Assessed fee saved. The resident will be notified when the document is ready for release.',
            'data' => $documentRequest->fresh()->load(['resident', 'type', 'assignedStaff'])->setAttribute(
                'identity_review',
                $this->documentRequestIdentityReview($documentRequest),
            ),
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
            $complaint->status_updated_at = now();
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
                'has_blocking_case' => false,
                'has_involved_person_match' => false,
                'involved_person_reviewed' => false,
                'fields' => [],
                'message' => 'The resident profile could not be found.',
            ];
        }

        $requiresCaseReview = in_array($documentRequest->document_type, [
            'Barangay Certification',
            'Certificate of Good Moral Character',
        ], true);
        $hasUnresolvedComplaint = $requiresCaseReview
            && Complaint::query()
                ->where('resident_id', $documentRequest->resident_id)
                ->whereIn('status', ['pending', 'in_progress'])
                ->exists();
        $hasOpenBlotterCase = $requiresCaseReview
            && $this->hasOpenBlotterCase($documentRequest);
        $involvedPersonMatches = $requiresCaseReview
            ? $this->clearanceInvolvedPersonMatches($documentRequest)
            : [];
        $hasInvolvedPersonMatch = !empty($involvedPersonMatches);
        $hasUnresolvedCase = $hasUnresolvedComplaint || $hasOpenBlotterCase;

        $submitted = $documentRequest->details['form_fields'] ?? [];
        $registryQuery = BarangayRegistry::query()
            ->whereRaw('LOWER(TRIM(first_name)) = ?', [mb_strtolower(trim((string) $resident->first_name))])
            ->whereRaw('LOWER(TRIM(last_name)) = ?', [mb_strtolower(trim((string) $resident->last_name))]);
        $completeMatches = (clone $registryQuery)
            ->whereDate('date_of_birth', $resident->date_of_birth)
            ->whereRaw('LOWER(TRIM(sex)) = ?', [mb_strtolower(trim((string) $resident->sex))])
            ->whereRaw('LOWER(TRIM(purok)) = ?', [mb_strtolower(trim((string) $resident->purok))])
            ->limit(2)
            ->get();
        $registry = $completeMatches->count() === 1 ? $completeMatches->first() : null;
        if (!$registry) {
            $dateMatches = (clone $registryQuery)
                ->whereDate('date_of_birth', $resident->date_of_birth)
                ->limit(2)
                ->get();
            if ($dateMatches->count() === 1) {
                $registry = $dateMatches->first();
            }
        }
        $submittedDateOfBirth = blank($submitted['date_of_birth'] ?? null) ? $resident->date_of_birth : $submitted['date_of_birth'];
        if (!$registry && !blank($submitted['full_name'] ?? null) && !blank($submittedDateOfBirth)) {
            $submittedName = trim((string) $submitted['full_name']);
            $submittedNameMatches = BarangayRegistry::query()
                ->whereDate('date_of_birth', $submittedDateOfBirth)
                ->get()
                ->filter(fn (BarangayRegistry $candidate) => $this->requestNameMatchesRegistry(
                    $submittedName,
                    $candidate,
                ))
                ->take(2)
                ->values();
            if ($submittedNameMatches->count() === 1) {
                $registry = $submittedNameMatches->first();
            }
        }
        if (!$registry) {
            $identityMatches = BarangayRegistry::query()
                ->whereDate('date_of_birth', $resident->date_of_birth)
                ->whereRaw('LOWER(TRIM(sex)) = ?', [mb_strtolower(trim((string) $resident->sex))])
                ->whereRaw('LOWER(TRIM(purok)) = ?', [mb_strtolower(trim((string) $resident->purok))])
                ->limit(2)
                ->get();
            if ($identityMatches->count() === 1) {
                $registry = $identityMatches->first();
            }
        }
        if (!$registry) {
            $nameMatches = (clone $registryQuery)->limit(2)->get();
            if ($nameMatches->count() === 1) {
                $registry = $nameMatches->first();
            }
        }

        $profileFullName = collect([
            $resident->first_name,
            $resident->middle_name,
            $resident->last_name,
            $resident->suffix,
        ])->filter()->implode(' ');

        if (!$registry) {
            $submittedFullName = collect([
                $submitted['first_name'] ?? null,
                $submitted['middle_name'] ?? null,
                $submitted['last_name'] ?? null,
                $submitted['suffix'] ?? null,
            ])->filter()->implode(' ') ?: ($submitted['full_name'] ?? $profileFullName);

            $fields = [
                ['key' => 'full_name', 'label' => 'Full name', 'profile' => $profileFullName, 'registry' => 'No unique match', 'submitted' => $submittedFullName, 'ok' => false],
                ['key' => 'date_of_birth', 'label' => 'Date of birth', 'profile' => $resident->date_of_birth, 'registry' => 'No unique match', 'submitted' => $submitted['date_of_birth'] ?? $submittedDateOfBirth, 'ok' => false],
                ['key' => 'sex', 'label' => 'Sex', 'profile' => $resident->sex, 'registry' => 'No unique match', 'submitted' => $submitted['sex'] ?? null, 'ok' => false],
                ['key' => 'purok', 'label' => 'Purok', 'profile' => $resident->purok, 'registry' => 'No unique match', 'submitted' => $submitted['purok'] ?? null, 'ok' => false],
            ];

            if (!blank($resident->address) || !blank($submitted['address'] ?? null)) {
                $fields[] = [
                    'key' => 'address',
                    'label' => 'Address',
                    'profile' => $resident->address,
                    'registry' => 'No unique match',
                    'submitted' => $submitted['address'] ?? null,
                    'ok' => false,
                ];
            }

            return [
                'ok' => false,
                'registry_found' => false,
                'has_blocking_case' => $hasUnresolvedCase,
                'has_involved_person_match' => $hasInvolvedPersonMatch,
                'involved_person_reviewed' => !empty($documentRequest->document_content['derogatory_reviewed']),
                'involved_person_matches' => $involvedPersonMatches,
                'fields' => $fields,
                'message' => 'No unique barangay registry record matches this resident. Ask an administrator to verify the resident records.',
            ];
        }
        $registryFullName = $this->registryFullName($registry);
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
            ? $this->submittedNameMatchesRegistry($submitted, $submittedValue, $registry)
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
            'has_blocking_case' => $hasUnresolvedCase,
            'has_involved_person_match' => $hasInvolvedPersonMatch,
            'involved_person_reviewed' => !empty($documentRequest->document_content['derogatory_reviewed']),
            'involved_person_matches' => $involvedPersonMatches,
            'fields' => $fields,
            'message' => null,
        ];
    }

    private function hasOpenBlotterCase(DocumentRequest $documentRequest): bool
    {
        if (!Schema::hasTable('blotter_entries')) {
            return false;
        }

        $residentName = trim((string) ($documentRequest->resident?->name ?? ''));

        return BlotterEntry::query()
            ->whereIn('status', ['open', 'referred'])
            ->where(function ($query) use ($documentRequest, $residentName) {
                $query->where('resident_id', $documentRequest->resident_id);
                if ($residentName !== '') {
                    $query->orWhere(function ($nameQuery) use ($residentName) {
                        $nameQuery->whereNull('resident_id')
                            ->whereRaw('LOWER(TRIM(resident_name)) = ?', [mb_strtolower($residentName)]);
                    });
                }
            })
            ->exists();
    }

    private function clearanceNameMatchesInvolvedPersons(DocumentRequest $documentRequest): bool
    {
        return !empty($this->clearanceInvolvedPersonMatches($documentRequest));
    }

    private function clearanceInvolvedPersonMatches(DocumentRequest $documentRequest): array
    {
        if (!Schema::hasTable('complaints') || !$documentRequest->resident) {
            return [];
        }

        $formFields = $documentRequest->details['form_fields'] ?? [];
        $names = [
            collect([
                $formFields['first_name'] ?? $documentRequest->resident->first_name,
                $formFields['middle_name'] ?? $documentRequest->resident->middle_name,
                $formFields['last_name'] ?? $documentRequest->resident->last_name,
                $formFields['suffix'] ?? $documentRequest->resident->suffix,
            ])->filter()->implode(' '),
            $formFields['full_name'] ?? null,
            $documentRequest->resident->name ?? null,
        ];
        $normalizedNames = collect($names)
            ->map(fn ($name) => $this->normalizePersonName((string) $name))
            ->filter(fn ($name) => mb_strlen($name) >= 5)
            ->unique()
            ->values();

        if ($normalizedNames->isEmpty()) {
            return [];
        }

        $matches = [];
        Complaint::query()
            ->whereNotNull('involved_persons')
            ->where('involved_persons', '<>', '')
            ->whereNotIn('status', ['closed', 'resolved'])
            ->get(['id', 'subject', 'status', 'incident_date', 'involved_persons'])
            ->each(function (Complaint $complaint) use ($normalizedNames, &$matches) {
                $entries = preg_split('/[,;|\r\n]+|\s+and\s+/i', (string) $complaint->involved_persons) ?: [];
                foreach ($entries as $entry) {
                    $listedName = trim($entry);
                    $normalizedEntry = $this->normalizePersonName($listedName);
                    if ($normalizedEntry === '') {
                        continue;
                    }
                    foreach ($normalizedNames as $name) {
                        similar_text($normalizedEntry, $name, $similarity);
                        $exact = $normalizedEntry === $name;
                        $minLength = min(mb_strlen($normalizedEntry), mb_strlen($name));
                        if ($exact || ($minLength >= 8 && $similarity >= 86)) {
                            $matches[] = [
                                'complaint_id' => $complaint->id,
                                'subject' => $complaint->subject,
                                'status' => $complaint->status,
                                'incident_date' => $complaint->incident_date?->toDateString(),
                                'matched_name' => $listedName,
                                'match_type' => $exact ? 'Exact match' : 'Close match',
                                'similarity' => round($similarity),
                            ];
                            break;
                        }
                    }
                }
            });

        return collect($matches)
            ->unique(fn (array $match) => $match['complaint_id'].'|'.$this->normalizePersonName($match['matched_name']))
            ->take(5)
            ->values()
            ->all();
    }

    private function normalizePersonName(string $name): string
    {
        $name = mb_strtolower($name);
        $name = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $name) ?? $name;

        return trim(preg_replace('/\s+/', ' ', $name) ?? $name);
    }

    private function sameIdentityValue(mixed $left, mixed $right, string $key): bool
    {
        if ($key === 'date_of_birth') {
            return substr((string) $left, 0, 10) === substr((string) $right, 0, 10);
        }

        $normalize = fn ($value) => mb_strtolower(preg_replace('/\s+/', ' ', trim((string) $value)));

        return $normalize($left) === $normalize($right);
    }

    private function registryFullName(BarangayRegistry $registry): string
    {
        return collect([
            $registry->first_name,
            $registry->middle_name,
            $registry->last_name,
            $registry->suffix,
        ])->filter()->implode(' ');
    }

    private function submittedNameMatchesRegistry(
        array $submitted,
        string $submittedFullName,
        BarangayRegistry $registry,
    ): bool {
        $nameFields = [
            'first_name' => 'first_name',
            'middle_name' => 'middle_name',
            'last_name' => 'last_name',
            'suffix' => 'suffix',
        ];
        $hasNameParts = collect(array_keys($nameFields))
            ->contains(fn (string $field) => !blank($submitted[$field] ?? null));

        if ($hasNameParts) {
            foreach ($nameFields as $submittedField => $registryField) {
                if (!blank($submitted[$submittedField] ?? null)
                    && !$this->sameIdentityValue($submitted[$submittedField], $registry->{$registryField}, $submittedField)) {
                    return false;
                }
            }

            return !blank($submitted['first_name'] ?? null)
                && !blank($submitted['last_name'] ?? null);
        }

        $nameWithoutMiddle = collect([
            $registry->first_name,
            $registry->last_name,
            $registry->suffix,
        ])->filter()->implode(' ');

        return $this->sameIdentityValue($submittedFullName, $this->registryFullName($registry), 'full_name')
            || $this->sameIdentityValue($submittedFullName, $nameWithoutMiddle, 'full_name');
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
