<?php

namespace App\Http\Controllers;

use App\Models\ChatbotFaq;
use App\Models\ChatbotEscalation;
use App\Models\Complaint;
use App\Models\DocumentRequest;
use App\Models\Feedback;
use App\Models\ResidentNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ResidentController extends Controller
{
    private const DOCUMENT_REQUIREMENTS = [
        'Barangay Certification' => [
            'valid_id' => ['label' => 'Valid government-issued ID', 'required' => true],
        ],
        'Barangay Residency' => [
            'valid_id' => ['label' => 'Valid ID showing your address', 'required' => false],
            'proof_of_residency' => ['label' => 'Other supporting proof', 'required' => false],
        ],
        'Barangay Indigency' => [
            'valid_id' => ['label' => 'Valid government-issued ID', 'required' => true],
        ],
        'Construction Permit' => [
            'valid_id' => ['label' => 'Valid ID', 'required' => true],
            'proof_of_ownership' => ['label' => 'Proof of ownership', 'required' => false],
            'title_or_tax_declaration' => ['label' => 'TCT/OCT or Tax Declaration', 'required' => false],
            'lease_or_authorization' => [
                'label' => 'Lease or owner authorization',
                'required' => false,
                'required_if' => 'required_if:form_fields.property_ownership,Authorized Representative',
            ],
            'architectural_plans' => ['label' => 'Building/architectural plans', 'required' => false],
            'structural_plans' => ['label' => 'Structural plans', 'required' => false],
            'electrical_plans' => ['label' => 'Electrical plans', 'required' => false],
            'plumbing_plans' => ['label' => 'Plumbing/sanitary plans', 'required' => false],
            'other_plans' => ['label' => 'Other plans required by the Building Official', 'required' => false],
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
        'sex' => ['required', 'string', 'max:50'],
        'civil_status' => ['required', 'in:Single,Married,Widowed,Separated,Other'],
        'purok' => ['required', 'string', 'max:100'],
        'contact_number' => ['required', 'string', 'max:30'],
        'email_address' => ['required', 'email', 'max:255'],
        'municipality_city' => ['required', 'string', 'max:100'],
        'province' => ['required', 'string', 'max:100'],
    ];

    private const DOCUMENT_APPLICANT_FIELDS = [
        'Barangay Certification' => [
            'full_name',
            'date_of_birth',
            'sex',
            'civil_status',
            'purok',
            'contact_number',
            'email_address',
        ],
        'Barangay Residency' => [
            'full_name',
            'date_of_birth',
            'sex',
            'civil_status',
            'purok',
            'municipality_city',
            'province',
        ],
        'Barangay Indigency' => [
            'full_name',
            'date_of_birth',
            'sex',
            'civil_status',
            'purok',
            'contact_number',
        ],
        'Construction Permit' => ['full_name', 'contact_number', 'email_address'],
        'Business Permit' => ['full_name', 'contact_number', 'email_address'],
    ];

    private const DOCUMENT_FORM_FIELDS = [
        'Barangay Certification' => [
            'purpose' => ['required', 'in:Employment,School Requirement,Financial Assistance,Legal Requirement,Scholarship,Loan/Application,Other'],
            'additional_details' => ['nullable', 'required_if:form_fields.purpose,Other', 'string', 'max:2000'],
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
        'Construction Permit' => [
            'valid_id_type' => ['required', 'string', 'max:100'],
            'valid_id_number' => ['required', 'string', 'max:100'],
            'property_owner_name' => ['required', 'string', 'max:255'],
            'property_street_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'property_purok' => ['required', 'string', 'max:100'],
            'lot_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'tax_declaration_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'title_number' => ['sometimes', 'nullable', 'string', 'max:100'],
            'property_ownership' => ['required', 'in:Owner,Authorized Representative'],
            'construction_type' => ['required', 'in:New construction,Renovation,Repair,Extension,Fencing'],
            'structure_type' => ['required', 'in:Residential,Commercial,Other'],
            'structure_details' => ['nullable', 'required_if:form_fields.structure_type,Other', 'string', 'max:255'],
            'number_of_floors' => ['required', 'integer', 'min:1', 'max:200'],
            'estimated_project_cost' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'proposed_construction_date' => ['required', 'date'],
            'project_description' => ['required', 'string', 'max:2000'],
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
        return DocumentRequest::where('resident_id', $request->user()->id)->latest()->paginate(10);
    }

    public function storeRequest(Request $request)
    {
        $documentType = $request->input('document_type');
        $rules = [
            'document_type' => ['required', Rule::in(array_keys(self::DOCUMENT_REQUIREMENTS))],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];

        if (isset(self::DOCUMENT_REQUIREMENTS[$documentType])) {
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
        $requirements = self::DOCUMENT_REQUIREMENTS[$validated['document_type']];
        $storedPaths = [];
        $userId = $request->user()->id;

        try {
            $documentRequest = DB::transaction(function () use ($request, $validated, $requirements, $userId, &$storedPaths) {
                $uploadedRequirements = [];

                foreach ($requirements as $key => $requirement) {
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
                    ],
                    'status' => 'pending',
                ]);

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
        $applicantFields = self::DOCUMENT_APPLICANT_FIELDS[$documentType];
        $documentFields = self::DOCUMENT_FORM_FIELDS[$documentType];
        $requirements = self::DOCUMENT_REQUIREMENTS[$documentType];
        $existingRequirements = $documentRequest->details['requirements'] ?? [];
        $allFieldKeys = array_merge($applicantFields, array_keys($documentFields));
        $rules = [
            'form_fields' => ['required', 'array:' . implode(',', $allFieldKeys)],
            'notes' => ['nullable', 'string', 'max:2000'],
            'requirements' => ['sometimes', 'array:' . implode(',', array_keys($requirements))],
        ];

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

        $validated = $request->validate($rules);
        $details = $documentRequest->details ?? [];
        $details['form_fields'] = $validated['form_fields'];
        if (array_key_exists('notes', $validated)) {
            $details['notes'] = $validated['notes'];
        } else {
            $details['notes'] ??= null;
        }
        $storedPaths = [];
        $replacedPaths = [];

        try {
            DB::transaction(function () use ($request, $documentRequest, $requirements, $validated, &$details, &$storedPaths, &$replacedPaths) {
                foreach ($requirements as $key => $requirement) {
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

                $documentRequest->update([
                    'details' => $details,
                    'status' => 'pending',
                ]);

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

    public function askBot(Request $request)
    {
        $validated = $request->validate(['question' => ['required', 'string', 'max:1000']]);
        $normalizedQuestion = $this->normalizeBotText($validated['question']);
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

        return response()->json([
            'matched' => (bool) $faq,
            'answer' => $faq?->answer ?? 'I do not have a confident answer for that question. You can rephrase it or escalate it to barangay staff for follow-up.',
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
        return ChatbotEscalation::latest()->paginate(20);
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
