<?php

namespace Tests\Feature;

use App\Models\DocumentRequest;
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
        ]);
        $this->complaintOfficer = Staff::factory()->create([
            'name' => 'Complaint Officer',
            'email' => 'complaint-officer@example.com',
            'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
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

    public function test_document_officer_can_generate_a_preview_for_a_document_request(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->request->update(['status' => 'processing']);

        $this->postJson('/api/staff/document-requests/'.$this->request->id.'/generate', [
            'document_content' => [
                'title' => 'Barangay Residency',
                'resident_name' => 'Resident User',
                'date_of_birth' => '1990-01-15',
            ],
            'staff_remarks' => 'Preview created for review.',
        ])->assertOk()
            ->assertJsonPath('data.id', $this->request->id)
            ->assertJsonPath('data.document_content.title', 'Barangay Residency');

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'processing',
        ]);
        $this->assertNotNull($this->request->fresh()->document_generated_at);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
            'staff_remarks' => 'Document reviewed, signed, and sealed.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'ready_for_release');
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

        $this->request->update(['status' => 'ready_for_release']);

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
