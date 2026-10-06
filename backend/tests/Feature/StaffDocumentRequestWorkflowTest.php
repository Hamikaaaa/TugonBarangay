<?php

namespace Tests\Feature;

use App\Models\DocumentRequest;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
            'status' => 'processing',
            'staff_remarks' => 'Requirements are complete.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'processing');

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'processing',
            'staff_remarks' => 'Requirements are complete.',
        ]);
    }

    public function test_document_officer_can_generate_a_preview_for_a_document_request(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->postJson('/api/staff/document-requests/'.$this->request->id.'/generate', [
            'document_content' => [
                'title' => 'Barangay Residency',
                'resident_name' => 'Resident User',
            ],
            'staff_remarks' => 'Preview created for review.',
        ])->assertOk()
            ->assertJsonPath('data.id', $this->request->id)
            ->assertJsonPath('data.document_content.title', 'Barangay Residency');

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'pending',
        ]);
    }

    public function test_document_officer_can_return_request_for_correction(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->patchJson('/api/staff/document-requests/'.$this->request->id.'/status', [
            'status' => 'for_correction',
            'staff_remarks' => 'Please provide a clearer ID.',
        ])->assertOk();

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'for_correction',
            'staff_remarks' => 'Please provide a clearer ID.',
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

    public function test_document_officer_sees_only_active_queue_by_default_and_can_delete_history(): void
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
            ->assertOk();

        $this->assertDatabaseMissing('document_requests', ['id' => $completedRequest->id]);
        $this->assertDatabaseHas('document_requests', ['id' => $rejectedRequest->id, 'status' => 'rejected']);
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
