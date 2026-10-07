<?php

namespace Tests\Feature;

use App\Models\DocumentRequest;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResidentDocumentCorrectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_replace_requested_document_and_resubmit_for_verification(): void
    {
        Storage::fake('local');
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        $oldIdFile = UploadedFile::fake()->create('old-valid-id.pdf', 10, 'application/pdf')
            ->store("document-requests/{$resident->id}", 'local');
        $oldPurokCertificate = UploadedFile::fake()->create('old-purok-certificate.pdf', 10, 'application/pdf')
            ->store("document-requests/{$resident->id}", 'local');
        $documentRequest = DocumentRequest::create([
            'resident_id' => $resident->id,
            'document_type' => 'Barangay Certification',
            'status' => 'for_correction',
            'staff_remarks' => 'Please upload a clearer copy of your ID.',
            'document_content' => ['full_name' => 'Old applicant name'],
            'document_generated_at' => now(),
            'details' => [
                'notes' => 'For employment',
                'form_fields' => ['purpose' => 'Employment'],
                'requirements' => [
                    'purok_certificate' => [
                        'label' => 'Purok Certificate',
                        'path' => $oldPurokCertificate,
                        'original_name' => 'old-purok-certificate.pdf',
                    ],
                    'valid_id' => [
                        'label' => 'Valid government-issued ID',
                        'path' => $oldIdFile,
                        'original_name' => 'old-valid-id.pdf',
                    ],
                ],
            ],
        ]);
        Sanctum::actingAs($resident);

        $response = $this->withHeader('Accept', 'application/json')->post(
            "/api/resident/requests/{$documentRequest->id}/resubmit",
            [
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
                    'valid_id' => UploadedFile::fake()->create('clear-valid-id.pdf', 10, 'application/pdf'),
                ],
            ],
        );

        $response->assertOk()
            ->assertJsonPath('request.status', 'pending')
            ->assertJsonPath('request.staff_remarks', 'Please upload a clearer copy of your ID.');

        $updatedRequest = $documentRequest->fresh();
        $newFile = $updatedRequest->details['requirements']['valid_id']['path'];
        $this->assertNotSame($oldIdFile, $newFile);
        Storage::disk('local')->assertExists($newFile);
        Storage::disk('local')->assertMissing($oldIdFile);
        Storage::disk('local')->assertMissing($oldPurokCertificate);
        $this->assertSame('For employment', $updatedRequest->details['notes']);
        $this->assertNull($updatedRequest->document_content);
        $this->assertNull($updatedRequest->document_generated_at);
        $this->assertDatabaseHas('document_request_events', [
            'document_request_id' => $documentRequest->id,
            'actor_id' => $resident->id,
            'actor_role' => 'resident',
            'action' => 'request_resubmitted',
            'from_status' => 'for_correction',
            'to_status' => 'pending',
        ]);
    }

    public function test_resident_cannot_resubmit_another_residents_request(): void
    {
        $owner = Resident::factory()->create(['verification_status' => 'verified']);
        $otherResident = Resident::factory()->create(['verification_status' => 'verified']);
        $documentRequest = DocumentRequest::create([
            'resident_id' => $owner->id,
            'document_type' => 'Barangay Certification',
            'status' => 'for_correction',
            'details' => [],
        ]);
        Sanctum::actingAs($otherResident);

        $this->postJson("/api/resident/requests/{$documentRequest->id}/resubmit")
            ->assertNotFound();
    }

    public function test_resident_can_only_resubmit_requests_marked_for_correction(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        $documentRequest = DocumentRequest::create([
            'resident_id' => $resident->id,
            'document_type' => 'Barangay Certification',
            'status' => 'pending',
            'details' => [],
        ]);
        Sanctum::actingAs($resident);

        $this->postJson("/api/resident/requests/{$documentRequest->id}/resubmit")
            ->assertStatus(409);
    }

    public function test_residency_correction_requires_and_accepts_both_supporting_documents(): void
    {
        Storage::fake('local');
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        $documentRequest = DocumentRequest::create([
            'resident_id' => $resident->id,
            'document_type' => 'Barangay Residency',
            'status' => 'for_correction',
            'details' => ['requirements' => [], 'form_fields' => []],
        ]);
        Sanctum::actingAs($resident);

        $this->postJson("/api/resident/requests/{$documentRequest->id}/resubmit", [
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'address' => '123 Main Street',
                'date_of_birth' => '1990-01-15',
                'age' => '36',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'years_of_residency' => 5,
                'purpose' => 'Employment',
            ],
            'requirements' => [
                'purok_certificate' => UploadedFile::fake()->create('purok-certificate.pdf', 10, 'application/pdf'),
                'valid_id' => UploadedFile::fake()->create('valid-id.pdf', 10, 'application/pdf'),
            ],
        ])->assertOk()
            ->assertJsonPath('request.status', 'pending')
            ->assertJsonPath('request.fee', '130.00')
            ->assertJsonPath('request.details.form_fields.age', \Carbon\Carbon::parse('1990-01-15')->age)
            ->assertJsonPath('request.details.requirements.valid_id.label', 'Valid government-issued ID')
            ->assertJsonPath('request.details.requirements.purok_certificate.label', 'Purok Certificate');
    }
}
