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
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ResidentController extends Controller
{
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
            'date_of_birth',
            'age',
            'sex',
            'civil_status',
            'citizenship',
            'address',
            'purok',
        ],
        'Barangay Residency' => [
            'full_name',
            'address',
            'purok',
            'date_of_birth',
            'age',
            'sex',
            'civil_status',
        ],
        'Barangay Indigency' => [
            'full_name',
            'date_of_birth',
            'sex',
            'civil_status',
            'purok',
            'contact_number',
        ],
        'Business Permit' => ['full_name', 'contact_number', 'email_address'],
    ];

    private const DOCUMENT_FORM_FIELDS = [
        'Barangay Certification' => [
            'purpose' => ['required', 'string', 'max:255'],
        ],
        'Barangay Residency' => [
            'years_of_residency' => ['required', 'integer', 'min:0', 'max:150'],
            'months_of_residency' => ['sometimes', 'integer', 'min:0', 'max:11'],
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

    public function storeRequest(Request $request)
    {
        $documentType = $request->input('document_type');
        $configuredType = DocumentType::where('value', $documentType)->where('active', true)->first();
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
            $applicantFields = $configuredType->applicant_fields ?? [];
            $documentFields = $configuredType->fields ?? [];
            $requirements = $configuredType->requirements ?? [];
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
        if ($configuredType && $this->hasField($configuredType, 'age') && $this->hasField($configuredType, 'date_of_birth')) {
            $validated['form_fields']['age'] = Carbon::parse($validated['form_fields']['date_of_birth'])->age;
        } elseif (in_array($validated['document_type'], ['Barangay Certification', 'Barangay Residency'], true)) {
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

        try {
            $documentRequest = DB::transaction(function () use ($request, $validated, $requirements, $userId, $fee, $configuredType, &$storedPaths) {
                if ($configuredType?->one_time) {
                    \App\Models\Resident::whereKey($userId)->lockForUpdate()->firstOrFail();
                    abort_if(
                        DocumentRequest::where('resident_id', $userId)
                            ->where('document_type', $validated['document_type'])
                            ->where('status', '!=', 'rejected')
                            ->exists(),
                        409,
                        'This one-time certificate has already been requested or issued.',
                    );
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
        $configuredType = DocumentType::where('value', $documentType)->first();
        $applicantFields = $configuredType
            ? array_column($configuredType->applicant_fields ?? [], 'key')
            : self::DOCUMENT_APPLICANT_FIELDS[$documentType];
        $documentFields = $configuredType
            ? array_column($configuredType->fields ?? [], 'key')
            : self::DOCUMENT_FORM_FIELDS[$documentType];
        $requirements = $configuredType
            ? ($configuredType->requirements ?? [])
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
                array_column($configuredType->applicant_fields ?? [], 'key'),
                array_column($configuredType->fields ?? [], 'key'),
            );
            $rules['form_fields'] = ['required', 'array:' . implode(',', $allFieldKeys)];
            $rules = array_merge($rules, $this->configuredDocumentRules(
                $configuredType->applicant_fields ?? [],
                $configuredType->fields ?? [],
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
        if (($configuredType && $this->hasField($configuredType, 'age') && $this->hasField($configuredType, 'date_of_birth'))
            || in_array($documentType, ['Barangay Certification', 'Barangay Residency'], true)) {
            $validated['form_fields']['age'] = Carbon::parse($validated['form_fields']['date_of_birth'])->age;
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
        return Complaint::where('resident_id', $request->user()->id)->latest()->paginate(10);
    }

    public function storeComplaint(Request $request)
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'incident_date' => ['nullable', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
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
        $report = strtolower(implode(' ', [
            $complaint['category'] ?? '',
            $complaint['subject'] ?? '',
            $complaint['description'] ?? '',
            $complaint['relevant_information'] ?? '',
        ]));

        foreach (
            [
                'happening now',
                'still happening',
                'currently happening',
                'ongoing disturbance',
                'serious disturbance',
                'ongoing conflict',
                'escalating neighbor conflict',
                'escalating',
                'immediate danger',
                'immediate attention',
                'physical assault',
                'ongoing fight',
                'person injured',
                'being threatened',
                'threatened me',
                'weapon',
                'violent',
                'violence',
            ] as $urgentSignal
        ) {
            if (str_contains($report, $urgentSignal)) {
                return 'urgent';
            }
        }

        return 'normal';
    }

    public function downloadComplaintEvidence(Request $request, Complaint $complaint)
    {
        abort_unless($complaint->resident_id === $request->user()->id, 404);
        abort_unless(
            $complaint->evidence_path && Storage::disk('local')->exists($complaint->evidence_path),
            404,
        );

        $extension = pathinfo($complaint->evidence_path, PATHINFO_EXTENSION);
        $filename = 'complaint-evidence-' . $complaint->id . ($extension ? ".{$extension}" : '');

        return Storage::disk('local')->download($complaint->evidence_path, $filename);
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
        $fields = array_merge($applicantFields, $documentFields);
        $keys = array_column($fields, 'key');
        $rules = [
            'form_fields' => ['required', 'array:' . implode(',', $keys)],
            'requirements' => ['sometimes', 'array:' . implode(',', array_column($requirements, 'key'))],
        ];

        foreach ($fields as $field) {
            $key = $field['key'];
            $requiredWhen = $field['requiredWhen'] ?? null;
            $showWhen = $field['showWhen'] ?? null;
            $isVisible = !$showWhen || $this->conditionMatches($showWhen, $formValues);
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
                    $fieldRules[] = 'numeric';
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
            $isConditionallyRequired = isset($requirement['requiredWhen'])
                && $this->conditionMatches($requirement['requiredWhen'], $formValues);
            $rules["requirements.{$key}"] = [
                (($requirement['required'] ?? false) || $isConditionallyRequired)
                    && (!$correction || empty($existingRequirements[$key]['path']))
                    ? 'required'
                    : 'sometimes',
                'file',
                'mimes:pdf,jpg,jpeg,png',
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
            ->contains('key', $key);
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
