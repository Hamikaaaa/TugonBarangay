<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Complaint;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffComplaintWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Staff $complaintOfficer;

    private Staff $documentOfficer;

    private Resident $resident;

    private Complaint $complaint;

    protected function setUp(): void
    {
        parent::setUp();

        $this->complaintOfficer = Staff::factory()->create([
            'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
        ]);
        $this->documentOfficer = Staff::factory()->create([
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
        ]);
        $this->resident = Resident::factory()->create();
        $this->complaint = Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Road and Public',
            'subject' => 'Blocked drainage',
            'description' => 'Drainage has been blocked.',
            'status' => 'pending',
        ]);
    }

    public function test_complaint_officer_can_review_and_update_complaints(): void
    {
        Sanctum::actingAs($this->complaintOfficer);

        $this->getJson('/api/staff/complaints')
            ->assertOk()
            ->assertJsonPath('data.0.id', $this->complaint->id)
            ->assertJsonPath('data.0.user.name', $this->resident->name);

        $this->patchJson('/api/staff/complaints/'.$this->complaint->id.'/status', [
            'status' => 'in_progress',
            'staff_remarks' => 'The location is being checked.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->patchJson('/api/staff/complaints/'.$this->complaint->id.'/status', [
            'status' => 'resolved',
            'staff_remarks' => 'Inspection complete.',
            'resolution_details' => 'The drainage was cleared.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'resolved');

        $this->assertDatabaseHas('complaints', [
            'id' => $this->complaint->id,
            'status' => 'resolved',
            'staff_remarks' => 'Inspection complete.',
            'resolution_details' => 'The drainage was cleared.',
        ]);
    }

    public function test_complaint_officer_cannot_access_document_requests(): void
    {
        Sanctum::actingAs($this->complaintOfficer);

        $this->getJson('/api/staff/document-requests')->assertForbidden();
    }

    public function test_document_officer_cannot_access_complaints(): void
    {
        Sanctum::actingAs($this->documentOfficer);

        $this->getJson('/api/staff/complaints')->assertForbidden();
    }

    public function test_complaint_resolution_requires_details_and_terminal_statuses_cannot_be_reopened(): void
    {
        Sanctum::actingAs($this->complaintOfficer);

        $this->patchJson('/api/staff/complaints/'.$this->complaint->id.'/status', [
            'status' => 'resolved',
        ])->assertUnprocessable();

        $this->complaint->update(['status' => 'resolved']);
        $this->patchJson('/api/staff/complaints/'.$this->complaint->id.'/status', [
            'status' => 'in_progress',
        ])->assertStatus(409);
    }

    public function test_admin_can_oversee_complaints_but_staff_cannot_use_admin_routes(): void
    {
        Sanctum::actingAs(Staff::factory()->create([
            'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
        ]));
        $this->getJson('/api/admin/complaints')->assertForbidden();

        $admin = Admin::create([
            'name' => 'Test Admin',
            'email' => 'admin-complaints@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/complaints')
            ->assertOk()
            ->assertJsonPath('data.0.id', $this->complaint->id);
    }
}
