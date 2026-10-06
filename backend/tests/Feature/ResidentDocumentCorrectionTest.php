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
        $oldFile = UploadedFile::fake()->create('old-valid-id.pdf', 10, 'application/pdf')
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
                    'valid_id' => [
                        'label' => 'Valid government-issued ID',
                        'path' => $oldFile,
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
                    'date_of_birth' => '1990-01-15',
                    'sex' => 'Female',
                    'civil_status' => 'Single',
                    'purok' => 'Purok 1',
                    'contact_number' => '09123456789',
                    'email_address' => 'jane@example.com',
                    'purpose' => 'Employment',
                ],
                'requirements' => [
                    'valid_id' => UploadedFile::fake()->create('clear-valid-id.pdf', 10, 'application/pdf'),
                ],
            ],
        );

        $response->assertOk()
            ->assertJsonPath('request.status', 'pending')
            ->assertJsonPath('request.staff_remarks', 'Please upload a clearer copy of your ID.');

        $updatedRequest = $documentRequest->fresh();
        $newFile = $updatedRequest->details['requirements']['valid_id']['path'];
        $this->assertNotSame($oldFile, $newFile);
        Storage::disk('local')->assertExists($newFile);
        Storage::disk('local')->assertMissing($oldFile);
        $this->assertSame('For employment', $updatedRequest->details['notes']);
        $this->assertNull($updatedRequest->document_content);
        $this->assertNull($updatedRequest->document_generated_at);
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

    public function test_optional_residency_documents_remain_optional_during_correction(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        $documentRequest = DocumentRequest::create([
            'resident_id' => $resident->id,
            'document_type' => 'Barangay Residency',
            'status' => 'for_correction',
            'details' => ['requirements' => []],
        ]);
        Sanctum::actingAs($resident);

        $this->postJson("/api/resident/requests/{$documentRequest->id}/resubmit", [
            'form_fields' => [
                'full_name' => 'Jane Doe',
                'date_of_birth' => '1990-01-15',
                'sex' => 'Female',
                'civil_status' => 'Single',
                'purok' => 'Purok 1',
                'municipality_city' => 'Consolacion',
                'province' => 'Cebu',
                'years_of_residency' => 5,
                'purpose' => 'Employment',
            ],
        ])->assertOk()
            ->assertJsonPath('request.status', 'pending');
    }
}
