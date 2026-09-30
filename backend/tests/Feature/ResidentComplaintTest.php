<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResidentComplaintTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_resident_can_submit_complaint_with_private_evidence(): void
    {
        Storage::fake('local');
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        $response = $this->withHeader('Accept', 'application/json')->post('/api/resident/complaints', [
            'category' => 'Road and Public',
            'subject' => 'Blocked drainage near Purok 2',
            'incident_date' => '2026-09-20',
            'location' => 'Purok 2, near the community hall',
            'description' => 'The drainage has been blocked after the recent rain.',
            'relevant_information' => 'Water is collecting on the road.',
            'evidence' => UploadedFile::fake()->create('drainage.jpg', 10, 'image/jpeg'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('complaint.category', 'Road and Public')
            ->assertJsonPath('complaint.status', 'pending')
            ->assertJsonPath('complaint.priority', 'normal');

        $complaint = Complaint::firstOrFail();
        $this->assertNotNull($complaint->evidence_path);
        Storage::disk('local')->assertExists($complaint->evidence_path);
        $this->get("/api/resident/complaints/{$complaint->id}/evidence")
            ->assertOk();
    }

    public function test_resident_cannot_download_another_residents_complaint_evidence(): void
    {
        Storage::fake('local');
        $owner = Resident::factory()->create(['verification_status' => 'verified']);
        $otherResident = Resident::factory()->create(['verification_status' => 'verified']);
        $path = UploadedFile::fake()->create('evidence.jpg', 10, 'image/jpeg')->store('complaints/' . $owner->id, 'local');
        $complaint = Complaint::create([
            'resident_id' => $owner->id,
            'category' => 'Public safety',
            'subject' => 'Street light is out',
            'description' => 'The street light is not working.',
            'evidence_path' => $path,
        ]);

        Sanctum::actingAs($otherResident);

        $this->get("/api/resident/complaints/{$complaint->id}/evidence")
            ->assertNotFound();
    }

    public function test_complaint_evidence_must_be_an_allowed_file_under_five_megabytes(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        $this->withHeader('Accept', 'application/json')->post('/api/resident/complaints', [
            'category' => 'Public safety',
            'subject' => 'Street light is out',
            'description' => 'The street light is not working.',
            'evidence' => UploadedFile::fake()->create('notes.txt', 1, 'text/plain'),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('evidence');
    }

    public function test_ongoing_threatening_complaint_is_flagged_for_priority_staff_review(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        $this->withHeader('Accept', 'application/json')->post('/api/resident/complaints', [
            'category' => 'Neighbor Dispute',
            'subject' => 'Escalating ongoing conflict',
            'description' => 'The conflict is still happening and I am being threatened.',
        ])->assertCreated()
            ->assertJsonPath('complaint.priority', 'urgent')
            ->assertJsonPath('complaint.status', 'pending');
    }

    public function test_resident_complaint_history_includes_priority_and_staff_updates(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Complaint::create([
            'resident_id' => $resident->id,
            'category' => 'Neighbor Dispute',
            'subject' => 'Escalating neighbor conflict',
            'description' => 'A conflict is escalating near my home.',
            'status' => 'in_progress',
            'priority' => 'urgent',
            'staff_remarks' => 'An officer has been assigned to review your report.',
        ]);
        Sanctum::actingAs($resident);

        $this->getJson('/api/resident/complaints')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'in_progress')
            ->assertJsonPath('data.0.priority', 'urgent')
            ->assertJsonPath('data.0.staff_remarks', 'An officer has been assigned to review your report.');
    }
}
