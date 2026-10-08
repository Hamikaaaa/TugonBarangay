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
        $this->assertTrue(Storage::disk('local')->exists($complaint->evidence_path));
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

    public function test_priority_is_based_on_reported_severity_across_categories(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        $reports = [
            [
                'category' => 'Noise and Disturbance',
                'subject' => 'Loud music after hours',
                'description' => 'The music is loud, but there are no threats or violence.',
                'priority' => 'normal',
            ],
            [
                'category' => 'Neighbor Dispute',
                'subject' => 'Verbal argument',
                'description' => 'We argued verbally; no one was hurt and there was no physical contact or threat.',
                'priority' => 'normal',
            ],
            [
                'category' => 'Noise and Disturbance',
                'subject' => 'People are fighting next door',
                'description' => 'One neighbor punched another person during the fight.',
                'priority' => 'urgent',
            ],
            [
                'category' => 'Property Disputes',
                'subject' => 'Boundary disagreement',
                'description' => 'We disagree about the fence location; there is no damage or violence.',
                'priority' => 'normal',
            ],
            [
                'category' => 'Property Disputes',
                'subject' => 'Damage to my home',
                'description' => 'Someone broke into my house and smashed the front door.',
                'priority' => 'urgent',
            ],
            [
                'category' => 'Animal Related Concern',
                'subject' => 'Stray dog near the road',
                'description' => 'The dog is calm, has not attacked anyone, and no one was injured.',
                'priority' => 'normal',
            ],
            [
                'category' => 'Animal Related Concern',
                'subject' => 'Dog attacked a child',
                'description' => 'The dog lunged at my child and bit her.',
                'priority' => 'urgent',
            ],
            [
                'category' => 'Other Barangay Concern',
                'subject' => 'Possible immediate danger',
                'description' => 'A neighbor said he would hurt me and showed a knife.',
                'priority' => 'urgent',
            ],
            [
                'category' => 'Environmental Concern',
                'subject' => 'Gas smell in the hallway',
                'description' => 'There is a gas leak while residents are inside the building.',
                'priority' => 'urgent',
            ],
        ];

        foreach ($reports as $report) {
            $this->postJson('/api/resident/complaints', [
                'category' => $report['category'],
                'subject' => $report['subject'],
                'description' => $report['description'],
            ])->assertCreated()
                ->assertJsonPath('complaint.category', $report['category'])
                ->assertJsonPath('complaint.priority', $report['priority']);
        }
    }

    public function test_manually_configured_urgent_keywords_flag_submitted_complaints(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        Sanctum::actingAs($resident);

        $this->postJson('/api/resident/complaints', [
            'category' => 'Noise and Disturbance',
            'subject' => 'Noise complaint',
            'description' => 'A resident is being held against their will.',
        ])->assertCreated()
            ->assertJsonPath('complaint.category', 'Noise and Disturbance')
            ->assertJsonPath('complaint.priority', 'urgent');

        $this->postJson('/api/resident/complaints', [
            'category' => 'Noise and Disturbance',
            'subject' => 'Verbal disagreement',
            'description' => 'There is no hostage situation or kidnapping; this was only a verbal disagreement.',
        ])->assertCreated()
            ->assertJsonPath('complaint.category', 'Noise and Disturbance')
            ->assertJsonPath('complaint.priority', 'normal');
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
