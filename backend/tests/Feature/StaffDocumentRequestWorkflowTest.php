<?php

namespace Tests\Feature;

use App\Models\BarangayRegistry;
use App\Models\Complaint;
use App\Models\DocumentRequest;
use App\Models\DocumentRequestEvent;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffDocumentRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Staff $documentOfficer;

    private Staff $complaintOfficer;

    private Resident $resident;

    private DocumentRequest $request;

    protected function setUp(): void
    {
        parent::setUp();

        $this->documentOfficer = Staff::factory()->create([
            'name' => 'Document Officer',
            'email' => 'document-officer@example.com',
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
            'is_active' => true,
        ]);
        $this->complaintOfficer = Staff::factory()->create([
            'name' => 'Complaint Officer',
            'email' => 'complaint-officer@example.com',
            'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
            'is_active' => true,
        ]);
        $this->resident = Resident::factory()->create([
            'name' => 'Resident User',
            'email' => 'resident@example.com',
        ]);
        $this->request = DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'document_type' => 'Barangay Certification',
            'status' => 'pending',
            'details' => ['notes' => 'Employment proof'],
        ]);
    }

    public function test_admin_cannot_view_staff_document_requests(): void
    {
        $admin = \App\Models\Admin::create([
            'name' => 'Test Admin',
            'email' => 'admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/staff/document-requests')->assertForbidden();
    }

    public function test_document_officer_can_view_and_process_document_requests(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->getJson('/api/staff/document-requests')
            ->assertOk()
            ->assertJsonPath('data.0.id', $this->request->id);

        $this->getJson('/api/staff/document-requests/'.$this->request->id)
            ->assertOk()
            ->assertJsonPath('data.id', $this->request->id);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'under_review',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'under_review');

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'processing',
            'staff_remarks' => 'Requirements are complete.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'processing');

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'processing',
            'staff_remarks' => 'Requirements are complete.',
            'assigned_staff_id' => $this->documentOfficer->id,
        ]);
        $this->assertDatabaseHas('document_request_events', [
            'document_request_id' => $this->request->id,
            'actor_id' => $this->documentOfficer->id,
            'actor_role' => 'staff',
            'action' => 'status_changed',
            'from_status' => 'under_review',
            'to_status' => 'processing',
        ]);
    }

    public function test_job_seeker_request_uses_the_same_identity_verification_as_barangay_certificate(): void
    {
        $this->resident->update([
            'name' => 'Jane A Doe',
            'first_name' => 'Jane',
            'middle_name' => 'A',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-15',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'address' => '123 Main Street',
            'mobile_number' => '09171234567',
        ]);
        $fields = [
            'full_name' => 'Jane A Doe',
            'date_of_birth' => '1990-01-15',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'address' => '123 Main Street',
        ];
        BarangayRegistry::create([
            'first_name' => ' Jane ',
            'middle_name' => 'A',
            'last_name' => ' Doe ',
            'date_of_birth' => '1990-01-15',
            'sex' => 'Female',
            'purok' => ' Purok 1 ',
            'address' => '123 Main Street',
            'mobile_number' => '09171234567',
        ]);
        $this->request->update([
            'document_type' => 'Barangay Certificate',
            'details' => ['form_fields' => $fields],
        ]);
        DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'document_type' => 'First-Time Jobseeker Certification',
            'status' => 'pending',
            'details' => ['form_fields' => $fields],
        ]);
        $this->documentOfficer->update(['is_active' => true]);
        Sanctum::actingAs($this->documentOfficer);

        $requests = collect(
            $this->getJson('/api/staff/document-requests')
                ->assertOk()
                ->json('data'),
        )->keyBy('document_type');

        $certificateReview = $requests['Barangay Certificate']['identity_review'];
        $jobSeekerReview = $requests['First-Time Jobseeker Certification']['identity_review'];

        $this->assertTrue($certificateReview['ok']);
        $this->assertSame($certificateReview, $jobSeekerReview);
    }

    public function test_job_seeker_identity_review_shows_differences_for_a_unique_registry_match(): void
    {
        $this->resident->update([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-15',
            'sex' => 'Female',
            'purok' => 'Purok 1',
        ]);
        BarangayRegistry::create([
            'first_name' => 'Janet',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-15',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'mobile_number' => '09171234567',
        ]);
        $this->request->update([
            'document_type' => 'First-Time Jobseeker Certification',
            'details' => [
                'form_fields' => [
                    'full_name' => 'Jane Doe',
                    'sex' => 'Female',
                    'purok' => 'Purok 1',
                ],
            ],
        ]);
        $this->documentOfficer->update(['is_active' => true]);
        Sanctum::actingAs($this->documentOfficer);

        $review = $this->getJson('/api/staff/document-requests')
            ->assertOk()
            ->json('data.0.identity_review');

        $this->assertTrue($review['registry_found']);
        $this->assertFalse($review['ok']);
        $this->assertFalse(collect($review['fields'])->firstWhere('key', 'full_name')['ok']);
    }

    public function test_job_seeker_identity_lookup_can_match_the_submitted_name_to_the_registry(): void
    {
        $this->resident->update([
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'date_of_birth' => '1990-01-15',
            'sex' => 'Female',
            'purok' => 'Purok 1',
        ]);
        BarangayRegistry::create([
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'date_of_birth' => '1990-01-15',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'mobile_number' => '09171234567',
        ]);
        $this->request->update([
            'document_type' => 'First-Time Jobseeker Certification',
            'details' => [
                'form_fields' => [
                    'full_name' => 'Jane Doe',
                    'date_of_birth' => '1990-01-15',
                    'sex' => 'Female',
                    'purok' => 'Purok 1',
                ],
            ],
        ]);
        $this->documentOfficer->update(['is_active' => true]);
        Sanctum::actingAs($this->documentOfficer);

        $review = $this->getJson('/api/staff/document-requests')
            ->assertOk()
            ->json('data.0.identity_review');

        $this->assertTrue($review['registry_found']);
        $this->assertFalse($review['ok']);
        $this->assertSame(
            'Jane Doe',
            collect($review['fields'])->firstWhere('key', 'full_name')['registry'],
        );
    }

    public function test_job_seeker_identity_confirms_when_only_the_registry_has_a_middle_name(): void
    {
        $this->resident->update([
            'name' => 'Jamaica Sohon',
            'first_name' => 'Jamaica',
            'middle_name' => null,
            'last_name' => 'Sohon',
            'date_of_birth' => '2005-08-03',
            'sex' => 'Female',
            'purok' => 'Sunflower',
            'address' => null,
        ]);
        BarangayRegistry::create([
            'first_name' => 'Jamaica',
            'middle_name' => 'Montillen',
            'last_name' => 'Sohon',
            'date_of_birth' => '2005-08-03',
            'sex' => 'Female',
            'purok' => 'Sunflower',
            'address' => 'Pamela Street',
            'mobile_number' => '09171234567',
        ]);
        $this->request->update([
            'document_type' => 'First-Time Jobseeker Certification',
            'details' => [
                'form_fields' => [
                    'full_name' => 'Jamaica Sohon',
                    'purok' => 'Sunflower',
                    'age' => \Carbon\Carbon::parse('2005-08-03')->age,
                ],
            ],
        ]);
        $this->documentOfficer->update(['is_active' => true]);
        Sanctum::actingAs($this->documentOfficer);

        $review = $this->getJson('/api/staff/document-requests')
            ->assertOk()
            ->json('data.0.identity_review');

        $this->assertTrue($review['registry_found']);
        $this->assertTrue($review['ok']);
        $this->assertSame(
            'Jamaica Montillen Sohon',
            collect($review['fields'])->firstWhere('key', 'full_name')['registry'],
        );
        $this->assertTrue(collect($review['fields'])->firstWhere('key', 'full_name')['ok']);
    }

    public function test_document_officer_can_generate_a_preview_for_a_document_request(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->request->update(['status' => 'processing']);

        $this->postJson('/api/staff/document-requests/'.$this->request->id.'/generate', [
            'document_content' => [
                'title' => 'Barangay Residency',
                'resident_name' => 'Resident User',
                'date_of_birth' => '1990-01-15',
                'derogatory_status' => 'no_derogatory_record',
            ],
            'staff_remarks' => 'Preview created for review.',
        ])->assertOk()
            ->assertJsonPath('data.id', $this->request->id)
            ->assertJsonPath('data.document_content.title', 'Barangay Residency');

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'processing',
        ]);
        $this->assertDatabaseHas('notifications', [
            'resident_id' => $this->resident->id,
            'type' => 'document_request_staff_remarks',
            'title' => 'Barangay staff has left a note',
        ]);
        $this->assertNotNull($this->request->fresh()->document_generated_at);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
            'staff_remarks' => 'Document reviewed, signed, and sealed.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'ready_for_release');
    }

    public function test_clearance_preview_defaults_to_pending_and_cannot_be_released_without_a_confirmed_record_check(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $this->request->update(['status' => 'processing']);

        $this->postJson('/api/staff/document-requests/'.$this->request->id.'/generate', [
            'document_content' => ['date_of_birth' => '1990-01-15'],
        ])->assertOk()
            ->assertJsonPath('data.document_content.derogatory_status', 'pending_verification');

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
        ])->assertStatus(409)
            ->assertJsonPath('message', 'This Barangay Clearance is not eligible for release while its record-check outcome is pending verification or referred for authorized review. Confirm NO DEROGATORY RECORD ON FILE only when the record check supports that result.');
    }

    public function test_pending_or_in_progress_complaints_keep_clearance_record_check_pending(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $this->request->update(['status' => 'processing']);
        Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Road and Public',
            'subject' => 'Unresolved concern',
            'description' => 'This complaint is still being reviewed.',
            'status' => 'in_progress',
        ]);

        $this->postJson('/api/staff/document-requests/'.$this->request->id.'/generate', [
            'document_content' => [
                'date_of_birth' => '1990-01-15',
                'derogatory_status' => 'no_derogatory_record',
            ],
        ])->assertStatus(409)
            ->assertJsonPath('message', 'A pending or in-progress complaint requires PENDING VERIFICATION. A complaint alone is not a finding of wrongdoing.');

        $this->postJson('/api/staff/document-requests/'.$this->request->id.'/generate', [
            'document_content' => [
                'date_of_birth' => '1990-01-15',
                'derogatory_status' => 'pending_verification',
            ],
        ])->assertOk()
            ->assertJsonPath('data.document_content.derogatory_status', 'pending_verification');
    }

    public function test_resolved_complaint_is_not_automatically_treated_as_an_adverse_finding(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $this->request->update(['status' => 'processing']);
        Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Road and Public',
            'subject' => 'Resolved concern',
            'description' => 'The complaint was reviewed and resolved.',
            'status' => 'resolved',
            'resolution_details' => 'No adverse finding.',
        ]);

        $this->postJson('/api/staff/document-requests/'.$this->request->id.'/generate', [
            'document_content' => [
                'date_of_birth' => '1990-01-15',
                'derogatory_status' => 'no_derogatory_record',
            ],
        ])->assertOk()
            ->assertJsonPath('data.document_content.derogatory_status', 'no_derogatory_record')
            ->assertJsonMissingPath('data.document_content.record_check_reviewed_by');

        $recordCheckEvent = DocumentRequestEvent::where('document_request_id', $this->request->id)
            ->latest('id')
            ->firstOrFail();
        $this->assertSame($this->documentOfficer->id, $recordCheckEvent->actor_id);
        $this->assertSame('no_derogatory_record', $recordCheckEvent->metadata['record_check_outcome']);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
        ])->assertOk()
            ->assertJsonPath('data.status', 'ready_for_release');
    }

    public function test_clearance_referred_for_authorized_review_cannot_be_released(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $this->request->update(['status' => 'processing']);

        $this->postJson('/api/staff/document-requests/'.$this->request->id.'/generate', [
            'document_content' => [
                'date_of_birth' => '1990-01-15',
                'derogatory_status' => 'refer_authorized_review',
            ],
        ])->assertOk()
            ->assertJsonPath('data.document_content.derogatory_status', 'refer_authorized_review');

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
        ])->assertStatus(409);
    }

    public function test_residency_preview_includes_request_details_and_recalculates_age_from_birth_date(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $residencyRequest = DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'document_type' => 'Barangay Residency',
            'status' => 'processing',
            'details' => [
                'form_fields' => [
                    'full_name' => 'Resident User',
                    'address' => '123 Main Street',
                    'purok' => 'Purok 1',
                    'date_of_birth' => '1990-01-15',
                    'age' => 1,
                    'sex' => 'Female',
                    'civil_status' => 'Single',
                    'years_of_residency' => 5,
                    'purpose' => 'Employment',
                ],
                'requirements' => [],
            ],
        ]);

        $this->postJson('/api/staff/document-requests/'.$residencyRequest->id.'/generate', [
            'document_content' => [
                'full_name' => 'Resident User',
                'address' => '123 Main Street',
                'purok' => 'Purok 1',
                'date_of_birth' => '1990-01-15',
                'age' => 1,
                'sex' => 'Female',
                'civil_status' => 'Single',
                'years_of_residency' => 5,
                'purpose' => 'Employment',
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.document_content.address', '123 Main Street')
            ->assertJsonPath('data.document_content.purok', 'Purok 1')
            ->assertJsonPath('data.document_content.age', \Carbon\Carbon::parse('1990-01-15')->age);
    }

    public function test_document_officer_can_return_request_for_correction(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->request->update([
            'status' => 'processing',
            'document_content' => ['title' => 'Old preview'],
            'document_generated_at' => now(),
        ]);
        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'for_correction',
            'staff_remarks' => 'Please provide a clearer ID.',
        ])->assertOk();

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'for_correction',
            'staff_remarks' => 'Please provide a clearer ID.',
            'document_content' => null,
            'document_generated_at' => null,
        ]);
    }

    public function test_document_officer_can_reject_request_with_reason(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'rejected',
            'staff_remarks' => 'The requested purpose cannot be verified.',
            'rejection_reason' => 'The request cannot be approved under the barangay policy.',
        ])->assertOk();

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'rejected',
            'rejection_reason' => 'The request cannot be approved under the barangay policy.',
        ]);
    }

    public function test_document_officer_can_reject_a_request_during_processing(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $this->request->update(['status' => 'processing']);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'rejected',
            'staff_remarks' => 'The declared purpose cannot be verified.',
            'rejection_reason' => 'The request does not meet barangay requirements.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->assertDatabaseHas('document_request_events', [
            'document_request_id' => $this->request->id,
            'actor_id' => $this->documentOfficer->id,
            'from_status' => 'processing',
            'to_status' => 'rejected',
        ]);
    }

    public function test_staff_dashboard_prioritizes_attention_and_avoids_duplicate_recent_rows(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $this->request->update(['status' => 'for_correction']);

        $recentRequest = DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'document_type' => 'Barangay Residency',
            'status' => 'completed',
        ]);

        $this->getJson('/api/staff/document-request-dashboard')
            ->assertOk()
            ->assertJsonPath('data.counts.for_correction', 1)
            ->assertJsonPath('data.counts.completed', 1)
            ->assertJsonPath('data.attention.0.id', $this->request->id)
            ->assertJsonPath('data.recent.0.id', $recentRequest->id)
            ->assertJsonCount(1, 'data.recent');
    }

    public function test_staff_request_queue_sorts_resident_names_on_the_server(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $earlierResident = Resident::factory()->create(['name' => 'Aaron Resident']);
        $earlierRequest = DocumentRequest::factory()->create([
            'resident_id' => $earlierResident->id,
            'document_type' => 'Barangay Residency',
            'status' => 'pending',
        ]);

        $this->getJson('/api/staff/document-requests?sort_by=resident_name&sort_direction=asc')
            ->assertOk()
            ->assertJsonPath('data.0.id', $earlierRequest->id);
    }

    public function test_document_officer_can_release_request(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->request->update([
            'status' => 'ready_for_release',
            'document_content' => ['derogatory_status' => 'no_derogatory_record'],
            'document_generated_at' => now(),
        ]);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'completed',
            'staff_remarks' => 'Document released to the resident.',
        ])->assertOk();

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'completed',
        ]);
    }

    public function test_document_officer_sees_active_queue_and_cannot_delete_request_history(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $completedRequest = DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'document_type' => 'Barangay Certification',
            'status' => 'completed',
        ]);

        $rejectedRequest = DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'document_type' => 'Barangay Residency',
            'status' => 'rejected',
            'rejection_reason' => 'Not eligible.',
        ]);

        $this->getJson('/api/staff/document-requests')
            ->assertOk()
            ->assertJsonMissing(['data' => [['id' => $completedRequest->id]]])
            ->assertJsonMissing(['data' => [['id' => $rejectedRequest->id]]])
            ->assertJsonMissing(['data' => [['status' => 'completed']]])
            ->assertJsonMissing(['data' => [['status' => 'rejected']]]);

        $this->getJson('/api/staff/document-requests?status=completed')
            ->assertOk()
            ->assertJsonPath('data.0.id', $completedRequest->id);

        $this->deleteJson('/api/staff/document-requests/'.$completedRequest->id)
            ->assertMethodNotAllowed();

        $this->assertDatabaseHas('document_requests', ['id' => $completedRequest->id, 'status' => 'completed']);
        $this->assertDatabaseHas('document_requests', ['id' => $rejectedRequest->id, 'status' => 'rejected']);
    }

    public function test_document_request_cannot_be_marked_ready_until_a_preview_has_been_generated(): void
    {
        Sanctum::actingAs($this->documentOfficer);
        $this->request->update(['status' => 'processing']);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
        ])->assertStatus(409);
    }

    public function test_return_for_correction_requires_staff_remarks(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'for_correction',
        ])->assertUnprocessable();
    }

    public function test_document_officer_can_view_uploaded_requirements_inline(): void
    {
        Storage::fake('local');
        $path = UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf')
            ->store('document-requests/'.$this->resident->id, 'local');
        $this->request->update([
            'details' => [
                'requirements' => [
                    'valid_id' => [
                        'label' => 'Valid ID',
                        'path' => $path,
                        'original_name' => 'valid-id.pdf',
                    ],
                ],
            ],
        ]);
        Sanctum::actingAs($this->documentOfficer);

        $this->get('/api/staff/document-requests/'.$this->request->id.'/requirements/valid_id')
            ->assertOk()
            ->assertHeader('cache-control', 'no-store, private')
            ->assertHeader('content-disposition', 'inline; filename=valid-id.pdf');
    }

    public function test_document_officer_cannot_access_complaints(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->getJson('/api/staff/complaints')->assertForbidden();
    }

    public function test_complaint_officer_cannot_access_document_requests(): void
    {
        Sanctum::actingAs($this->complaintOfficer);

        $this->getJson('/api/staff/document-requests')->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_access_document_workflow(): void
    {
        $this->getJson('/api/staff/document-requests')->assertUnauthorized();
    }

    public function test_document_officer_cannot_skip_required_workflow_states(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'completed',
        ])->assertStatus(409);
    }
}
