<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\DocumentRequest;
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

    public function test_admin_can_view_and_update_document_requests(): void
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

        $this->patchJson('/api/admin/document-requests/'.$this->request->id.'/status', [
            'status' => 'processing',
            'staff_remarks' => 'Requirements are complete.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'processing');
    }

    public function test_non_admin_staff_cannot_access_admin_document_requests(): void
    {
        Sanctum::actingAs(Staff::factory()->create([
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
        ]));

        $this->getJson('/api/admin/document-requests')->assertForbidden();
    }
}
