<?php

namespace App\Http\Controllers;

use App\Models\Resident;
use App\Models\Feedback;
use App\Models\ChatbotEscalation;
use App\Models\Complaint;
use App\Models\BlotterEntry;
use App\Models\DocumentRequest;
use App\Models\BarangayRegistry;
use App\Models\Staff;
use App\Models\SummonEntry;
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

        $query = BarangayRegistry::query()
            ->select('barangay_registry.*')
            ->selectSub(function ($accountQuery) {
                $accountQuery->from('residents')
                    ->selectRaw('COUNT(*)')
                    ->whereColumn('residents.first_name', 'barangay_registry.first_name')
                    ->whereColumn('residents.last_name', 'barangay_registry.last_name')
                    ->whereDate('residents.date_of_birth', '=', DB::raw('barangay_registry.date_of_birth'))
                    ->whereColumn('residents.sex', 'barangay_registry.sex')
                    ->whereColumn('residents.purok', 'barangay_registry.purok');
            }, 'system_account_count')
            ->selectSub(function ($accountQuery) {
                $accountQuery->from('residents')
                    ->select('verification_status')
                    ->whereColumn('residents.first_name', 'barangay_registry.first_name')
                    ->whereColumn('residents.last_name', 'barangay_registry.last_name')
                    ->whereDate('residents.date_of_birth', '=', DB::raw('barangay_registry.date_of_birth'))
                    ->whereColumn('residents.sex', 'barangay_registry.sex')
                    ->whereColumn('residents.purok', 'barangay_registry.purok')
                    ->orderBy('residents.id')
                    ->limit(1);
            }, 'system_account_verification_status');
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

        $page = $query
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate($validated['per_page'] ?? 25);

        $registryIdentityHashes = $page->getCollection()
            ->map(fn (BarangayRegistry $record) => hash('sha256', 'registry:'.$record->id));
        $availedIdentityHashes = DB::table('first_time_jobseeker_availments')
            ->whereIn('identity_hash', $registryIdentityHashes)
            ->pluck('identity_hash')
            ->flip();

        $page->getCollection()->transform(function (BarangayRegistry $record) use ($availedIdentityHashes) {
            $identityHash = hash('sha256', 'registry:'.$record->id);
            $record->setAttribute('first_time_jobseeker_available', !$availedIdentityHashes->has($identityHash));
            $accountCount = (int) $record->system_account_count;
            $record->setAttribute('system_account_status', $accountCount === 0
                ? 'no_account'
                : ($accountCount > 1 ? 'multiple_accounts' : ($record->system_account_verification_status ?: 'pending')));

            return $record;
        });

        return $page;
    }

    public function storeBarangayRegistry(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'suffix' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['required', 'date', 'before_or_equal:today'],
            'sex' => ['required', 'string', 'max:50'],
            'purok' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'mobile_number' => ['required', 'regex:/^09\\d{9}$/'],
        ]);

        $record = BarangayRegistry::create($validated);

        return response()->json([
            'message' => 'Resident added to the barangay registry.',
            'resident' => $record,
        ], 201);
    }

    public function residentAccounts(Request $request)
    {
        $validated = $request->validate(['search' => ['nullable', 'string', 'max:150']]);
        $query = Resident::query()
            ->select(['id','name','first_name','middle_name','last_name','email','verification_status','is_active','last_login_at','created_at'])
            ->selectRaw('(SELECT COUNT(*) FROM residents AS same_name_accounts WHERE LOWER(TRIM(COALESCE(same_name_accounts.first_name, \'\'))) = LOWER(TRIM(COALESCE(residents.first_name, \'\'))) AND LOWER(TRIM(COALESCE(same_name_accounts.middle_name, \'\'))) = LOWER(TRIM(COALESCE(residents.middle_name, \'\'))) AND LOWER(TRIM(COALESCE(same_name_accounts.last_name, \'\'))) = LOWER(TRIM(COALESCE(residents.last_name, \'\')))) AS same_name_accounts');
        if (!empty($validated['search'])) {
            $term = trim($validated['search']);
            $query->where(fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%"));
        }
        return $query
            ->orderByRaw("LOWER(TRIM(COALESCE(first_name, '')))")
            ->orderByRaw("LOWER(TRIM(COALESCE(middle_name, '')))")
            ->orderByRaw("LOWER(TRIM(COALESCE(last_name, '')))")
            ->orderByRaw('CASE WHEN last_login_at IS NULL THEN 0 ELSE 1 END')
            ->orderBy('last_login_at')
            ->paginate(50);
    }

    public function updateResidentAccountStatus(Request $request, Resident $resident)
    {
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);
        $resident->update(['is_active' => $validated['is_active']]);
        if (!$resident->is_active) $resident->tokens()->delete();
        return response()->json(['message' => $resident->is_active ? 'Resident account enabled.' : 'Resident account disabled and active sessions revoked.']);
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
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date', 'after_or_equal:from'],
        ]);
        $months = (int) ($validated['months'] ?? 12);
        $end = now();
        $start = $end->copy()->startOfMonth()->subMonths($months - 1);
        if (!empty($validated['from'])) $start = \Illuminate\Support\Carbon::parse($validated['from'])->startOfDay();
        if (!empty($validated['to'])) $end = \Illuminate\Support\Carbon::parse($validated['to'])->endOfDay();
        if ($start->gt($end)) return response()->json(['message' => 'The from date must be on or before the to date.'], 422);
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
        $blotters = $loadPeriodRecords(BlotterEntry::class, ['created_at', 'status']);
        $escalations = $loadPeriodRecords(ChatbotEscalation::class, ['created_at', 'status']);
        $residents = $loadPeriodRecords(Resident::class, ['created_at']);
        $feedback = $loadPeriodRecords(Feedback::class, ['created_at', 'rating']);
        $summons = $loadPeriodRecords(SummonEntry::class, [
            'created_at', 'status', 'complainant_attended', 'respondent_attended',
        ]);

        foreach ($documents as $record) {
            $monthly[$record->created_at->format('Y-m')]['document_requests']++;
        }
        foreach ($complaints as $record) {
            $monthly[$record->created_at->format('Y-m')]['complaints']++;
        }
        foreach ($blotters as $record) {
            $monthly[$record->created_at->format('Y-m')]['complaints']++;
        }
        foreach ($summons as $record) {
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
                    'total' => $complaints->count() + $blotters->count() + $summons->count(),
                    'resident_complaints' => $complaints->count(),
                    'blotter_entries' => $blotters->count(),
                    'summon_notices' => $summons->count(),
                    'resolved' => $complaints->whereIn('status', ['resolved', 'closed'])->count()
                        + $blotters->where('status', 'resolved')->count()
                        + $summons->where('status', 'completed')->count(),
                    'open' => $complaints->whereNotIn('status', ['resolved', 'closed', 'rejected'])->count()
                        + $blotters->whereIn('status', ['open', 'referred'])->count()
                        + $summons->whereIn('status', ['scheduled', 'rescheduled'])->count(),
                    'rejected' => $complaints->where('status', 'rejected')->count()
                        + $summons->where('status', 'cancelled')->count(),
                    'scheduled' => $summons->where('status', 'scheduled')->count(),
                    'completed' => $summons->where('status', 'completed')->count(),
                    'rescheduled' => $summons->where('status', 'rescheduled')->count(),
                    'cancelled' => $summons->where('status', 'cancelled')->count(),
                    'complainant_attended' => $summons->where('complainant_attended', true)->count(),
                    'respondent_attended' => $summons->where('respondent_attended', true)->count(),
                    'complainant_absent' => $summons->where('complainant_attended', false)->count(),
                    'respondent_absent' => $summons->where('respondent_attended', false)->count(),
                    'complainant_attendance_unmarked' => $summons->whereNull('complainant_attended')->count(),
                    'respondent_attendance_unmarked' => $summons->whereNull('respondent_attended')->count(),
                    'both_attended' => $summons->filter(fn ($summon) => $summon->complainant_attended && $summon->respondent_attended)->count(),
                    'attended_by_complainant' => $summons->where('complainant_attended', true)->count(),
                    'attended_by_respondent' => $summons->where('respondent_attended', true)->count(),
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

    public function documentRequestReport(Request $request)
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);
        $rows = DocumentRequest::query()->with(['resident:id,name,first_name,middle_name,last_name,email', 'assignedStaff:id,name', 'type'])
            ->whereBetween('created_at', [\Illuminate\Support\Carbon::parse($validated['from'])->startOfDay(), \Illuminate\Support\Carbon::parse($validated['to'])->endOfDay()])
            ->orderBy('created_at')->get();
        return response()->json(['from' => $validated['from'], 'to' => $validated['to'], 'data' => $rows]);
    }

    public function complaintReport(Request $request)
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
        ]);
        $complaints = Complaint::query()->with('user:id,name,email')
            ->whereBetween('created_at', [
                \Illuminate\Support\Carbon::parse($validated['from'])->startOfDay(),
                \Illuminate\Support\Carbon::parse($validated['to'])->endOfDay(),
            ])
            ->orderBy('created_at')
            ->get();

        return response()->json([
            'from' => $validated['from'],
            'to' => $validated['to'],
            'summary' => [
                'total' => $complaints->count(),
                'open' => $complaints->whereNotIn('status', ['resolved', 'rejected', 'closed'])->count(),
                'resolved' => $complaints->whereIn('status', ['resolved', 'closed'])->count(),
                'rejected' => $complaints->where('status', 'rejected')->count(),
            ],
            'data' => $complaints,
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
