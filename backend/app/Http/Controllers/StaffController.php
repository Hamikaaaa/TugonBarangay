<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\DocumentRequest;
use App\Models\ResidentNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;

class StaffController extends Controller
{
    public function documentRequests(Request $request)
    {
        $query = DocumentRequest::query()->with('resident');

        if ($request->has('status')) {
            $status = $request->status;
            $query->where('status', $status);
        } else {
            $query->whereNotIn('status', ['completed', 'rejected']);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhere('document_type', 'like', "%{$search}%")
                    ->orWhereHas('resident', function ($residentQuery) use ($search) {
                        $residentQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        return $query->latest()->paginate(min(max($request->integer('per_page', 10), 1), 100));
    }

    public function showDocumentRequest(DocumentRequest $documentRequest)
    {
        return response()->json([
            'data' => $documentRequest->load('resident'),
        ]);
    }

    public function generateDocumentPreview(Request $request, DocumentRequest $documentRequest)
    {
        if ($documentRequest->status !== 'processing') {
            return response()->json([
                'message' => 'A document preview can only be generated while the request is processing.',
            ], 409);
        }

        $validated = $request->validate([
            'document_content' => ['sometimes', 'required', 'array'],
            'staff_remarks' => ['nullable', 'string', 'max:2000'],
        ]);
        $preview = $validated['document_content'] ?? $this->buildDocumentPayload($documentRequest);

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

        return response()->json([
            'message' => 'Document preview generated successfully.',
            'data' => $documentRequest->fresh()->load('resident'),
        ]);
    }

    public function updateDocumentRequestStatus(Request $request, DocumentRequest $documentRequest)
    {
        $status = $request->input('status');
        $allowed = [
            'pending',
            'processing',
            'for_correction',
            'ready_for_release',
            'completed',
            'rejected',
        ];

        if (!in_array($status, $allowed, true)) {
            return response()->json(['message' => 'Invalid document status.'], 422);
        }

        $validTransitions = [
            'pending' => ['processing', 'for_correction', 'rejected'],
            'processing' => ['ready_for_release', 'for_correction'],
            'ready_for_release' => ['completed'],
            'completed' => [],
            'rejected' => [],
        ];

        if (!in_array($status, $validTransitions[$documentRequest->status] ?? [], true)) {
            return response()->json([
                'message' => 'This status transition is not allowed.',
            ], 409);
        }

        if ($status === 'for_correction' && blank($request->input('staff_remarks'))) {
            return response()->json([
                'message' => 'Staff remarks explaining the required correction are required.',
            ], 422);
        }

        if ($status === 'rejected' && blank($request->input('staff_remarks'))) {
            return response()->json([
                'message' => 'Staff remarks explaining the rejection are required.',
            ], 422);
        }

        if ($status === 'rejected' && blank($request->input('rejection_reason'))) {
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

        $update = [
            'status' => $status,
        ];

        if ($request->has('staff_remarks')) {
            $update['staff_remarks'] = $request->input('staff_remarks');
        }

        if ($status === 'rejected') {
            $update['rejection_reason'] = $request->input('rejection_reason');
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

        $messages = [
            'processing' => ['Document request approved', 'Your requirements were verified and your document request is now being processed.'],
            'for_correction' => ['Correction needed for your document request', $request->input('staff_remarks')],
            'ready_for_release' => ['Document ready for release', 'Your document is ready. Please claim it at the barangay office.'],
            'completed' => ['Document request completed', 'Your document request was marked complete after release.'],
            'rejected' => ['Document request rejected', $request->input('rejection_reason')],
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
            'data' => $documentRequest->fresh()->load('resident'),
        ]);
    }

    public function downloadDocumentRequirement(DocumentRequest $documentRequest, string $requirement)
    {
        $requirements = $documentRequest->details['requirements'] ?? [];
        $file = $requirements[$requirement] ?? null;
        abort_unless(is_array($file) && !empty($file['path']), 404);
        abort_unless(Storage::disk('local')->exists($file['path']), 404);

        return Storage::disk('local')->download(
            $file['path'],
            $file['original_name'] ?? basename($file['path']),
        );
    }

    public function complaints(Request $request)
    {
        $query = Complaint::query()->with('user');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
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

        $complaints = $query->latest()->paginate(25);
        $counts = Complaint::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        return response()->json(array_merge($complaints->toArray(), ['counts' => $counts]));
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

        $complaint->status = $validated['status'];
        $complaint->staff_remarks = $validated['staff_remarks'] ?? null;
        $complaint->resolution_details = $validated['resolution_details'] ?? null;
        $complaint->resolved_at = in_array($validated['status'], ['resolved', 'closed'], true)
            ? ($complaint->resolved_at ?? now())
            : null;
        $complaint->save();

        return response()->json([
            'message' => 'Complaint updated successfully.',
            'data' => $complaint->fresh()->load('user'),
        ]);
    }

    public function downloadComplaintEvidence(Complaint $complaint)
    {
        $path = $complaint->evidence_path;
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path);
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
