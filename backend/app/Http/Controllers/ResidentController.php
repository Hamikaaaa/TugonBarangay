<?php

namespace App\Http\Controllers;

use App\Models\ChatbotFaq;
use App\Models\ChatbotEscalation;
use App\Models\ChatbotMessage;
use App\Models\Complaint;
use App\Models\DocumentRequest;
use App\Models\DocumentRequestEvent;
use App\Models\DocumentType;
use App\Models\Feedback;
use App\Models\ResidentNotification;
use App\Support\ResidentIdentityKey;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ResidentController extends Controller
{
    private const MANUAL_URGENT_KEYWORDS = [
        'hostage',
        'kidnapping',
        'kidnapped',
        'attempted murder',
        'suicide attempt',
        'child abuse',
        'explosive device',
        'held against their will',

    ];

    private const COMPLAINT_STATUSES = [
        'pending',
        'in_progress',
        'resolved',
        'rejected',
        'closed',
    ];

    private const DOCUMENT_FEES = [
        'Barangay Certification' => 80,
        'Barangay Residency' => 130,
        'Barangay Indigency' => 0,
        'Business Permit' => 0,
    ];

    private const DOCUMENT_REQUIREMENTS = [
        'Barangay Certification' => [
            'purok_certificate' => ['label' => 'Purok Certificate', 'required' => true],
            'valid_id' => ['label' => 'Valid government-issued ID', 'required' => true],
        ],
        'Barangay Residency' => [
            'purok_certificate' => ['label' => 'Purok Certificate', 'required' => true],
            'valid_id' => ['label' => 'Valid government-issued ID', 'required' => true],
        ],
        'Barangay Indigency' => [
            'valid_id' => ['label' => 'Valid government-issued ID', 'required' => true],
        ],
        'Business Permit' => [
            'valid_id' => ['label' => 'Valid government-issued ID', 'required' => true],
            'business_registration' => [
                'label' => 'Business registration',
                'required' => false,
                'required_if' => 'required_if:form_fields.business_ownership,Sole Proprietorship,Partnership,Corporation,Cooperative',
            ],
            'lease_or_proof_of_ownership' => ['label' => 'Lease contract or proof of ownership', 'required' => false],
            'community_tax_certificate' => ['label' => 'Community Tax Certificate', 'required' => false],
            'other_business_permits' => ['label' => 'Other permits', 'required' => false],
        ],
    ];

    private const APPLICANT_FIELD_RULES = [
        'full_name' => ['required', 'string', 'max:255'],
        'first_name' => ['required', 'string', 'max:100'],
        'middle_name' => ['nullable', 'string', 'max:100'],
        'last_name' => ['required', 'string', 'max:100'],
        'date_of_birth' => ['required', 'date', 'before_or_equal:today'],
        'age' => ['required', 'integer', 'min:0', 'max:150'],
        'sex' => ['required', 'string', 'max:50'],
        'civil_status' => ['required', 'in:Single,Married,Widowed,Separated,Other'],
        'purok' => ['required', 'string', 'max:100'],
        'address' => ['nullable', 'string', 'max:255'],
        'citizenship' => ['required', 'string', 'max:100'],
        'contact_number' => ['required', 'string', 'max:30'],
        'email_address' => ['required', 'email', 'max:255'],
        'municipality_city' => ['required', 'string', 'max:100'],
        'province' => ['required', 'string', 'max:100'],
    ];

    private const DOCUMENT_APPLICANT_FIELDS = [
        'Barangay Certification' => [
            'full_name',
            'address',
            'date_of_birth',
            'sex',
            'purok',
        ],
        'Barangay Residency' => [
            'first_name',
            'middle_name',
            'last_name',
            'purok',
        ],
        'Barangay Indigency' => [
            'full_name',
            'purok',
        ],
        'Business Permit' => ['full_name', 'contact_number', 'email_address'],
    ];

    private const DOCUMENT_FORM_FIELDS = [
        'Barangay Certification' => [
            'purpose' => ['required', 'string', 'max:255'],
        ],
        'Barangay Residency' => [
            'years_of_residency' => ['required', 'integer', 'min:0', 'max:150'],
            'purpose' => ['required', 'string', 'max:255'],
        ],
        'Barangay Indigency' => [
            'purpose' => ['required', 'in:Medical Assistance,Educational Assistance,Financial Assistance,Scholarship,Legal Assistance,Social Welfare Assistance,Other'],
            'additional_details' => ['nullable', 'required_if:form_fields.purpose,Other', 'string', 'max:2000'],
        ],
        'Business Permit' => [
            'business_ownership' => ['required', 'in:Sole Proprietorship,Partnership,Corporation,Cooperative,Other'],
            'business_name' => ['required', 'string', 'max:255'],
            'business_type' => ['required', 'string', 'max:255'],
            'nature_of_business' => ['required', 'string', 'max:500'],
            'business_street_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'business_purok' => ['required', 'string', 'max:100'],
            'estimated_investment' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'number_of_employees' => ['required', 'integer', 'min:0', 'max:100000'],
            'business_start_date' => ['required', 'date'],
            'business_contact_number' => ['required', 'string', 'max:30'],
            'business_email_address' => ['required', 'email', 'max:255'],
        ],
    ];

    public function dashboard(Request $request)
    {
        $user = $request->user();
        $requestQuery = DocumentRequest::where('resident_id', $user->id);
        $complaintQuery = Complaint::where('resident_id', $user->id);
        $requests = (clone $requestQuery)->latest()->limit(5)->get();
        $complaints = (clone $complaintQuery)->latest()->limit(5)->get();

        return response()->json([
            'user' => $user,
            'stats' => [
                'pending_requests' => (clone $requestQuery)->whereIn('status', ['pending', 'under_review'])->count(),
                'processing_requests' => (clone $requestQuery)->where('status', 'processing')->count(),
                'completed_requests' => (clone $requestQuery)->whereIn('status', ['completed', 'complete', 'ready_for_release'])->count(),
                'open_complaints' => (clone $complaintQuery)->whereNotIn('status', ['resolved', 'closed', 'rejected'])->count(),
            ],
            'requests' => $requests->values(),
            'complaints' => $complaints->values(),
            'notifications' => ResidentNotification::where('resident_id', $user->id)->latest()->take(5)->get(),
            'unread_notifications' => ResidentNotification::where('resident_id', $user->id)->whereNull('read_at')->count(),
        ]);
    }

    public function requests(Request $request)
    {
        return DocumentRequest::where('resident_id', $request->user()->id)
            ->with('type')
            ->latest()
            ->paginate(10);
    }

    public function viewRequestRequirement(Request $request, DocumentRequest $documentRequest, string $requirement)
    {
        abort_unless((int) $documentRequest->resident_id === (int) $request->user()->id, 404);
        $file = $documentRequest->details['requirements'][$requirement] ?? null;
        abort_unless(is_array($file) && !empty($file['path']), 404);
        $disk = Storage::disk('local');
        abort_unless($disk->exists($file['path']), 404);

        $filename = $file['original_name'] ?? basename($file['path']);
        return $disk->response($file['path'], $filename, [
            'Cache-Control' => 'private, no-store',
            'Content-Disposition' => 'inline; filename="'.str_replace('"', '', $filename).'"',
        ], 'inline');
    }

    public function storeRequest(Request $request)
    {
        $documentType = $request->input('document_type');
        $configuredType = DocumentType::where('value', $documentType)->where('active', true)->first();
        if ($documentType === 'Barangay Certification') {
            $formFields = $request->input('form_fields', []);
            if (empty($formFields['purok']) && $request->user()->purok) {
                $formFields['purok'] = $request->user()->purok;
                $request->merge(['form_fields' => $formFields]);
            }
        }
        $managedValues = DocumentType::whereNotNull('value')->pluck('value')->all();
        $legacyValues = array_values(array_diff(array_keys(self::DOCUMENT_REQUIREMENTS), $managedValues));
        $rules = [
            'document_type' => [
                'required',
                Rule::in(array_values(array_unique(array_merge(
                    $legacyValues,
                    DocumentType::where('active', true)->pluck('value')->all(),
                )))),
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];

        if ($configuredType) {
            $applicantFields = array_values(array_filter(
                $configuredType->applicant_fields ?? [],
                fn (array $field) => ($field['enabled'] ?? true),
            ));
            $documentFields = array_values(array_filter(
                $configuredType->fields ?? [],
                fn (array $field) => ($field['enabled'] ?? true),
            ));
            $requirements = array_values(array_filter(
                $configuredType->requirements ?? [],
                fn (array $requirement) => ($requirement['enabled'] ?? true),
            ));
            $rules += $this->configuredDocumentRules(
                $applicantFields,
                $documentFields,
                $requirements,
                false,
                [],
                $request->input('form_fields', []),
            );
        } elseif (isset(self::DOCUMENT_REQUIREMENTS[$documentType])) {
            $applicantFields = self::DOCUMENT_APPLICANT_FIELDS[$documentType];
            $documentFields = self::DOCUMENT_FORM_FIELDS[$documentType];
            $requirements = self::DOCUMENT_REQUIREMENTS[$documentType];
            $allFieldKeys = array_merge($applicantFields, array_keys($documentFields));
            $rules['form_fields'] = ['required', 'array:' . implode(',', $allFieldKeys)];
            $rules['requirements'] = ['sometimes', 'array:' . implode(',', array_keys($requirements))];

            foreach ($applicantFields as $key) {
                $rules["form_fields.{$key}"] = self::APPLICANT_FIELD_RULES[$key];
            }

            foreach ($documentFields as $key => $fieldRules) {
                $rules["form_fields.{$key}"] = $fieldRules;
            }

            foreach ($requirements as $key => $requirement) {
                $fileRules = ['file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'];
                if ($requirement['required']) {
                    array_unshift($fileRules, 'required');
                } else {
                    array_unshift($fileRules, 'sometimes');
                }
                if (isset($requirement['required_if'])) {
                    array_unshift($fileRules, $requirement['required_if']);
                }
                $rules["requirements.{$key}"] = $fileRules;
            }
        }

        $validated = $request->validate($rules);
        if ($configuredType
            && $validated['document_type'] !== 'Barangay Residency'
            && $this->hasField($configuredType, 'age')
            && $this->hasField($configuredType, 'date_of_birth')) {
            $validated['form_fields']['age'] = Carbon::parse($validated['form_fields']['date_of_birth'])->age;
        } elseif ($validated['document_type'] === 'First-Time Jobseeker Certification' && $request->user()->date_of_birth) {
            $validated['form_fields']['age'] = Carbon::parse($request->user()->date_of_birth)->age;
        } elseif ($validated['document_type'] === 'Barangay Certification') {
            $validated['form_fields']['age'] = Carbon::parse($validated['form_fields']['date_of_birth'])->age;
        }
        $requirements = $configuredType
            ? ($configuredType->requirements ?? [])
            : self::DOCUMENT_REQUIREMENTS[$validated['document_type']];
        $fee = $configuredType
            ? ($configuredType->fee_mode === 'fixed' ? $configuredType->fee : 0)
            : self::DOCUMENT_FEES[$validated['document_type']];
        $storedPaths = [];
        $userId = $request->user()->id;
        $jobseekerIdentityHash = $validated['document_type'] === 'First-Time Jobseeker Certification'
            ? ResidentIdentityKey::make($request->user())
            : null;

        try {
            $documentRequest = DB::transaction(function () use ($request, $validated, $requirements, $userId, $fee, $configuredType, $jobseekerIdentityHash, &$storedPaths) {
                if ($configuredType?->one_time) {
                    \App\Models\Resident::whereKey($userId)->lockForUpdate()->firstOrFail();
                    if ($validated['document_type'] === 'First-Time Jobseeker Certification') {
                        abort_if(
                            DocumentRequest::where('resident_id', $userId)
                                ->where('document_type', $validated['document_type'])
                                ->where('status', '!=', 'rejected')
                                ->exists(),
                            409,
                            'You have already availed this one-time certificate. You cannot request it again.',
                        );
                        abort_if(!$jobseekerIdentityHash, 422, 'Your resident profile must include your full name and date of birth to request this certificate.');
                        $claimed = DB::table('first_time_jobseeker_availments')->insertOrIgnore([
                            'identity_hash' => $jobseekerIdentityHash,
                            'claimed_at' => now(),
                        ]);
                        abort_if($claimed === 0, 409, 'This resident has already availed the First-Time Jobseeker Certificate. It can only be availed once, even when using another account.');
                    } else {
                        abort_if(
                            DocumentRequest::where('resident_id', $userId)
                                ->where('document_type', $validated['document_type'])
                                ->where('status', '!=', 'rejected')
                                ->exists(),
                            409,
                            'You have already availed this one-time certificate. You cannot request it again.',
                        );
                    }
                }
                $uploadedRequirements = [];

                foreach ($requirements as $index => $requirement) {
                    $key = $requirement['key'] ?? $index;
                    $file = $request->file("requirements.{$key}");
                    if (!$file) {
                        continue;
                    }

                    $path = $file->store("document-requests/{$userId}", 'local');
                    $storedPaths[] = $path;
                    $uploadedRequirements[$key] = [
                        'label' => $requirement['label'],
                        'path' => $path,
                        'original_name' => $file->getClientOriginalName(),
                    ];
                }

                $documentRequest = DocumentRequest::create([
                    'resident_id' => $userId,
                    'document_type' => $validated['document_type'],
                    'details' => [
                        'notes' => $validated['notes'] ?? null,
                        'form_fields' => $validated['form_fields'],
                        'requirements' => $uploadedRequirements,
                        'fee_mode' => $configuredType?->fee_mode ?? 'fixed',
                        'fee_assessed' => $configuredType?->fee_mode !== 'assessed',
                    ],
                    'fee' => $fee,
                    'status' => 'pending',
                ]);
                if ($jobseekerIdentityHash) {
                    DB::table('first_time_jobseeker_availments')
                        ->where('identity_hash', $jobseekerIdentityHash)
                        ->update(['document_request_id' => $documentRequest->id]);
                }
                DocumentRequestEvent::record(
                    $documentRequest,
                    $request->user(),
                    'request_submitted',
                    null,
                    'pending',
                );

                ResidentNotification::create([
                    'resident_id' => $userId,
                    'type' => 'document_request_submitted',
                    'title' => 'Document request submitted',
                    'message' => "Your {$documentRequest->document_type} request has been received.",
                ]);

                return $documentRequest;
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($storedPaths);
            throw $exception;
        }

        return response()->json([
            'message' => 'Document request submitted.',
            'request' => $documentRequest,
        ], 201);
    }

    public function resubmitRequest(Request $request, DocumentRequest $documentRequest)
    {
        abort_unless($documentRequest->resident_id === $request->user()->id, 404);
        abort_unless($documentRequest->status === 'for_correction', 409);

        $documentType = $documentRequest->document_type;
        if ($documentType === 'Barangay Certification') {
            $formFields = $request->input('form_fields', []);
            if (empty($formFields['purok']) && $request->user()->purok) {
                $formFields['purok'] = $request->user()->purok;
                $request->merge(['form_fields' => $formFields]);
            }
        }
        $configuredType = DocumentType::where('value', $documentType)->first();
        $applicantFields = $configuredType
            ? array_column(array_values(array_filter(
                $configuredType->applicant_fields ?? [],
                fn (array $field) => ($field['enabled'] ?? true),
            )), 'key')
            : self::DOCUMENT_APPLICANT_FIELDS[$documentType];
        $documentFields = $configuredType
            ? array_column(array_values(array_filter(
                $configuredType->fields ?? [],
                fn (array $field) => ($field['enabled'] ?? true),
            )), 'key')
            : self::DOCUMENT_FORM_FIELDS[$documentType];
        $requirements = $configuredType
            ? array_values(array_filter(
                $configuredType->requirements ?? [],
                fn (array $requirement) => ($requirement['enabled'] ?? true),
            ))
            : self::DOCUMENT_REQUIREMENTS[$documentType];
        $existingRequirements = $documentRequest->details['requirements'] ?? [];
        $allFieldKeys = array_merge($applicantFields, array_keys($documentFields));
        $rules = [
            'form_fields' => ['required', 'array:' . implode(',', $allFieldKeys)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'requirements' => ['sometimes', 'array:' . implode(',', array_keys($requirements))],
        ];

        if ($configuredType) {
            $allFieldKeys = array_merge(
                $applicantFields,
                $documentFields,
            );
            $rules['form_fields'] = ['required', 'array:' . implode(',', $allFieldKeys)];
            $rules = array_merge($rules, $this->configuredDocumentRules(
                array_values(array_filter(
                    $configuredType->applicant_fields ?? [],
                    fn (array $field) => ($field['enabled'] ?? true),
                )),
                array_values(array_filter(
                    $configuredType->fields ?? [],
                    fn (array $field) => ($field['enabled'] ?? true),
                )),
                $requirements,
                true,
                $existingRequirements,
                $request->input('form_fields', []),
            ));
        } else {
            foreach ($applicantFields as $key) {
                $rules["form_fields.{$key}"] = self::APPLICANT_FIELD_RULES[$key];
            }

            foreach ($documentFields as $key => $fieldRules) {
                $rules["form_fields.{$key}"] = $fieldRules;
            }

            foreach ($requirements as $key => $requirement) {
                $fileRules = [
                    $requirement['required'] && !isset($existingRequirements[$key]['path'])
                        ? 'required'
                        : 'sometimes',
                    'file',
                    'mimes:pdf,jpg,jpeg,png',
                    'max:5120',
                ];
                if (isset($requirement['required_if'])) {
                    array_unshift($fileRules, $requirement['required_if']);
                }
                $rules["requirements.{$key}"] = $fileRules;
            }
        }

        $validated = $request->validate($rules);
        if (($configuredType
                && $documentType !== 'Barangay Residency'
                && $this->hasField($configuredType, 'age')
                && $this->hasField($configuredType, 'date_of_birth'))
            || $documentType === 'Barangay Certification') {
            $validated['form_fields']['age'] = Carbon::parse($validated['form_fields']['date_of_birth'])->age;
        } elseif ($documentType === 'First-Time Jobseeker Certification' && $request->user()->date_of_birth) {
            $validated['form_fields']['age'] = Carbon::parse($request->user()->date_of_birth)->age;
        }
        $details = $documentRequest->details ?? [];
        $details['form_fields'] = $validated['form_fields'];
        if ($configuredType?->fee_mode === 'assessed') {
            $details['fee_assessed'] = false;
        }
        if (array_key_exists('notes', $validated)) {
            $details['notes'] = $validated['notes'];
        } else {
            $details['notes'] ??= null;
        }
        $storedPaths = [];
        $replacedPaths = [];

        try {
            DB::transaction(function () use ($request, $documentRequest, $requirements, $validated, $configuredType, &$details, &$storedPaths, &$replacedPaths) {
                foreach ($requirements as $index => $requirement) {
                    $key = $requirement['key'] ?? $index;
                    $file = $request->file("requirements.{$key}");
                    if (!$file) {
                        continue;
                    }

                    $previousPath = $details['requirements'][$key]['path'] ?? null;
                    $path = $file->store("document-requests/{$request->user()->id}", 'local');
                    $storedPaths[] = $path;
                    if ($previousPath) {
                        $replacedPaths[] = $previousPath;
                    }
                    $details['requirements'][$key] = [
                        'label' => $requirement['label'],
                        'path' => $path,
                        'original_name' => $file->getClientOriginalName(),
                    ];
                }

                $previousStatus = $documentRequest->status;
                $resubmission = [
                    'details' => $details,
                    'fee' => $configuredType
                        ? ($configuredType->fee_mode === 'fixed' ? $configuredType->fee : 0)
                        : self::DOCUMENT_FEES[$documentRequest->document_type],
                    'status' => 'pending',
                    'status_changed_at' => now(),
                ];
                if (Schema::hasColumn('document_requests', 'document_content')) {
                    $resubmission['document_content'] = null;
                }
                if (Schema::hasColumn('document_requests', 'document_generated_at')) {
                    $resubmission['document_generated_at'] = null;
                }
                $documentRequest->update($resubmission);
                DocumentRequestEvent::record(
                    $documentRequest,
                    $request->user(),
                    'request_resubmitted',
                    $previousStatus,
                    'pending',
                );

                ResidentNotification::create([
                    'resident_id' => $request->user()->id,
                    'type' => 'document_request_resubmitted',
                    'title' => 'Document request resubmitted',
                    'message' => "Your corrected {$documentRequest->document_type} request has been sent for verification.",
                ]);
            });
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($storedPaths);
            throw $exception;
        }

        Storage::disk('local')->delete($replacedPaths);

        return response()->json([
            'message' => 'Corrected document request resubmitted for verification.',
            'request' => $documentRequest->fresh(),
        ]);
    }

    public function complaints(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:all,pending,in_progress,resolved,rejected,closed'],
        ]);

        $query = Complaint::where('resident_id', $request->user()->id);

        $status = $validated['status'] ?? 'all';
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $complaints = $query->latest()->paginate(10)->withQueryString();

        $statusCounts = Complaint::where('resident_id', $request->user()->id)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $counts = [];
        foreach (self::COMPLAINT_STATUSES as $complaintStatus) {
            $counts[$complaintStatus] = (int) ($statusCounts[$complaintStatus] ?? 0);
        }
        $counts['all'] = array_sum($counts);

        return response()->json(array_merge($complaints->toArray(), [
            'status_counts' => $counts,
        ]));
    }

    public function storeComplaint(Request $request)
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'incident_date' => ['nullable', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'involved_persons' => ['nullable', 'string', 'max:1000'],
            'relevant_information' => ['nullable', 'string', 'max:5000'],
            'evidence' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);

        $evidencePath = null;
        try {
            $complaint = DB::transaction(function () use ($request, $validated, &$evidencePath) {
                if ($request->hasFile('evidence')) {
                    $evidencePath = $request->file('evidence')->store(
                        "complaints/{$request->user()->id}",
                        'local',
                    );
                }

                $complaint = Complaint::create([
                    ...$validated,
                    'resident_id' => $request->user()->id,
                    'evidence_path' => $evidencePath,
                    'status' => 'pending',
                    'priority' => $this->assessComplaintPriority($validated),
                ]);

                ResidentNotification::create([
                    'resident_id' => $request->user()->id,
                    'type' => 'complaint_submitted',
                    'title' => 'Complaint submitted',
                    'message' => 'Your complaint has been received and is pending review.',
                ]);

                return $complaint;
            });
        } catch (\Throwable $exception) {
            if ($evidencePath) {
                Storage::disk('local')->delete($evidencePath);
            }
            throw $exception;
        }

        return response()->json([
            'message' => 'Complaint submitted.',
            'complaint' => $complaint,
        ], 201);
    }

    private function assessComplaintPriority(array $complaint): string
    {
        $report = mb_strtolower(implode(' ', [
            $complaint['category'] ?? '',
            $complaint['subject'] ?? '',
            $complaint['description'] ?? '',
            $complaint['relevant_information'] ?? '',
        ]));
        $report = preg_replace('/\s+/u', ' ', $report) ?: $report;

        foreach (self::MANUAL_URGENT_KEYWORDS as $keyword) {
            $keyword = mb_strtolower(trim($keyword));
            $pattern = '/(?<![\pL\pN_])'.preg_quote($keyword, '/').'(?![\pL\pN_])/u';
            preg_match_all($pattern, $report, $matches, PREG_OFFSET_CAPTURE);

            foreach ($matches[0] as [$indicator, $offset]) {
                if (!$this->priorityIndicatorIsNegated($report, $offset)) {
                    return 'urgent';
                }
            }
        }

        $urgentPatterns = [
            '/\b(?:violence|violent|fight(?:s|ing)?|fought|brawl(?:s|ed|ing)?|assault(?:s|ed|ing)?|attack(?:s|ed|ing)?|punch(?:es|ed|ing)?|hit(?:s|ting)?|struck|beat(?:s|en|ing)?|kick(?:s|ed|ing)?|slap(?:s|ped|ping)?|stab(?:s|bed|bing)?|chok(?:e|es|ed|ing)|strangl(?:e|es|ed|ing)|push(?:es|ed|ing)|shov(?:e|s|ed|ing)|bit(?:e|es|ten|ing)?|maul(?:s|ed|ing)?|lunged|aggressive|physical\s+(?:altercation|fight|assault|attack))\b/u',
            '/\b(?:injur(?:y|ies|ed)|wound(?:s|ed)?|bleed(?:s|ing)?|blood|unconscious|hospitali[sz](?:e|ed|ation)|fractur(?:e|ed)|broken\s+bones?|(?:someone|somebody|one|person|resident|neighbor|child|adult|i|we|they|he|she)\s+(?:is|was|has been|got|being)\s+hurt|(?:was|is|got|been|being)\s+hurt)\b/u',
            '/\b(?:threat(?:s|en(?:ed|ing|s)?)?|threaten(?:ed|ing|s)?\s+(?:to\s+)?(?:hurt|harm|kill|attack|shoot|stab)|said|warned|texted)\b.{0,45}\b(?:hurt|harm|kill|attack|shoot|stab)\b/u',
            '/\b(?:weapon|gun|firearm|pistol|rifle|knife|knives|blade|machete)\b/u',
            '/\b(?:immediate(?:ly)?\s+(?:danger|dangerous|risk|threat)|currently\s+(?:in\s+danger|unsafe|at\s+risk)|someone\s+(?:is|may be)\s+in\s+danger|life[- ]threatening|dangerous|unsafe|not\s+safe|no\s+longer\s+safe|at\s+risk\s+of\s+(?:harm|injury|attack))\b/u',
            '/\b(?:(?:serious|severe|ongoing|escalating|out of control|still happening|currently happening|happening now)\s+(?:noise|disturbance|disruption|conflict|argument|fight|fighting)|(?:noise|disturbance|conflict|argument|fight|fighting)\s+(?:is\s+)?(?:ongoing|escalating|getting worse|out of control)|ongoing\s+conflict)\b/u',
            '/\b(?:forced\s+entry|break[- ]?in|broke\s+(?:into|in)|breaking\s+in|burglary|armed\s+robbery|robbery|arson|human trafficking|drug trafficking|property\s+damage|serious\s+damage|severe\s+damage|(?:property|home|house|building|vehicle)\s+(?:was\s+)?(?:damaged|smashed|destroyed|burned|set on fire)|(?:smashed|destroyed|broke|burned|set fire to)\b.{0,35}\b(?:window|door|car|vehicle|home|house|property|building))\b/u',
            '/\b(?:gas\s+leak|chemical\s+(?:spill|leak)|toxic\s+(?:spill|smoke|fumes)|exposed\s+(?:live\s+)?wires?|live\s+wires?|downed\s+(?:power\s+)?lines?|building\s+collapse|landslide|sinkhole|major\s+flood(?:ing)?|road\s+(?:has\s+)?collapsed|bridge\s+(?:has\s+)?collapsed|dangerous\s+(?:road|traffic|public)\s+condition)\b/u',
        ];

        foreach ($urgentPatterns as $pattern) {
            preg_match_all($pattern, $report, $matches, PREG_OFFSET_CAPTURE);

            foreach ($matches[0] as [$indicator, $offset]) {
                if (!$this->priorityIndicatorIsNegated($report, $offset)) {
                    return 'urgent';
                }
            }
        }

        return 'normal';
    }

    private function priorityIndicatorIsNegated(string $report, int $offset): bool
    {
        $contextStart = max(0, $offset - 100);
        $context = substr($report, $contextStart, $offset - $contextStart);
        $clauses = preg_split('/[.!?;]|\bbut\b|\bhowever\b/i', $context);
        $clause = trim(end($clauses) ?: '');

        return preg_match(
            '/\b(?:no|not|never|without|neither|none|isn\'t|aren\'t|wasn\'t|weren\'t|didn\'t|doesn\'t|hasn\'t|haven\'t|can\'t|cannot)\b(?:[\s,]+[\w\'-]+){0,4}\s*$/i',
            $clause,
        ) === 1;
    }

    public function downloadComplaintEvidence(Request $request, Complaint $complaint)
    {
        abort_unless($complaint->resident_id === $request->user()->id, 404);
        abort_unless(
            $complaint->evidence_path && Storage::disk('local')->exists($complaint->evidence_path),
            404,
        );

        $disk = Storage::disk('local');
        $path = $complaint->evidence_path;
        $stream = $disk->readStream($path);
        abort_unless(is_resource($stream), 404);
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $filename = 'complaint-evidence-' . $complaint->id . ($extension ? ".{$extension}" : '');
        $mimeType = mime_content_type($disk->path($path)) ?: 'application/octet-stream';

        return response()->streamDownload(function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, $filename, [
            'Cache-Control' => 'private, no-store',
            'Content-Type' => $mimeType,
        ]);
    }

    public function notifications(Request $request)
    {
        return ResidentNotification::where('resident_id', $request->user()->id)->latest()->paginate(15);
    }

    public function updateNotification(Request $request, ResidentNotification $notification)
    {
        abort_unless($notification->resident_id === $request->user()->id, 404);

        $validated = $request->validate(['read' => ['required', 'boolean']]);
        $notification->update(['read_at' => $validated['read'] ? now() : null]);

        return response()->json(['notification' => $notification->fresh()]);
    }

    public function markAllNotificationsRead(Request $request)
    {
        $updated = ResidentNotification::where('resident_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['updated' => $updated]);
    }

    public function destroyNotification(Request $request, ResidentNotification $notification)
    {
        abort_unless($notification->resident_id === $request->user()->id, 404);
        $notification->delete();

        return response()->json(['message' => 'Notification deleted.']);
    }

    public function faqs()
    {
        return ChatbotFaq::where('is_active', true)->orderBy('category')->get();
    }

    public function botMessages(Request $request)
    {
        $messages = ChatbotMessage::where('resident_id', $request->user()->id)
            ->oldest('created_at')
            ->oldest('id')
            ->get()
            ->map(fn(ChatbotMessage $message) => [
                'id' => $message->id,
                'question' => $message->question,
                'sent_at' => $message->created_at?->toISOString(),
                'received_at' => $message->answered_at?->toISOString(),
                'answer' => [
                    'answer' => $message->answer,
                    'matched' => $message->matched,
                    'intent' => $message->intent,
                    'faq' => $message->faq_category
                        ? ['category' => $message->faq_category]
                        : null,
                ],
            ]);

        return response()->json(['data' => $messages]);
    }

    public function askBot(Request $request)
    {
        $validated = $request->validate(['question' => ['required', 'string', 'max:1000']]);
        $normalizedQuestion = $this->normalizeBotText($validated['question']);
        if ($this->isBotGreeting($normalizedQuestion)) {
            $answer = 'Hello! Good day, and welcome to BantayBot. How can I help you with barangay services today?';
            $message = ChatbotMessage::create([
                'resident_id' => $request->user()->id,
                'question' => $validated['question'],
                'answer' => $answer,
                'matched' => true,
                'intent' => 'greeting',
                'answered_at' => now(),
            ]);

            return response()->json([
                'id' => $message->id,
                'sent_at' => $message->created_at?->toISOString(),
                'received_at' => $message->answered_at?->toISOString(),
                'matched' => true,
                'intent' => 'greeting',
                'answer' => $answer,
                'faq' => null,
            ]);
        }

        $faqs = ChatbotFaq::where('is_active', true)->get();
        $faq = $faqs->first(
            fn(ChatbotFaq $candidate) => $this->normalizeBotText($candidate->question) === $normalizedQuestion,
        );

        if (!$faq) {
            $queryTerms = $this->botSearchTerms($normalizedQuestion);
            if (count($queryTerms) > 1) {
                $match = $faqs->map(function (ChatbotFaq $candidate) use ($queryTerms) {
                    $candidateTerms = $this->botSearchTerms(implode(' ', [
                        $candidate->category,
                        $candidate->question,
                        implode(' ', $candidate->keywords ?? []),
                    ]));
                    $overlap = count(array_intersect($queryTerms, $candidateTerms));

                    return ['faq' => $candidate, 'score' => $overlap / count($queryTerms)];
                })->sortByDesc('score')->first();

                if ($match && $match['score'] >= 0.5) {
                    $faq = $match['faq'];
                }
            }
        }

        $matched = (bool) $faq;
        $answer = $faq?->answer ?? 'I do not have a confident answer for that question. You can rephrase it or escalate it to barangay staff for follow-up.';
        $message = ChatbotMessage::create([
            'resident_id' => $request->user()->id,
            'faq_id' => $faq?->id,
            'question' => $validated['question'],
            'answer' => $answer,
            'faq_category' => $faq?->category,
            'matched' => $matched,
            'answered_at' => now(),
        ]);

        return response()->json([
            'id' => $message->id,
            'sent_at' => $message->created_at?->toISOString(),
            'received_at' => $message->answered_at?->toISOString(),
            'matched' => $matched,
            'answer' => $answer,
            'faq' => $faq,
        ]);
    }

    public function escalateBot(Request $request)
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:1000'],
            'category' => ['nullable', 'string', 'max:100'],
        ]);

        $escalation = DB::transaction(function () use ($request, $validated) {
            $escalation = ChatbotEscalation::create([
                'resident_id' => $request->user()->id,
                'question' => $validated['question'],
                'faq_category' => $validated['category'] ?? null,
                'status' => 'pending',
            ]);
            $reference = 'BOT-' . str_pad((string) $escalation->id, 5, '0', STR_PAD_LEFT);

            ResidentNotification::create([
                'resident_id' => $request->user()->id,
                'type' => 'bantaybot_escalation_received',
                'title' => 'Question sent for follow-up',
                'message' => "Your BantayBot question was recorded as {$reference} for barangay follow-up.",
            ]);

            return $escalation;
        });

        return response()->json([
            'message' => 'Your question was recorded for barangay follow-up.',
            'reference' => 'BOT-' . str_pad((string) $escalation->id, 5, '0', STR_PAD_LEFT),
            'escalation' => $escalation,
        ], 201);
    }

    public function botEscalations(Request $request)
    {
        return ChatbotEscalation::where('resident_id', $request->user()->id)
            ->latest()
            ->paginate(10);
    }

    public function adminBotEscalations()
    {
        return ChatbotEscalation::with('resident:id,name,email')
            ->latest()
            ->paginate(20);
    }

    public function adminBotFaqs()
    {
        return response()->json([
            'data' => ChatbotFaq::orderBy('category')->orderBy('question')->get(),
        ]);
    }

    public function adminBotStats()
    {
        return response()->json([
            'questions' => ChatbotFaq::count(),
            'categories' => ChatbotFaq::distinct('category')->count('category'),
            'escalations' => ChatbotEscalation::count(),
            'pending' => ChatbotEscalation::where('status', 'pending')->count(),
            'replied' => ChatbotEscalation::where('status', 'replied')->count(),
            'questions_by_category' => ChatbotFaq::selectRaw('category, COUNT(*) as count')
                ->groupBy('category')
                ->orderBy('category')
                ->get(),
        ]);
    }

    public function storeBotFaq(Request $request)
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:100'],
            'question' => ['required', 'string', 'max:255'],
            'answer' => ['required', 'string', 'max:5000'],
        ]);

        $faq = ChatbotFaq::create($validated + ['is_active' => true]);

        return response()->json([
            'message' => 'Chatbot question added.',
            'faq' => $faq,
        ], 201);
    }

    public function updateBotFaq(Request $request, ChatbotFaq $chatbotFaq)
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:100'],
            'question' => ['required', 'string', 'max:255'],
            'answer' => ['required', 'string', 'max:5000'],
        ]);

        $chatbotFaq->update($validated);

        return response()->json([
            'message' => 'Chatbot question updated.',
            'faq' => $chatbotFaq->fresh(),
        ]);
    }

    public function destroyBotFaq(ChatbotFaq $chatbotFaq)
    {
        $chatbotFaq->delete();

        return response()->json(['message' => 'Chatbot question deleted.']);
    }

    public function replyToBotEscalation(Request $request, ChatbotEscalation $chatbotEscalation)
    {
        $validated = $request->validate([
            'staff_reply' => ['required', 'string', 'max:5000'],
        ]);

        abort_unless($chatbotEscalation->status === 'pending', 409);

        DB::transaction(function () use ($request, $validated, $chatbotEscalation) {
            $chatbotEscalation->update([
                'staff_reply' => $validated['staff_reply'],
                'status' => 'replied',
                'replied_at' => now(),
            ]);

            $reference = 'BOT-' . str_pad((string) $chatbotEscalation->id, 5, '0', STR_PAD_LEFT);
            ResidentNotification::create([
                'resident_id' => $chatbotEscalation->resident_id,
                'type' => 'bantaybot_escalation_replied',
                'title' => 'Barangay staff replied to your question',
                'message' => "A staff reply is available for {$reference} in BantayBot.",
            ]);
        });

        return response()->json([
            'message' => 'Reply sent to the resident.',
            'escalation' => $chatbotEscalation->fresh(),
        ]);
    }

    private function normalizeBotText(string $text): string
    {
        $text = strtolower($text);
        $text = preg_replace('/[^a-z0-9\s]/', ' ', $text) ?? $text;

        return trim(preg_replace('/\s+/', ' ', $text) ?? $text);
    }

    private function isBotGreeting(string $normalizedQuestion): bool
    {
        $greetings = [
            'hi',
            'hello',
            'hey',
            'good morning',
            'good afternoon',
            'good evening',
            'good day',
            'greetings',
            'kamusta',
            'kumusta',
            'magandang umaga',
            'magandang hapon',
            'magandang gabi',
            'maayong buntag',
            'maayong hapon',
            'maayong gabii',
            'how are you',
            'how are you doing',
        ];

        $greeting = preg_replace(
            '/(?:\s+(?:po|bantaybot|there|and how are you(?: doing)?|how are you(?: doing)?))+$/',
            '',
            $normalizedQuestion,
        ) ?? $normalizedQuestion;

        return in_array($greeting, $greetings, true);
    }

    private function configuredDocumentRules(
        array $applicantFields,
        array $documentFields,
        array $requirements,
        bool $correction,
        array $existingRequirements = [],
        array $formValues = [],
    ): array {
        $fields = array_merge(
            array_values(array_filter($applicantFields, fn (array $field) => ($field['enabled'] ?? true))),
            array_values(array_filter($documentFields, fn (array $field) => ($field['enabled'] ?? true))),
        );
        $requirements = array_values(array_filter(
            $requirements,
            fn (array $requirement) => ($requirement['enabled'] ?? true),
        ));
        $keys = array_column($fields, 'key');
        $rules = [
            'form_fields' => ['present', 'array'],
            'requirements' => ['sometimes', 'array'],
        ];
        if ($keys) {
            $rules['form_fields'][] = 'array:' . implode(',', $keys);
        }
        $requirementKeys = array_column($requirements, 'key');
        if ($requirementKeys) {
            $rules['requirements'][] = 'array:' . implode(',', $requirementKeys);
        }

        foreach ($fields as $field) {
            $key = $field['key'];
            $requiredWhen = $field['requiredWhen'] ?? null;
            $showWhen = $field['showWhen'] ?? null;
            $isVisible = !$showWhen || $this->conditionMatches($showWhen, $formValues);
            if (!$isVisible) {
                $rules["form_fields.{$key}"] = ['prohibited'];
                continue;
            }
            $isRequired = $requiredWhen
                ? $this->conditionMatches($requiredWhen, $formValues)
                : ($field['required'] ?? true);
            $isRequired = $isRequired && $isVisible;
            $required = $isRequired ? 'required' : 'sometimes';
            $fieldRules = [$required];
            if (!$isRequired) {
                $fieldRules[] = 'nullable';
            }
            switch ($field['type']) {
                case 'number':
                    $fieldRules[] = (float) ($field['step'] ?? 0) === 1.0 ? 'integer' : 'numeric';
                    if (isset($field['min'])) {
                        $fieldRules[] = 'min:'.$field['min'];
                    }
                    if (isset($field['max'])) {
                        $fieldRules[] = 'max:'.$field['max'];
                    }
                    break;
                case 'date':
                    $fieldRules[] = 'date';
                    if ($key === 'date_of_birth') {
                        $fieldRules[] = 'before_or_equal:today';
                    }
                    break;
                case 'email':
                    $fieldRules[] = 'email';
                    $fieldRules[] = 'max:255';
                    break;
                case 'select':
                    $supportsCustomPurpose = $key === 'purpose'
                        && in_array('Other', $field['options'] ?? [], true)
                        && collect($fields)->contains('key', 'purpose_other');
                    if ($supportsCustomPurpose) {
                        $fieldRules[] = 'string';
                        $fieldRules[] = 'max:255';
                    } else {
                        $fieldRules[] = Rule::in($field['options'] ?? []);
                    }
                    break;
                default:
                    $fieldRules[] = 'string';
                    $fieldRules[] = 'max:'.($field['maxLength'] ?? 2000);
                    break;
            }
            $rules["form_fields.{$key}"] = $fieldRules;
        }

        foreach ($requirements as $requirement) {
            $key = $requirement['key'];
            $isVisible = !isset($requirement['showWhen'])
                || $this->conditionMatches($requirement['showWhen'], $formValues);
            $isConditionallyRequired = isset($requirement['requiredWhen'])
                && $this->conditionMatches($requirement['requiredWhen'], $formValues);
            if (!$isVisible) {
                $rules["requirements.{$key}"] = ['prohibited'];
                continue;
            }
            $rules["requirements.{$key}"] = [
                (($requirement['required'] ?? false) || $isConditionallyRequired)
                    && (!$correction || empty($existingRequirements[$key]['path']))
                    ? 'required'
                    : 'sometimes',
                'file',
                ...($key === 'applicant_photo'
                    ? ['image', 'mimes:jpg,jpeg,png']
                    : ['mimes:pdf,jpg,jpeg,png']),
                'max:5120',
            ];
        }

        return $rules;
    }

    private function conditionMatches(array $condition, array $values): bool
    {
        $expected = $condition['value'] ?? null;
        $actual = $values[$condition['key'] ?? ''] ?? null;

        return is_array($expected)
            ? in_array($actual, $expected, true)
            : $actual === $expected;
    }

    private function hasField(DocumentType $documentType, string $key): bool
    {
        return collect($documentType->applicant_fields ?? [])
            ->merge($documentType->fields ?? [])
            ->contains(fn (array $field) => $field['key'] === $key && ($field['enabled'] ?? true));
    }

    private function botSearchTerms(string $text): array
    {
        $stopWords = ['a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'how', 'i', 'if', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'who', 'why', 'will', 'with'];

        return array_values(array_filter(
            array_unique(explode(' ', $this->normalizeBotText($text))),
            fn(string $term) => strlen($term) > 2 && !in_array($term, $stopWords, true),
        ));
    }

    public function storeFeedback(Request $request)
    {
        $validated = $request->validate([
            'service_type' => ['required', 'string', 'max:100'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        return response()->json([
            'message' => 'Thank you for your feedback.',
            'feedback' => Feedback::create([
                ...$validated,
                'resident_id' => $request->user()->id,
            ]),
        ], 201);
    }

    public function updateProfile(Request $request)
    {
        $validated = $request->validate([
            'address' => ['nullable', 'string', 'max:255'],
            'mobile_number' => ['required', 'regex:/^09\d{9}$/'],
        ]);

        $request->user()->update($validated);

        return response()->json(['message' => 'Profile updated.', 'user' => $request->user()->fresh()]);
    }
}
