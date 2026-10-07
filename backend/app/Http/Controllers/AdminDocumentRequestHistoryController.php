<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
use App\Models\DocumentRequestEvent;
use App\Models\Staff;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AdminDocumentRequestHistoryController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:all,pending,under_review,processing,for_correction,ready_for_release,completed,rejected,delayed'],
            'search' => ['sometimes', 'string', 'max:150'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = DocumentRequest::query()->with(['resident', 'type', 'assignedStaff']);

        if (($validated['status'] ?? null) === 'delayed') {
            $query->whereIn('status', ['pending', 'under_review', 'processing'])
                ->where('status_changed_at', '<=', Carbon::now()->subDays(3));
        } elseif (!empty($validated['status']) && $validated['status'] !== 'all') {
            $query->where('status', $validated['status']);
        }

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);
            $query->where(function ($requestQuery) use ($search) {
                $requestQuery->where('id', 'like', "%{$search}%")
                    ->orWhere('document_type', 'like', "%{$search}%")
                    ->orWhereHas('resident', function ($residentQuery) use ($search) {
                        $residentQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $results = $query->latest()->paginate($validated['per_page'] ?? 25);
        $results->getCollection()->each(function (DocumentRequest $documentRequest) {
            $documentRequest->setAttribute(
                'is_delayed',
                in_array($documentRequest->status, ['pending', 'under_review', 'processing'], true)
                    && $documentRequest->status_changed_at?->lte(Carbon::now()->subDays(3)),
            );
        });

        return $results;
    }

    public function show(DocumentRequest $documentRequest)
    {
        return response()->json([
            'data' => $documentRequest->load(['resident', 'type', 'assignedStaff', 'events']),
        ]);
    }

    public function overview()
    {
        $statusCounts = DocumentRequest::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');
        $activeStatuses = ['pending', 'under_review', 'processing', 'for_correction', 'ready_for_release'];
        $delayedCutoff = Carbon::now()->subDays(3);
        $workloadStatuses = ['under_review', 'processing', 'for_correction', 'ready_for_release'];

        $workload = Staff::query()
            ->where('designation', Staff::DOCUMENT_REQUEST_OFFICER)
            ->orderBy('name')
            ->get()
            ->map(fn (Staff $staff) => [
                'id' => $staff->id,
                'name' => $staff->name,
                'active_requests' => DocumentRequest::where('assigned_staff_id', $staff->id)
                    ->whereIn('status', $workloadStatuses)
                    ->count(),
            ]);

        return response()->json([
            'data' => [
                'total' => DocumentRequest::count(),
                'pending' => (int) ($statusCounts['pending'] ?? 0),
                'under_review' => (int) ($statusCounts['under_review'] ?? 0),
                'processing' => (int) ($statusCounts['processing'] ?? 0),
                'for_correction' => (int) ($statusCounts['for_correction'] ?? 0),
                'ready_for_release' => (int) ($statusCounts['ready_for_release'] ?? 0),
                'rejected' => (int) ($statusCounts['rejected'] ?? 0),
                'released' => DocumentRequest::whereNotNull('released_at')->count(),
                'delayed' => DocumentRequest::whereIn('status', ['pending', 'under_review', 'processing'])
                    ->where('status_changed_at', '<=', $delayedCutoff)
                    ->count(),
                'active' => DocumentRequest::whereIn('status', $activeStatuses)->count(),
                'staff_workload' => $workload,
            ],
        ]);
    }

    public function events(Request $request)
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return DocumentRequestEvent::query()
            ->with(['documentRequest.resident', 'documentRequest.type'])
            ->latest()
            ->paginate($validated['per_page'] ?? 30);
    }
}
