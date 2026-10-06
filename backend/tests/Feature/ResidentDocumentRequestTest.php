<?php

namespace Tests\Feature;

use App\Models\DocumentRequest;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResidentDocumentRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_submit_a_document_request_with_required_uploads(): void
    {
        Storage::fake('local');
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);

        $response = $this->post('/api/resident/requests', [
            'document_type' => 'Barangay Certification',
            'notes' => 'For employment',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'date_of_birth' => '1990-01-15',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'contact_number' => '09123456789',
                'email_address' => 'jane@example.com',
                'purpose' => 'Employment',
            ],
            'requirements' => [
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('request.document_type', 'Barangay Certification')
            ->assertJsonPath('request.fee', '80.00')
            ->assertJsonPath('request.details.notes', 'For employment')
            ->assertJsonPath('request.details.form_fields.purpose', 'Employment')
            ->assertJsonPath('request.details.requirements.valid_id.label', 'Valid government-issued ID');

        $documentRequest = DocumentRequest::firstOrFail();
        Storage::disk('local')->assertExists($documentRequest->details['requirements']['valid_id']['path']);
    }

    public function test_resident_must_upload_every_required_document(): void
    {
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);

        $this->withHeader('Accept', 'application/json')->post('/api/resident/requests', [
            'document_type' => 'Barangay Certification',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'date_of_birth' => '1990-01-15',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'contact_number' => '09123456789',
                'email_address' => 'jane@example.com',
                'purpose' => 'Employment',
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('requirements.valid_id');
    }

    public function test_resident_must_submit_the_selected_documents_required_form_fields(): void
    {
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);

        $this->withHeader('Accept', 'application/json')->post('/api/resident/requests', [
            'document_type' => 'Barangay Residency',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'date_of_birth' => '1990-01-15',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'municipality_city' => 'Consolacion',
                'province' => 'Cebu',
                'purpose' => 'Employment',
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('form_fields.years_of_residency');
    }

    public function test_verified_resident_can_request_residency_without_uploading_optional_proof(): void
    {
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);

        $this->post('/api/resident/requests', [
            'document_type' => 'Barangay Residency',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'date_of_birth' => '1990-01-15',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'municipality_city' => 'Consolacion',
                'province' => 'Cebu',
                'years_of_residency' => '5',
                'purpose' => 'Employment',
            ],
        ])->assertCreated()
            ->assertJsonPath('request.document_type', 'Barangay Residency')
            ->assertJsonPath('request.fee', '140.00')
            ->assertJsonPath('request.details.requirements', []);
    }

    public function test_other_certification_purpose_requires_additional_details(): void
    {
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);

        $this->withHeader('Accept', 'application/json')->post('/api/resident/requests', [
            'document_type' => 'Barangay Certification',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'date_of_birth' => '1990-01-15',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'contact_number' => '09123456789',
                'email_address' => 'jane@example.com',
                'purpose' => 'Other',
            ],
            'requirements' => [
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('form_fields.additional_details');
    }
}
