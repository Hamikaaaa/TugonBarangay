<?php

namespace Tests\Feature;

use App\Models\Resident;
use App\Models\ResidentNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResidentAccountFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_manage_their_notifications(): void
    {
        $resident = Resident::factory()->create();
        $otherResident = Resident::factory()->create();
        $notification = ResidentNotification::create([
            'resident_id' => $resident->id,
            'type' => 'document_request',
            'title' => 'Request update',
            'message' => 'Your request is being reviewed.',
        ]);
        $otherNotification = ResidentNotification::create([
            'resident_id' => $otherResident->id,
            'type' => 'complaint',
            'title' => 'Complaint update',
            'message' => 'Your complaint was received.',
        ]);

        Sanctum::actingAs($resident);

        $this->getJson('/api/resident/dashboard')
            ->assertOk()
            ->assertJsonPath('unread_notifications', 1);

        $this->patchJson("/api/resident/notifications/{$notification->id}", ['read' => true])
            ->assertOk()
            ->assertJsonPath('notification.id', $notification->id);
        $this->assertNotNull($notification->fresh()->read_at);

        $this->patchJson("/api/resident/notifications/{$notification->id}", ['read' => false])
            ->assertOk();
        $this->assertNull($notification->fresh()->read_at);

        $this->patchJson('/api/resident/notifications/read-all')->assertOk();
        $this->assertNotNull($notification->fresh()->read_at);
        $this->getJson('/api/resident/dashboard')
            ->assertOk()
            ->assertJsonPath('unread_notifications', 0);
        $this->assertDatabaseHas('notifications', [
            'id' => $notification->id,
            'resident_id' => $resident->id,
        ]);
        $this->assertNotNull($this->getJson('/api/resident/notifications')
            ->assertOk()
            ->json('data.0.read_at'));

        $this->deleteJson("/api/resident/notifications/{$notification->id}")
            ->assertOk();
        $this->deleteJson("/api/resident/notifications/{$otherNotification->id}")
            ->assertNotFound();
    }

    public function test_resident_can_update_contact_information(): void
    {
        $resident = Resident::factory()->create();
        Sanctum::actingAs($resident);

        $this->patchJson('/api/resident/profile', [
            'address' => 'Purok 3, Barangay Poblacion Oriental',
            'mobile_number' => '09171234567',
        ])->assertOk()
            ->assertJsonPath('user.address', 'Purok 3, Barangay Poblacion Oriental')
            ->assertJsonPath('user.mobile_number', '09171234567');

        $this->assertDatabaseHas('residents', [
            'id' => $resident->id,
            'address' => 'Purok 3, Barangay Poblacion Oriental',
            'mobile_number' => '09171234567',
        ]);
    }
}
