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

    public function test_good_moral_character_has_the_requested_wording_and_resident_form_fields(): void
    {
        $type = DocumentType::where('value', 'Certificate of Good Moral Character')->firstOrFail();
        $applicantFieldKeys = array_column($type->applicant_fields, 'key');
        $purposeField = collect($type->fields)->firstWhere('key', 'purpose');

        $this->assertStringContainsString('TO WHOM IT MAY CONCERN:', $type->template);
        $this->assertStringContainsString('{{full_name}}', $type->template);
        $this->assertStringContainsString('{{purok}}', $type->template);
        $this->assertStringContainsString('{{purpose}}', $type->template);
        $this->assertContains('full_name', $applicantFieldKeys);
        $this->assertContains('purok', $applicantFieldKeys);
        $this->assertNotNull($purposeField);
        $this->assertTrue($purposeField['required']);

        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);
        $response = $this->getJson('/api/resident/document-types')->assertOk();
        $residentType = collect($response->json('data'))->firstWhere('id', $type->id);

        $this->assertNotNull($residentType);
        $this->assertSame($type->template, $residentType['template']);
        $this->assertContains('full_name', array_column($residentType['applicant_fields'], 'key'));
        $this->assertContains('purok', array_column($residentType['applicant_fields'], 'key'));
        $this->assertContains('purpose', array_column($residentType['fields'], 'key'));
    }

    public function test_barangay_clearance_has_requested_wording_and_collects_home_address_birthplace_and_purpose(): void
    {
        Storage::fake('local');
        $type = DocumentType::where('value', 'Barangay Certification')->firstOrFail();
        $applicantFields = collect($type->applicant_fields)->keyBy('key');
        $purposeField = collect($type->fields)->firstWhere('key', 'purpose');

        $this->assertStringContainsString('{{full_name}}', $type->template);
        $this->assertStringContainsString('{{address}}', $type->template);
        $this->assertStringContainsString('{{place_of_birth}}', $type->template);
        $this->assertStringContainsString('{{date_of_birth}}', $type->template);
        $this->assertStringContainsString('{{purpose}}', $type->template);
        $this->assertStringContainsString('{{object_pronoun}}', $type->template);
        $this->assertStringContainsString('{{subject_pronoun}} {{subject_verb}}', $type->template);
        $this->assertStringContainsString('{{derogatory_remarks}}', $type->template);
        $this->assertStringNotContainsString('NO DEROGATORY RECORD', $type->template);
        $this->assertStringContainsString('Hon. fe Q. Cuyos', $type->template);
        $this->assertSame('Home Address', $applicantFields['address']['label']);
        $this->assertTrue($applicantFields['address']['required']);
        $this->assertTrue($applicantFields['place_of_birth']['required']);
        $this->assertSame('text', $purposeField['type']);
        $this->assertTrue(collect($type->requirements)->firstWhere('key', 'applicant_photo')['required']);

        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        $response = $this->post('/api/resident/requests', [
            'document_type' => 'Barangay Certification',
            'form_fields' => [
                'full_name' => 'Arabela Grace Velasco Abella',
                'address' => 'Purok Crossing, Jugan, Consolacion',
                'place_of_birth' => 'Cebu City',
                'date_of_birth' => '2004-07-09',
                'sex' => 'Female',
                'purok' => 'Purok Crossing',
                'purpose' => 'Employment at Gaisano',
            ],
            'requirements' => [
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
                'applicant_photo' => UploadedFile::fake()->create('applicant-photo.png', 10, 'image/png'),
            ],
        ]);
        $response->assertCreated()
            ->assertJsonPath('request.details.form_fields.place_of_birth', 'Cebu City')
            ->assertJsonPath('request.details.form_fields.purpose', 'Employment at Gaisano')
            ->assertJsonPath('request.details.requirements.applicant_photo.label', 'Applicant Photo (JPG or PNG, up to 5 MB)');
        Storage::disk('local')->assertExists(
            $response->json('request.details.requirements.applicant_photo.path'),
        );

        $this->postJson('/api/resident/requests', [
            'document_type' => 'Barangay Certification',
            'form_fields' => [
                'full_name' => 'Arabela Grace Velasco Abella',
                'address' => 'Purok Crossing, Jugan, Consolacion',
                'place_of_birth' => 'Cebu City',
                'date_of_birth' => '2004-07-09',
                'sex' => 'Female',
                'purok' => 'Purok Crossing',
                'purpose' => 'Employment at Gaisano',
            ],
            'requirements' => [
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
                'applicant_photo' => UploadedFile::fake()->create('applicant-photo.pdf', 10, 'application/pdf'),
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('requirements.applicant_photo');
    }

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

    public function test_admin_can_upload_download_and_remove_a_document_template_file(): void
    {
        Storage::fake('local');
        $admin = Admin::create([
            'name' => 'Admin User',
            'email' => 'admin-template@example.com',
            'password' => 'password',
        ]);
        Sanctum::actingAs($admin);
        $type = DocumentType::where('value', 'Barangay Certification')->firstOrFail();

        $this->post('/api/admin/document-types/'.$type->id.'/template', [
            'template_file' => UploadedFile::fake()->create('clearance-template.pdf', 20, 'application/pdf'),
        ])->assertOk()
            ->assertJsonPath('data.uploaded_template_name', 'clearance-template.pdf');

        $storedPath = $type->fresh()->uploaded_template_path;
        Storage::disk('local')->assertExists($storedPath);
        $this->get('/api/admin/document-types/'.$type->id.'/template')->assertOk();

        $this->post('/api/admin/document-types/'.$type->id.'/template', [
            'remove_template' => true,
        ])->assertOk()
            ->assertJsonPath('data.uploaded_template_name', null);
        Storage::disk('local')->assertMissing($storedPath);
    }

    public function test_disabled_configured_fields_and_requirements_are_not_shown_or_required_for_residents(): void
    {
        $admin = Admin::create([
            'name' => 'Admin User',
            'email' => 'admin-disable-fields@example.com',
            'password' => 'password',
        ]);
        Sanctum::actingAs($admin);
        $type = DocumentType::create([
            'name' => 'Temporary Certificate',
            'enabled' => true,
            'value' => 'temporary-certificate',
            'label' => 'Temporary Certificate',
            'fee_mode' => 'fixed',
            'fee' => 25,
            'one_time' => false,
            'active' => true,
            'applicant_fields' => [
                ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'enabled' => true],
                ['key' => 'unused_info', 'label' => 'Unused information', 'type' => 'text', 'required' => true, 'enabled' => false],
            ],
            'fields' => [],
            'requirements' => [
                ['key' => 'unused_upload', 'label' => 'Unused upload', 'required' => true, 'enabled' => false],
            ],
        ]);

        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);
        $this->getJson('/api/resident/document-types')->assertOk();

        $this->postJson('/api/resident/requests', [
            'document_type' => $type->value,
            'form_fields' => ['full_name' => 'Jane Doe'],
        ])->assertCreated()
            ->assertJsonPath('request.fee', '25.00');
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
