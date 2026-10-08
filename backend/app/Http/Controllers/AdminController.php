<?php

namespace App\Http\Controllers;

use App\Models\Resident;
use App\Models\Feedback;
use App\Models\ChatbotEscalation;
use App\Models\Complaint;
use App\Models\DocumentRequest;
use App\Models\BarangayRegistry;
use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminController extends Controller
{
    public function staffAccounts()
    {
        return Staff::query()
            ->orderBy('designation')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'designation', 'is_active', 'created_at']);
    }

    public function createStaffAccount(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('staff', 'email'),
                Rule::unique('residents', 'email'),
                Rule::unique('admins', 'email'),
            ],
            'designation' => [
                'required',
                Rule::in([
                    Staff::DOCUMENT_REQUEST_OFFICER,
                    Staff::COMPLAINT_MANAGEMENT_OFFICER,
                ]),
            ],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->mixedCase()->numbers()->symbols(),
            ],
        ]);

        $staff = Staff::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'designation' => $validated['designation'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Staff account created and enabled.',
            'staff' => $staff->only(['id', 'name', 'email', 'designation', 'is_active', 'created_at']),
        ], 201);
    }

    public function updateStaffAccountStatus(Request $request, Staff $staff)
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $staff->update(['is_active' => $validated['is_active']]);
        if (!$staff->is_active) {
            $staff->tokens()->delete();
        }

        return response()->json([
            'message' => $staff->is_active
                ? 'Staff account enabled.'
                : 'Staff account disabled and active sessions revoked.',
            'staff' => $staff->only(['id', 'name', 'email', 'designation', 'is_active']),
        ]);
    }

    public function barangayRegistry(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $query = BarangayRegistry::query();
        if (!empty($validated['search'])) {
            $search = trim($validated['search']);
            $query->where(function ($registryQuery) use ($search) {
                $registryQuery
                    ->where('first_name', 'like', "%{$search}%")
                    ->orWhere('middle_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('suffix', 'like', "%{$search}%")
                    ->orWhere('purok', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%")
                    ->orWhere('mobile_number', 'like', "%{$search}%");
            });
        }

        return $query
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($validated['per_page'] ?? 25);
    }

    public function residentRegistryStats()
    {
        $pendingResidents = Resident::query()->where('verification_status', 'pending');
        $pendingCount = (clone $pendingResidents)->count();
        $matchedPendingCount = (clone $pendingResidents)
            ->whereExists(function ($query) {
                $query->selectRaw('1')
                    ->from('barangay_registry')
                    ->whereColumn('barangay_registry.first_name', 'residents.first_name')
                    ->whereColumn('barangay_registry.last_name', 'residents.last_name')
                    ->whereDate(
                        'barangay_registry.date_of_birth',
                        '=',
                        DB::raw('residents.date_of_birth'),
                    )
                    ->whereColumn('barangay_registry.sex', 'residents.sex')
                    ->whereColumn('barangay_registry.purok', 'residents.purok');
            })
            ->count();

        return response()->json([
            'registry_total' => BarangayRegistry::query()->count(),
            'pending_total' => $pendingCount,
            'pending_matched' => $matchedPendingCount,
            'pending_unmatched' => $pendingCount - $matchedPendingCount,
            'verified_total' => Resident::query()->where('verification_status', 'verified')->count(),
            'rejected_total' => Resident::query()->where('verification_status', 'rejected')->count(),
        ]);
    }

    public function notifications()
    {
        $pendingResidents = Resident::query()
            ->where('verification_status', 'pending');
        $pendingDocuments = DocumentRequest::query()
            ->whereIn('status', ['pending', 'under_review']);
        $openComplaints = Complaint::query()
            ->whereIn('status', ['pending', 'in_progress']);
        $pendingEscalations = ChatbotEscalation::query()
            ->where('status', 'pending');

        $items = array_values(array_filter([
            $this->notificationSummary(
                'resident_verification',
                'Resident verifications',
                $pendingResidents->count(),
                $pendingResidents->latest()->value('created_at'),
                '/admin/residents/verification',
            ),
            $this->notificationSummary(
                'document_requests',
                'Document requests',
                $pendingDocuments->count(),
                $pendingDocuments->latest()->value('created_at'),
                '/admin/document-requests',
            ),
            $this->notificationSummary(
                'complaints',
                'Open complaints',
                $openComplaints->count(),
                $openComplaints->latest()->value('created_at'),
                '/admin/complaints',
            ),
            $this->notificationSummary(
                'bantaybot_escalations',
                'Unanswered BantayBot questions',
                $pendingEscalations->count(),
                $pendingEscalations->latest()->value('created_at'),
                '/admin/chatbot/escalations',
            ),
        ]));

        usort($items, static fn (array $a, array $b) =>
            strcmp($b['created_at'] ?? '', $a['created_at'] ?? ''),
        );

        return response()->json([
            'total' => array_sum(array_column($items, 'count')),
            'items' => $items,
        ]);
    }

    private function notificationSummary(
        string $type,
        string $title,
        int $count,
        ?string $createdAt,
        string $path,
    ): ?array {
        if ($count === 0) {
            return null;
        }

        return [
            'type' => $type,
            'title' => $title,
            'message' => "{$count} " . ($count === 1 ? 'item' : 'items') . ' need attention.',
            'count' => $count,
            'created_at' => $createdAt,
            'path' => $path,
        ];
    }

    public function reports(Request $request)
    {
        $validated = $request->validate([
            'months' => ['sometimes', 'integer', 'in:6,12,24'],
        ]);
        $months = (int) ($validated['months'] ?? 12);
        $end = now();
        $start = $end->copy()->startOfMonth()->subMonths($months - 1);
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $monthly = [];
        for ($date = $start->copy(); $date <= $end; $date->addMonth()) {
            $key = $date->format('Y-m');
            $monthly[$key] = [
                'month' => $key,
                'label' => $date->format('M Y'),
                'document_requests' => 0,
                'complaints' => 0,
                'chatbot_escalations' => 0,
                'new_residents' => 0,
                'feedback' => 0,
                'feedback_rating_sum' => 0,
                'feedback_average_rating' => null,
            ];
        }

        $loadPeriodRecords = static fn (string $model, array $columns) => $model::query()
            ->whereBetween('created_at', [$start, $end])
            ->get($columns);
        $documents = $loadPeriodRecords(DocumentRequest::class, ['created_at', 'status']);
        $complaints = $loadPeriodRecords(Complaint::class, ['created_at', 'status', 'category']);
        $escalations = $loadPeriodRecords(ChatbotEscalation::class, ['created_at', 'status']);
        $residents = $loadPeriodRecords(Resident::class, ['created_at']);
        $feedback = $loadPeriodRecords(Feedback::class, ['created_at', 'rating']);

        foreach ($documents as $record) {
            $monthly[$record->created_at->format('Y-m')]['document_requests']++;
        }
        foreach ($complaints as $record) {
            $monthly[$record->created_at->format('Y-m')]['complaints']++;
        }
        foreach ($escalations as $record) {
            $monthly[$record->created_at->format('Y-m')]['chatbot_escalations']++;
        }
        foreach ($residents as $record) {
            $monthly[$record->created_at->format('Y-m')]['new_residents']++;
        }
        foreach ($feedback as $record) {
            $key = $record->created_at->format('Y-m');
            $monthly[$key]['feedback']++;
            $monthly[$key]['feedback_rating_sum'] += $record->rating;
        }
        foreach ($monthly as &$month) {
            if ($month['feedback'] > 0) {
                $month['feedback_average_rating'] = round(
                    $month['feedback_rating_sum'] / $month['feedback'],
                    1,
                );
            }
            unset($month['feedback_rating_sum']);
        }
        unset($month);

        $complaintCategories = $complaints
            ->groupBy(fn (Complaint $complaint) => $complaint->category ?: 'Uncategorized')
            ->map(fn ($items, $category) => ['category' => $category, 'count' => $items->count()])
            ->sortByDesc('count')
            ->take(5)
            ->values();

        return response()->json([
            'period' => [
                'months' => $months,
                'start' => $startDate,
                'end' => $endDate,
            ],
            'monthly' => array_values($monthly),
            'summary' => [
                'document_requests' => [
                    'total' => $documents->count(),
                    'completed' => $documents->where('status', 'completed')->count(),
                    'rejected' => $documents->where('status', 'rejected')->count(),
                ],
                'complaints' => [
                    'total' => $complaints->count(),
                    'resolved' => $complaints->whereIn('status', ['resolved', 'closed'])->count(),
                    'open' => $complaints->whereNotIn('status', ['resolved', 'closed', 'rejected'])->count(),
                ],
                'chatbot_escalations' => [
                    'total' => $escalations->count(),
                    'replied' => $escalations->where('status', 'replied')->count(),
                    'pending' => $escalations->where('status', 'pending')->count(),
                ],
                'new_residents' => $residents->count(),
                'feedback' => [
                    'total' => $feedback->count(),
                    'average_rating' => round((float) $feedback->avg('rating'), 1),
                ],
            ],
            'complaint_categories' => $complaintCategories,
        ]);
    }

    public function feedback(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'service_type' => ['nullable', 'string', 'max:100'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'per_page' => ['nullable', 'integer', 'between:1,50'],
        ]);

        $query = Feedback::query()->with('resident:id,name,email')->latest();

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($feedbackQuery) use ($search) {
                $feedbackQuery
                    ->where('comment', 'like', "%{$search}%")
                    ->orWhereHas('resident', function ($residentQuery) use ($search) {
                        $residentQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if (!empty($validated['service_type'])) {
            $query->where('service_type', $validated['service_type']);
        }

        if (isset($validated['rating'])) {
            $query->where('rating', $validated['rating']);
        }

        $page = $query->paginate($validated['per_page'] ?? 12);
        $stats = Feedback::query()
            ->selectRaw('COUNT(*) as total, COALESCE(AVG(rating), 0) as average_rating')
            ->selectRaw('COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) as five_star')
            ->selectRaw('COALESCE(SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END), 0) as low_rating')
            ->first();

        return response()->json([
            'data' => $page->items(),
            'current_page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(),
            'total' => $page->total(),
            'stats' => [
                'total' => (int) $stats->total,
                'average_rating' => round((float) $stats->average_rating, 1),
                'five_star' => (int) $stats->five_star,
                'low_rating' => (int) $stats->low_rating,
            ],
        ]);
    }

    public function pendingResidents()
    {
        return Resident::where('verification_status', 'pending')
            ->latest()
            ->get()
            ->map(function (Resident $resident) {
                $resident->setAttribute(
                    'registry_match',
                    BarangayRegistry::query()
                        ->where('first_name', $resident->first_name)
                        ->where('last_name', $resident->last_name)
                        ->whereDate('date_of_birth', $resident->date_of_birth)
                        ->where('sex', $resident->sex)
                        ->where('purok', $resident->purok)
                        ->first(),
                );

                return $resident;
            });
    }

    public function verifyResident(Resident $user)
    {
        $user->update(['verification_status' => 'verified', 'rejection_reason' => null]);

        return response()->json(['message' => 'Resident verified.', 'user' => $user]);
    }

    public function rejectResident(Request $request, Resident $user)
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $user->update(['verification_status' => 'rejected', 'rejection_reason' => $validated['reason']]);

        return response()->json(['message' => 'Resident rejected.', 'user' => $user]);
    }
}
