<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DocumentTypeConfigurationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_add_and_update_a_resident_document_type(): void
    {
        $admin = Admin::create([
            'name' => 'Admin User',
            'email' => 'admin-catalog@example.com',
            'password' => 'password',
        ]);
        Sanctum::actingAs($admin);

        $schema = [
            'label' => 'Community Reference',
            'fee_mode' => 'fixed',
            'fee' => 25,
            'one_time' => false,
            'active' => true,
            'template' => 'This certifies {{full_name}} for {{purpose}}.',
            'applicant_fields' => [
                ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true],
            ],
            'fields' => [],
            'requirements' => [
                ['key' => 'valid_id', 'label' => 'Valid ID', 'required' => true],
            ],
        ];

        $this->postJson('/api/admin/document-types', $schema)
            ->assertCreated()
            ->assertJsonPath('data.label', 'Community Reference')
            ->assertJsonPath('data.fee', '25.00')
            ->assertJsonPath('data.template', 'This certifies {{full_name}} for {{purpose}}.');

        $type = DocumentType::where('label', 'Community Reference')->firstOrFail();
        $this->putJson('/api/admin/document-types/'.$type->id, [
            ...$schema,
            'fee' => 40,
            'requirements' => [
                ['key' => 'valid_id', 'label' => 'Government-issued ID', 'required' => true],
            ],
        ])->assertOk()
            ->assertJsonPath('data.fee', '40.00')
            ->assertJsonPath('data.requirements.0.label', 'Government-issued ID')
            ->assertJsonPath('data.template', 'This certifies {{full_name}} for {{purpose}}.');

        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Storage::fake('local');
        Sanctum::actingAs($resident);
        $this->getJson('/api/resident/document-types')
            ->assertOk()
            ->assertJsonMissing(['value' => 'Construction Permit'])
            ->assertJsonPath('data.0.label', 'Barangay Certificate');
        $this->post('/api/resident/requests', [
            'document_type' => 'community-reference',
            'form_fields' => ['full_name' => 'Jane Doe'],
            'requirements' => [
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ])->assertCreated()
            ->assertJsonPath('request.fee', '40.00')
            ->assertJsonPath('request.document_type_label', 'Community Reference');

        $officer = Staff::factory()->create([
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
        ]);
        Sanctum::actingAs($officer);
        $this->getJson('/api/staff/document-requests')
            ->assertOk()
            ->assertJsonPath('data.0.type.template', 'This certifies {{full_name}} for {{purpose}}.');
    }

    public function test_admin_can_delete_unused_document_type_but_not_one_with_request_history(): void
    {
        $admin = Admin::create([
            'name' => 'Admin User',
            'email' => 'admin-delete-catalog@example.com',
            'password' => 'password',
        ]);
        Sanctum::actingAs($admin);

        $unusedType = DocumentType::create([
            'name' => 'Unused document',
            'enabled' => true,
            'value' => 'unused-document',
            'label' => 'Unused document',
            'fee_mode' => 'fixed',
            'fee' => 0,
            'one_time' => false,
            'active' => true,
            'applicant_fields' => [['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true]],
            'fields' => [],
            'requirements' => [],
        ]);

        $this->deleteJson('/api/admin/document-types/'.$unusedType->id)
            ->assertOk();
        $this->assertDatabaseMissing('document_types', ['id' => $unusedType->id]);

        $resident = Resident::factory()->create();
        $existingType = DocumentType::where('value', 'Barangay Certification')->firstOrFail();
        DocumentRequest::factory()->create([
            'resident_id' => $resident->id,
            'document_type' => $existingType->value,
        ]);

        $this->deleteJson('/api/admin/document-types/'.$existingType->id)
            ->assertStatus(409);
        $this->assertDatabaseHas('document_types', ['id' => $existingType->id]);
    }

    public function test_document_officer_can_assess_business_clearance_fee_before_release(): void
    {
        $officer = Staff::factory()->create([
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
        ]);
        $resident = Resident::factory()->create();
        $request = DocumentRequest::factory()->create([
            'resident_id' => $resident->id,
            'document_type' => 'Business Permit',
            'status' => 'processing',
            'fee' => 0,
            'details' => ['fee_mode' => 'assessed', 'fee_assessed' => false],
        ]);
        Sanctum::actingAs($officer);

        $request->update([
            'document_content' => ['title' => 'Business Clearance'],
            'document_generated_at' => now(),
        ]);
        $this->patchJson('/api/staff/document-requests/'.$request->id.'/status', [
            'status' => 'ready_for_release',
            'staff_remarks' => 'Reviewed and signed.',
        ])->assertStatus(409);

        $this->patchJson('/api/staff/document-requests/'.$request->id.'/fee', ['fee' => 350])
            ->assertOk()
            ->assertJsonPath('data.fee', '350.00');

        $this->assertTrue($request->fresh()->details['fee_assessed']);

        $this->patchJson('/api/staff/document-requests/'.$request->id.'/status', [
            'status' => 'ready_for_release',
            'staff_remarks' => 'Reviewed and signed.',
        ])->assertOk();
    }

    public function test_document_request_officer_sees_active_configured_types_for_sidebar(): void
    {
        $officer = Staff::factory()->create([
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
        ]);
        Sanctum::actingAs($officer);

        $this->getJson('/api/staff/document-types')
            ->assertOk()
            ->assertJsonFragment(['label' => 'Barangay Clearance', 'value' => 'Barangay Certification'])
            ->assertJsonMissing(['label' => 'Construction Permit']);
    }

    public function test_complaint_officer_cannot_load_document_type_sidebar_data(): void
    {
        $officer = Staff::factory()->create([
            'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
        ]);
        Sanctum::actingAs($officer);

        $this->getJson('/api/staff/document-types')->assertForbidden();
    }
}
