<?php

namespace Tests\Feature;

use App\Models\DocumentRequest;
use App\Models\DocumentType;
use App\Models\Resident;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResidentDocumentRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_resident_cannot_submit_a_document_request(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'pending']);
        Sanctum::actingAs($resident);

        $this->postJson('/api/resident/requests', [])
            ->assertForbidden()
            ->assertJsonPath('message', 'Your account must be verified by barangay personnel before using this service.')
            ->assertJsonPath('verification_status', 'pending');

        $this->assertDatabaseCount('document_requests', 0);
    }

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
                'address' => '123 Main Street',
                'date_of_birth' => '1990-01-15',
                'age' => '36',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'citizenship' => 'Filipino',
                'purok' => 'Purok 1',
                'purpose' => 'Employment',
            ],
            'requirements' => [
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('request.document_type', 'Barangay Certification')
            ->assertJsonPath('request.fee', '80.00')
            ->assertJsonPath('request.details.notes', 'For employment')
            ->assertJsonPath('request.details.form_fields.purpose', 'Employment')
            ->assertJsonPath('request.details.form_fields.age', Carbon::parse('1990-01-15')->age)
            ->assertJsonPath('request.details.requirements.valid_id.label', 'Valid government-issued ID')
            ->assertJsonPath('request.details.requirements.purok_certificate.label', 'Purok Certificate');

        $documentRequest = DocumentRequest::firstOrFail();
        Storage::disk('local')->assertExists($documentRequest->details['requirements']['valid_id']['path']);
        Storage::disk('local')->assertExists($documentRequest->details['requirements']['purok_certificate']['path']);
    }

    public function test_resident_can_have_at_most_three_requests_without_generated_previews(): void
    {
        $this->createRequestLimitDocumentType();
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        DocumentRequest::factory()->count(3)->create([
            'resident_id' => $resident->id,
            'document_type' => 'Request Limit Test',
            'status' => 'pending',
            'document_generated_at' => null,
        ]);

        $this->postJson('/api/resident/requests', $this->requestLimitSubmission())
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'You can have up to 3 active document requests at a time. A new request is allowed after staff generate a preview for one of your existing requests.',
            );

        $this->assertSame(3, DocumentRequest::where('resident_id', $resident->id)->count());
    }

    public function test_generated_preview_opens_a_request_slot(): void
    {
        $this->createRequestLimitDocumentType();
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        DocumentRequest::factory()->count(2)->create([
            'resident_id' => $resident->id,
            'document_type' => 'Request Limit Test',
            'status' => 'pending',
            'document_generated_at' => null,
        ]);
        DocumentRequest::factory()->create([
            'resident_id' => $resident->id,
            'document_type' => 'Request Limit Test',
            'status' => 'processing',
            'document_content' => ['full_name' => 'Jane Doe'],
            'document_generated_at' => now(),
        ]);

        $this->getJson('/api/resident/requests')
            ->assertOk()
            ->assertJsonPath('active_request_count', 2)
            ->assertJsonPath('request_limit', 3)
            ->assertJsonPath('available_request_slots', 1);

        $this->postJson('/api/resident/requests', $this->requestLimitSubmission())
            ->assertCreated();

        $this->assertSame(4, DocumentRequest::where('resident_id', $resident->id)->count());
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
                'address' => '123 Main Street',
                'date_of_birth' => '1990-01-15',
                'age' => '36',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'citizenship' => 'Filipino',
                'purok' => 'Purok 1',
                'purpose' => 'Employment',
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'requirements.valid_id',
                'requirements.purok_certificate',
            ]);
    }

    public function test_clearance_does_not_require_address(): void
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
                'age' => '36',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'citizenship' => 'Filipino',
                'purpose' => 'Employment',
            ],
            'requirements' => [
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
            ],
        ])->assertCreated()
            ->assertJsonMissingPath('request.details.form_fields.address');
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
                'address' => '123 Main Street',
                'date_of_birth' => '1990-01-15',
                'age' => '36',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'purpose' => 'Employment',
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('form_fields.years_of_residency');
    }

    public function test_residency_requires_a_purok_certificate_and_valid_id(): void
    {
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);

        $this->withHeader('Accept', 'application/json')->post('/api/resident/requests', [
            'document_type' => 'Barangay Residency',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'address' => '123 Main Street',
                'date_of_birth' => '1990-01-15',
                'age' => '36',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'years_of_residency' => '5',
                'purpose' => 'Employment',
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors([
                'requirements.purok_certificate',
                'requirements.valid_id',
            ]);
    }

    public function test_verified_resident_can_request_residency_with_required_uploads(): void
    {
        Storage::fake('local');
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);

        $this->post('/api/resident/requests', [
            'document_type' => 'Barangay Residency',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'address' => '123 Main Street',
                'date_of_birth' => '1990-01-15',
                'age' => '1',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'years_of_residency' => '5',
                'months_of_residency' => '3',
                'purpose' => 'Employment',
            ],
            'requirements' => [
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ])->assertCreated()
            ->assertJsonPath('request.document_type', 'Barangay Residency')
            ->assertJsonPath('request.fee', '130.00')
            ->assertJsonPath('request.details.form_fields.age', Carbon::parse('1990-01-15')->age)
            ->assertJsonPath('request.details.requirements.valid_id.label', 'Valid government-issued ID')
            ->assertJsonPath('request.details.requirements.purok_certificate.label', 'Purok Certificate');
    }

    public function test_barangay_clearance_accepts_a_custom_purpose(): void
    {
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);

        $this->withHeader('Accept', 'application/json')->post('/api/resident/requests', [
            'document_type' => 'Barangay Certification',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'address' => '123 Main Street',
                'date_of_birth' => '1990-01-15',
                'age' => '36',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'citizenship' => 'Filipino',
                'purok' => 'Purok 1',
                'purpose' => 'For personal records',
            ],
            'requirements' => [
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ])->assertCreated()
            ->assertJsonPath('request.details.form_fields.purpose', 'For personal records');
    }

    public function test_first_time_job_seeker_certificate_is_free_and_can_only_be_issued_once(): void
    {
        Storage::fake('local');
        $resident = Resident::factory()->create([
            'verification_status' => 'verified',
        ]);
        Sanctum::actingAs($resident);
        $submission = [
            'document_type' => 'First-Time Jobseeker Certification',
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'address' => '123 Main Street',
                'date_of_birth' => '1990-01-15',
                'age' => '1',
                'sex' => 'Female',
                'citizenship' => 'Filipino',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'purpose' => 'Employment',
            ],
            'requirements' => [
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ];

        $this->post('/api/resident/requests', $submission)
            ->assertCreated()
            ->assertJsonPath('request.fee', '0.00')
            ->assertJsonPath('request.details.form_fields.age', Carbon::parse('1990-01-15')->age);

        DocumentRequest::firstOrFail()->update(['status' => 'completed']);

        $this->withHeader('Accept', 'application/json')
            ->post('/api/resident/requests', $submission)
            ->assertStatus(409)
            ->assertJsonPath('message', 'This one-time certificate has already been requested or issued.');
    }

    public function test_business_clearance_requires_business_and_resident_information_and_keeps_fee_pending(): void
    {
        Storage::fake('local');
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        $this->post('/api/resident/requests', [
            'document_type' => 'Business Permit',
            'form_fields' => [
                'contact_number' => '09171234567',
                'full_name' => 'Jane Doe',
                'address' => '123 Main Street',
                'sex' => 'Female',
                'business_name' => 'Jane Store',
                'business_address' => '456 Market Road',
                'occupation' => 'Store owner',
                'income' => '25000',
            ],
            'requirements' => [
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ])->assertCreated()
            ->assertJsonPath('request.fee', '0.00')
            ->assertJsonPath('request.details.fee_mode', 'assessed')
            ->assertJsonPath('request.details.fee_assessed', false);
    }

    private function createRequestLimitDocumentType(): void
    {
        DocumentType::create([
            'name' => 'Request Limit Test',
            'enabled' => true,
            'value' => 'Request Limit Test',
            'label' => 'Request Limit Test',
            'fee_mode' => 'fixed',
            'fee' => 0,
            'one_time' => false,
            'active' => true,
            'applicant_fields' => [
                ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true],
            ],
            'fields' => [],
            'requirements' => [],
        ]);
    }

    private function requestLimitSubmission(): array
    {
        return [
            'document_type' => 'Request Limit Test',
            'form_fields' => ['full_name' => 'Jane Doe'],
        ];
    }
}
