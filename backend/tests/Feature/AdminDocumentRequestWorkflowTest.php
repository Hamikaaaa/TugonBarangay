<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\DocumentRequest;
use App\Models\DocumentRequestEvent;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDocumentRequestWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Resident $resident;

    private DocumentRequest $request;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resident = Resident::factory()->create();
        $this->request = DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'status' => 'pending',
        ]);
    }

    public function test_admin_cannot_access_staff_document_requests(): void
    {
        $admin = Admin::create([
            'name' => 'Test Admin',
            'email' => 'admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/document-requests')
            ->assertOk()
            ->assertJsonPath('data.0.id', $this->request->id);

        $this->getJson('/api/admin/document-requests/'.$this->request->id)
            ->assertOk()
            ->assertJsonPath('data.id', $this->request->id);
        $this->getJson('/api/staff/document-requests')->assertForbidden();
        $this->patchJson('/api/admin/document-requests/'.$this->request->id.'/status', [
            'status' => 'processing',
        ])->assertStatus(409);
    }

    public function test_admin_can_process_requests_without_being_assigned_as_staff(): void
    {
        $this->request->update(['document_type' => 'Barangay Residency']);
        $admin = Admin::create([
            'name' => 'Processing Admin',
            'email' => 'processing-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/admin/document-requests/'.$this->request->id.'/status', [
            'status' => 'under_review',
        ])->assertOk()->assertJsonPath('data.status', 'under_review');

        $this->patchJson('/api/admin/document-requests/'.$this->request->id.'/status', [
            'status' => 'processing',
        ])->assertOk()->assertJsonPath('data.status', 'processing');
        $this->assertNull($this->request->fresh()->assigned_staff_id);

        $this->postJson('/api/admin/document-requests/'.$this->request->id.'/generate', [
            'document_content' => ['resident_name' => 'Test Resident'],
        ])->assertOk()->assertJsonPath('data.document_content.resident_name', 'Test Resident');

        $this->assertDatabaseHas('document_request_events', [
            'document_request_id' => $this->request->id,
            'actor_id' => $admin->id,
            'actor_role' => 'admin',
            'action' => 'preview_generated',
        ]);
    }

    public function test_admin_can_mark_a_request_ready_without_a_saved_document(): void
    {
        $this->request->update([
            'document_type' => 'Barangay Residency',
            'status' => 'processing',
            'document_content' => null,
            'document_generated_at' => null,
        ]);
        $admin = Admin::create([
            'name' => 'Release Admin',
            'email' => 'release-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->patchJson('/api/admin/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
        ])->assertOk()->assertJsonPath('data.status', 'ready_for_release');
    }

    public function test_admin_history_includes_closed_requests_and_supports_status_search(): void
    {
        $completedRequest = DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'document_type' => 'Barangay Residency',
            'status' => 'completed',
        ]);
        $admin = Admin::create([
            'name' => 'Test Admin',
            'email' => 'history-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/document-requests?status=all&search=Barangay%20Residency')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $completedRequest->id);

        $this->getJson('/api/admin/document-requests?status=completed')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'completed');
    }

    public function test_admin_overview_reports_delays_staff_workload_and_audit_history(): void
    {
        $officer = Staff::factory()->create([
            'name' => 'Assigned Officer',
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
        ]);
        $this->request->update([
            'status' => 'processing',
            'assigned_staff_id' => $officer->id,
            'status_changed_at' => now()->subDays(4),
        ]);
        DocumentRequestEvent::record(
            $this->request,
            $officer,
            'status_changed',
            'pending',
            'processing',
        );

        $admin = Admin::create([
            'name' => 'Oversight Admin',
            'email' => 'oversight-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/document-requests/overview')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.processing', 1)
            ->assertJsonPath('data.delayed', 1)
            ->assertJsonPath('data.staff_workload.0.name', 'Assigned Officer')
            ->assertJsonPath('data.staff_workload.0.active_requests', 1);

        $this->getJson('/api/admin/document-request-events')
            ->assertOk()
            ->assertJsonPath('data.0.actor_name', 'Assigned Officer')
            ->assertJsonPath('data.0.action', 'status_changed');

        $this->getJson('/api/admin/document-requests/'.$this->request->id)
            ->assertOk()
            ->assertJsonPath('data.assigned_staff.name', 'Assigned Officer')
            ->assertJsonPath('data.events.0.to_status', 'processing');
    }

    public function test_admin_cannot_access_staff_daily_dashboard(): void
    {
        $admin = Admin::create([
            'name' => 'Dashboard Admin',
            'email' => 'dashboard-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/staff/document-request-dashboard')->assertForbidden();
    }

    public function test_document_request_officer_cannot_access_admin_request_oversight(): void
    {
        Sanctum::actingAs(Staff::factory()->create([
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
        ]));

        $this->getJson('/api/admin/document-requests')->assertForbidden();
    }

    public function test_non_document_request_staff_cannot_access_admin_request_oversight(): void
    {
        Sanctum::actingAs(Staff::factory()->create([
            'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
        ]));

        $this->getJson('/api/admin/document-requests')->assertForbidden();
    }
}
