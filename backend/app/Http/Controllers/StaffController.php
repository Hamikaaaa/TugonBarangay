<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\DocumentRequest;
use Illuminate\Http\Request;
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

        return $query->latest()->paginate(10);
    }

    public function showDocumentRequest(DocumentRequest $documentRequest)
    {
        return response()->json([
            'data' => $documentRequest->load('resident'),
        ]);
    }

    public function generateDocumentPreview(Request $request, DocumentRequest $documentRequest)
    {
        $preview = $request->input('document_content', $this->buildDocumentPayload($documentRequest));

        if (!is_array($preview)) {
            return response()->json([
                'message' => 'Document content must be a valid object.',
            ], 422);
        }

        if (Schema::hasColumn('document_requests', 'document_content')) {
            $documentRequest->document_content = $preview;
        }

        if (Schema::hasColumn('document_requests', 'staff_remarks') && $request->has('staff_remarks')) {
            $documentRequest->staff_remarks = $request->input('staff_remarks');
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
            'for_correction' => ['pending'],
            'completed' => [],
            'rejected' => [],
        ];

        if (!in_array($status, $validTransitions[$documentRequest->status] ?? [], true)) {
            return response()->json([
                'message' => 'This status transition is not allowed.',
            ], 409);
        }

        if ($status === 'rejected' && blank($request->input('rejection_reason'))) {
            return response()->json([
                'message' => 'A rejection reason is required.',
            ], 422);
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

        if ($status === 'completed' && Schema::hasColumn('document_requests', 'document_generated_at')) {
            $update['document_generated_at'] = now();
        }

        if (($status === 'processing' || $status === 'for_correction') && Schema::hasColumn('document_requests', 'document_content')) {
            $update['document_content'] = $request->input('document_content', $this->buildDocumentPayload($documentRequest));
        }

        $documentRequest->fill($update);
        $documentRequest->save();

        return response()->json([
            'message' => 'Document request updated successfully.',
            'data' => $documentRequest->fresh()->load('resident'),
        ]);
    }

    public function complaints(Request $request)
    {
        return Complaint::query()->with('user')->latest()->paginate(10);
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
        return [
            'title' => $documentRequest->document_type,
            'resident_name' => $documentRequest->resident?->name ?? 'Resident',
            'issued_at' => now()->toIso8601String(),
            'status' => $documentRequest->status,
            'notes' => $documentRequest->staff_remarks ?? 'No remarks',
        ];
    }
}
