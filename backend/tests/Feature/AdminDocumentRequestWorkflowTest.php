<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\DocumentRequest;
use App\Models\DocumentRequestEvent;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
            'status' => 'ready_for_release',
        ])->assertStatus(409);
    }

    public function test_admin_can_prepare_requests_without_being_assigned_as_staff(): void
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

        $this->assertNull($this->request->fresh()->assigned_staff_id);

        $this->postJson('/api/admin/document-requests/'.$this->request->id.'/generate', [
            'document_content' => ['resident_name' => 'Test Resident'],
        ])->assertOk()->assertJsonPath('data.document_content.resident_name', 'Test Resident');

        $this->patchJson('/api/admin/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
        ])->assertOk()->assertJsonPath('data.status', 'ready_for_release');

        $this->patchJson('/api/admin/document-requests/'.$this->request->id.'/status', [
            'status' => 'completed',
        ])->assertOk()->assertJsonPath('data.status', 'completed');

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
            'status' => 'under_review',
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

    public function test_admin_can_save_a_permit_inspection_and_mark_it_ready_for_release(): void
    {
        Storage::fake('local');
        $this->request->update([
            'document_type' => 'Fencing Permit',
            'status' => 'under_review',
            'fee' => 530,
            'details' => [
                'fee_mode' => 'assessed',
                'fee_assessed' => false,
            ],
        ]);
        $admin = Admin::create([
            'name' => 'Permit Admin',
            'email' => 'permit-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->post('/api/admin/document-requests/'.$this->request->id.'/construction-inspection', [
            '_method' => 'PATCH',
            'inspection_report' => UploadedFile::fake()->create('inspection-report.pdf', 10, 'application/pdf'),
            'councilor_go_ahead' => '1',
            'staff_note' => 'Approved after inspection.',
            'assessed_fee' => '530.00',
        ])->assertOk()
            ->assertJsonPath('data.details.inspection_report.decision', 'go_ahead')
            ->assertJsonPath('data.details.fee_assessed', true);

        $this->patchJson('/api/admin/document-requests/'.$this->request->id.'/status', [
            'status' => 'ready_for_release',
        ])->assertOk()
            ->assertJsonPath('data.status', 'ready_for_release');
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

        DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'document_type' => 'Barangay Residency',
            'status' => 'rejected',
        ]);
        $this->getJson('/api/admin/document-requests?status=rejected')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'rejected');
    }

    public function test_admin_under_review_filter_groups_request_preparation_stages(): void
    {
        DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'status' => 'under_review',
        ]);
        DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'status' => 'under_review',
        ]);
        DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'status' => 'ready_for_release',
        ]);
        DocumentRequest::factory()->create([
            'resident_id' => $this->resident->id,
            'status' => 'completed',
        ]);
        $admin = Admin::create([
            'name' => 'History Admin',
            'email' => 'history-filter-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/document-requests?status=under_review')
            ->assertOk()
            ->assertJsonCount(3, 'data');

        $this->assertEqualsCanonicalizing(
            ['pending', 'under_review', 'under_review'],
            collect($response->json('data'))->pluck('status')->all(),
        );
    }

    public function test_admin_overview_reports_delays_staff_workload_and_audit_history(): void
    {
        $officer = Staff::factory()->create([
            'name' => 'Assigned Officer',
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
        ]);
        $this->request->update([
            'status' => 'under_review',
            'assigned_staff_id' => $officer->id,
            'status_changed_at' => now()->subDays(4),
        ]);
        DocumentRequestEvent::record(
            $this->request,
            $officer,
            'status_changed',
            'pending',
            'under_review',
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
            ->assertJsonPath('data.under_review', 1)
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
            ->assertJsonPath('data.events.0.to_status', 'under_review');
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

    public function test_legacy_processing_requests_are_normalized_to_under_review(): void
    {
        $this->request->update(['status' => 'processing']);

        $migration = require database_path('migrations/2026_11_21_000001_normalize_document_request_processing_status.php');
        $migration->up();

        $this->assertDatabaseHas('document_requests', [
            'id' => $this->request->id,
            'status' => 'under_review',
        ]);
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
