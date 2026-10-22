<?php

namespace App\Http\Controllers;

use App\Models\BlotterEntry;
use App\Models\Resident;
use Illuminate\Http\Request;

class BlotterController extends Controller
{
    public const INCIDENT_TYPES = [
        'Physical Injury',
        'Physical Assault',
        'Verbal Abuse / Oral Defamation',
        'Noise Disturbance',
        'Property Damage',
        'Theft',
        'Trespassing',
        'Domestic Dispute',
        'Others',
    ];

    public const STATUSES = [
        'open',
        'resolved',
        'referred',
    ];

    public function incidentTypes()
    {
        return response()->json([
            'data' => self::INCIDENT_TYPES,
            'statuses' => self::STATUSES,
        ]);
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:all,open,resolved,referred'],
            'incident_type' => ['nullable', 'string', 'max:255'],
            'resident' => ['nullable', 'string', 'max:255'],
        ]);

        $search = trim($validated['search'] ?? '');
        $status = $validated['status'] ?? 'all';

        $query = BlotterEntry::query()->with('resident', 'recorder');

        if (! empty($validated['incident_type'])) {
            $query->where('incident_type', $validated['incident_type']);
        }

        $resident = trim($validated['resident'] ?? '');
        if ($resident !== '') {
            if (ctype_digit($resident)) {
                $query->where('resident_id', (int) $resident);
            } else {
                $query->where('resident_name', $resident);
            }
        }

        if ($search !== '') {
            $query->where(function ($entryQuery) use ($search) {
                $entryQuery->where('resident_name', 'like', "%{$search}%")
                    ->orWhere('complainant_name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('incident_type', 'like', "%{$search}%")
                    ->orWhere('narrative', 'like', "%{$search}%");

                if (preg_match('/^blt-?(\d+)$/i', $search, $matches)) {
                    $entryQuery->orWhere('id', (int) $matches[1]);
                }
            });
        }

        $entries = (clone $query)
            ->when($status !== 'all', fn ($entryQuery) => $entryQuery->where('status', $status))
            ->orderByDesc('incident_date')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        $counts = (clone $query)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $statusCounts = [];
        foreach (self::STATUSES as $complaintStatus) {
            $statusCounts[$complaintStatus] = (int) ($counts[$complaintStatus] ?? 0);
        }
        $statusCounts['all'] = array_sum($statusCounts);

        return response()->json(array_merge($entries->toArray(), [
            'status_counts' => $statusCounts,
        ]));
    }

    public function residents(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $search = trim($validated['search'] ?? '');

        $entries = BlotterEntry::query()
            ->with('resident')
            ->when($search !== '', function ($entryQuery) use ($search) {
                $entryQuery->where(function ($innerQuery) use ($search) {
                    $innerQuery->where('resident_name', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");

                    if (preg_match('/^blt-?(\d+)$/i', $search, $matches)) {
                        $innerQuery->orWhere('id', (int) $matches[1]);
                    }
                });
            })
            ->orderByDesc('incident_date')
            ->orderByDesc('id')
            ->get();

        $residents = $entries
            ->groupBy(fn (BlotterEntry $entry) => $entry->resident_id ?? "name:{$entry->resident_name}")
            ->map(function ($group) {
                $latest = $group->first();

                return [
                    'resident_id' => $latest->resident_id,
                    'resident_name' => $latest->resident_name,
                    'purok' => $latest->resident?->purok,
                    'entries_count' => $group->count(),
                    'latest_incident_date' => $latest->incident_date?->toDateString(),
                    'latest_incident_type' => $latest->incident_type,
                    'latest_status' => $latest->status,
                ];
            })
            ->sortByDesc('entries_count')
            ->values();

        return response()->json([
            'data' => $residents,
            'total' => $residents->count(),
        ]);
    }

    public function registeredResidents(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $search = trim($validated['search'] ?? '');

        $residents = Resident::query()
            ->when($search !== '', function ($residentQuery) use ($search) {
                $residentQuery->where(function ($innerQuery) use ($search) {
                    $innerQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('purok', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'email', 'purok', 'address']);

        return response()->json([
            'data' => $residents,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'resident_id' => ['nullable', 'integer', 'exists:residents,id'],
            'resident_name' => ['nullable', 'string', 'max:255'],
            'complainant_name' => ['nullable', 'string', 'max:255'],
            'incident_type' => ['required', 'string', 'max:255'],
            'incident_date' => ['required', 'date'],
            'incident_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:255'],
            'narrative' => ['required', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', 'in:open,resolved,referred'],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ]);

        $resident = ! empty($validated['resident_id'])
            ? Resident::find($validated['resident_id'])
            : null;

        $residentName = $resident?->name ?? trim($validated['resident_name'] ?? '');

        if ($residentName === '') {
            return response()->json([
                'message' => 'A resident name is required when no registered resident is selected.',
                'errors' => ['resident_name' => ['The resident name is required.']],
            ], 422);
        }

        $entry = BlotterEntry::create([
            ...$validated,
            'resident_id' => $resident?->id,
            'resident_name' => $residentName,
            'status' => $validated['status'] ?? 'open',
            'recorded_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Blotter entry recorded.',
            'data' => $entry->fresh()->load('resident', 'recorder'),
        ], 201);
    }

    public function update(Request $request, BlotterEntry $blotter)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:open,resolved,referred'],
            'remark' => ['nullable', 'string', 'max:2000'],
        ]);

        if (array_key_exists('status', $validated)) {
            $blotter->status = $validated['status'];
        }

        $newRemark = trim($validated['remark'] ?? '');
        if ($newRemark !== '') {
            $existing = trim($blotter->remarks ?? '');
            $blotter->remarks = $existing === ''
                ? $newRemark
                : "{$existing}\n\n--- Added remark ---\n{$newRemark}";
        }

        $blotter->save();

        return response()->json([
            'message' => 'Blotter entry updated.',
            'data' => $blotter->fresh()->load('resident', 'recorder'),
        ]);
    }

    public function summon(Request $request)
    {
        $validated = $request->validate([
            'court_city' => ['nullable', 'string', 'max:255'],
            'court_region' => ['nullable', 'string', 'max:255'],
            'court_name' => ['nullable', 'string', 'max:255'],
            'branch' => ['nullable', 'string', 'max:255'],
            'court_email' => ['nullable', 'email', 'max:255'],
            'court_hotline' => ['nullable', 'string', 'max:255'],
            'plaintiff' => ['required', 'string', 'max:255'],
            'civil_case_no' => ['nullable', 'string', 'max:255'],
            'cause_of_action' => ['nullable', 'string', 'max:255'],
            'defendants' => ['required', 'string', 'max:255'],
            'summoned_to' => ['required', 'string', 'max:255'],
            'summoned_address' => ['nullable', 'string', 'max:255'],
            'summon_date' => ['nullable', 'date'],
            'clerk_name' => ['nullable', 'string', 'max:255'],
            'clerk_title' => ['nullable', 'string', 'max:255'],
        ]);

        // In a full implementation this would generate/store a summons document
        // (PDF) linked to a blotter case. For now we acknowledge receipt.

        return response()->json([
            'message' => 'Summons prepared.',
            'data' => $validated,
        ], 201);
    }
}
