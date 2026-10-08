<?php


namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\ComplaintCategory;
use App\Models\ComplaintStatus;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    public function index()
    {
        $complaints = Complaint::with(['complainant', 'category', 'assignedStaff'])->latest()->get()->map(function ($complaint) {
            return [
                'id' => $complaint->id,
                'complainant' => $complaint->complainant?->name ?? 'Unknown',
                'category' => $complaint->category?->name ?? 'Uncategorized',
                'status' => $complaint->status?->name ?? 'Pending Review',
                'assignedStaff' => $complaint->assignedStaff?->name ?? 'Unassigned',
                'submittedAt' => $complaint->created_at?->toDateString(),
                'evidence' => $complaint->evidence ?? [],
                'history' => $complaint->history ?? [],
            ];
        });

        return response()->json($complaints);
    }

    public function categories()
    {
        return response()->json(
            ['data' => ComplaintCategory::query()->orderBy('name')->get()->map(function ($category) {
                return [
                    'id' => $category->id,
                    'name' => $category->name,
                    'description' => $category->description,
                    'enabled' => (bool) $category->enabled,
                ];
            })]
        );
    }

    public function enabledCategories()
    {
        return response()->json([
            'data' => ComplaintCategory::query()
                ->where('enabled', true)
                ->orderBy('name')
                ->pluck('name'),
        ]);
    }

    public function statuses()
    {
        return response()->json(
            ComplaintStatus::latest()->get()->map(function ($status) {
                return [
                    'id' => $status->id,
                    'name' => $status->name,
                    'enabled' => (bool) $status->enabled,
                ];
            })
        );
    }

    public function storeCategory(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:complaint_categories,name'],
            'description' => ['nullable', 'string', 'max:1000'],
            'enabled' => ['nullable', 'boolean'],
        ]);

        $category = ComplaintCategory::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'enabled' => $data['enabled'] ?? true,
        ]);

        return response()->json([
            'message' => 'Complaint category created.',
            'data' => $category,
        ], 201);
    }

    public function updateCategory(Request $request, $id)
    {
        $category = ComplaintCategory::findOrFail($id);
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'unique:complaint_categories,name,'.$category->id],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'enabled' => ['sometimes', 'boolean'],
        ]);
        $category->update($validated);

        return response()->json([
            'message' => 'Complaint category updated.',
            'data' => $category,
        ]);
    }

    public function storeStatus(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'enabled' => ['nullable', 'boolean'],
        ]);

        $status = ComplaintStatus::create([
            'name' => $data['name'],
            'enabled' => $data['enabled'] ?? true,
        ]);

        return response()->json([
            'message' => 'Complaint status created.',
            'data' => $status,
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $status = ComplaintStatus::findOrFail($id);
        $status->update($request->only(['name', 'enabled']));

        return response()->json([
            'message' => 'Complaint status updated.',
            'data' => $status,
        ]);
    }
}