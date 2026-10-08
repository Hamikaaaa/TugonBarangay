<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Complaint;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Illuminate\Support\Facades\Storage;
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
        $this->assertDatabaseHas('notifications', [
            'resident_id' => $this->resident->id,
            'type' => 'complaint_status_updated',
            'title' => 'Update on complaint CMP-'.str_pad((string) $this->complaint->id, 5, '0', STR_PAD_LEFT),
            'message' => "The status of your complaint CMP-".str_pad((string) $this->complaint->id, 5, '0', STR_PAD_LEFT)." is now In progress.\n\nStaff remarks: The location is being checked.",
        ]);

        $this->patchJson('/api/staff/complaints/'.$this->complaint->id.'/status', [
            'status' => 'resolved',
            'staff_remarks' => 'Inspection complete.',
            'resolution_details' => 'The drainage was cleared.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'resolved');

        $this->assertDatabaseHas('notifications', [
            'resident_id' => $this->resident->id,
            'type' => 'complaint_status_updated',
            'message' => "The status of your complaint CMP-".str_pad((string) $this->complaint->id, 5, '0', STR_PAD_LEFT)." is now Resolved.\n\nStaff remarks: Inspection complete.\n\nCase resolution: The drainage was cleared.",
        ]);
        Sanctum::actingAs($this->resident);
        $this->getJson('/api/resident/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'complaint_status_updated')
            ->assertJsonPath('data.0.message', "The status of your complaint CMP-".str_pad((string) $this->complaint->id, 5, '0', STR_PAD_LEFT)." is now Resolved.\n\nStaff remarks: Inspection complete.\n\nCase resolution: The drainage was cleared.");

        $this->assertDatabaseHas('complaints', [
            'id' => $this->complaint->id,
            'status' => 'resolved',
            'staff_remarks' => 'Inspection complete.',
            'resolution_details' => 'The drainage was cleared.',
        ]);
    }

    public function test_complaint_status_update_notifies_resident_with_staff_remarks(): void
    {
        $this->withoutMiddleware([
            \App\Http\Middleware\RoleMiddleware::class,
            \App\Http\Middleware\DesignationMiddleware::class,
        ]);
        Sanctum::actingAs($this->complaintOfficer);
        $this->assertSame('pending', $this->complaint->fresh()->status);

        $this->patchJson('/api/staff/complaints/'.$this->complaint->id.'/status', [
            'status' => 'in_progress',
            'staff_remarks' => 'The location is being checked.',
        ])->assertOk();

        Sanctum::actingAs($this->resident);
        $this->getJson('/api/resident/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.type', 'complaint_status_updated')
            ->assertJsonPath('data.0.title', 'Update on complaint CMP-'.str_pad((string) $this->complaint->id, 5, '0', STR_PAD_LEFT))
            ->assertJsonPath('data.0.message', "The status of your complaint CMP-".str_pad((string) $this->complaint->id, 5, '0', STR_PAD_LEFT)." is now In progress.\n\nStaff remarks: The location is being checked.");
    }

    public function test_complaint_officer_can_load_one_complaint_for_review(): void
    {
        Sanctum::actingAs($this->complaintOfficer);

        $this->getJson('/api/staff/complaints/'.$this->complaint->id)
            ->assertOk()
            ->assertJsonPath('data.id', $this->complaint->id)
            ->assertJsonPath('data.category', 'Road and Public')
            ->assertJsonPath('data.user.name', $this->resident->name);
    }

    public function test_open_urgent_complaints_are_first_and_terminal_complaints_move_below_active_cases(): void
    {
        $urgentPending = Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Peace and Order',
            'subject' => 'Fight in progress',
            'description' => 'A fight is still happening.',
            'status' => 'pending',
            'priority' => 'urgent',
        ]);
        $urgentResolved = Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Peace and Order',
            'subject' => 'Resolved urgent report',
            'description' => 'This urgent complaint has been resolved.',
            'status' => 'resolved',
            'priority' => 'urgent',
        ]);
        $urgentRejected = Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Peace and Order',
            'subject' => 'Rejected urgent report',
            'description' => 'This urgent complaint was rejected.',
            'status' => 'rejected',
            'priority' => 'urgent',
        ]);
        $urgentClosed = Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Peace and Order',
            'subject' => 'Closed urgent report',
            'description' => 'This urgent complaint was closed.',
            'status' => 'closed',
            'priority' => 'urgent',
        ]);

        Sanctum::actingAs($this->complaintOfficer);

        $response = $this->getJson('/api/staff/complaints')->assertOk();
        $orderedIds = array_column($response->json('data'), 'id');

        $this->assertSame($urgentPending->id, $orderedIds[0]);
        $this->assertSame($this->complaint->id, $orderedIds[1]);
        $this->assertEqualsCanonicalizing(
            [$urgentResolved->id, $urgentRejected->id, $urgentClosed->id],
            array_slice($orderedIds, 2),
        );
    }

    public function test_complaint_officer_can_filter_complaints_by_category(): void
    {
        Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Noise and Disturbance',
            'subject' => 'Late-night noise',
            'description' => 'Loud noise after hours.',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($this->complaintOfficer);

        $this->getJson('/api/staff/complaints?category=Road%20and%20Public')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->complaint->id)
            ->assertJsonPath('data.0.category', 'Road and Public')
            ->assertJsonPath('counts.pending', 1)
            ->assertJsonPath('priority_counts.normal', 1)
            ->assertJsonPath('category_counts.0.category', 'Road and Public');
    }

    public function test_complaint_officer_can_filter_complaints_by_priority(): void
    {
        $urgentComplaint = Complaint::create([
            'resident_id' => $this->resident->id,
            'category' => 'Peace and Order',
            'subject' => 'Urgent incident',
            'description' => 'Immediate assistance requested.',
            'status' => 'pending',
            'priority' => 'urgent',
        ]);

        Sanctum::actingAs($this->complaintOfficer);

        $this->getJson('/api/staff/complaints?priority=urgent')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $urgentComplaint->id)
            ->assertJsonPath('data.0.priority', 'urgent')
            ->assertJsonPath('priority_counts.urgent', 1);
    }

    public function test_complaint_officer_can_update_priority_without_changing_category(): void
    {
        Sanctum::actingAs($this->complaintOfficer);

        $this->patchJson('/api/staff/complaints/'.$this->complaint->id.'/classification', [
            'category' => 'Public Nuisance',
            'priority' => 'urgent',
        ])->assertOk()
            ->assertJsonPath('data.category', 'Road and Public')
            ->assertJsonPath('data.priority', 'urgent');

        $this->assertDatabaseHas('complaints', [
            'id' => $this->complaint->id,
            'category' => 'Road and Public',
            'priority' => 'urgent',
        ]);
    }

    public function test_complaint_officer_can_download_complaint_evidence(): void
    {
        Storage::fake('local');
        $path = UploadedFile::fake()->createWithContent('evidence.jpg', 'evidence sample')->store('complaints', 'local');
        $this->complaint->update(['evidence_path' => $path]);
        Sanctum::actingAs($this->complaintOfficer);

        $this->get('/api/staff/complaints/'.$this->complaint->id.'/evidence')
            ->assertOk()
            ->assertHeader('content-disposition', 'attachment; filename=complaint-evidence-'.$this->complaint->id.'.jpg')
            ->assertHeader('cache-control', 'no-store, private')
            ->assertStreamedContent('evidence sample');
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
