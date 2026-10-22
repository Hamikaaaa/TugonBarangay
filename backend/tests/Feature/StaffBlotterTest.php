<?php

namespace Tests\Feature;

use App\Models\BlotterEntry;
use App\Models\Admin;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StaffBlotterTest extends TestCase
{
    use RefreshDatabase;

    private function staff(array $attributes = []): Staff
    {
        return Staff::factory()->create($attributes);
    }

    public function test_staff_can_list_blotter_entries(): void
    {
        $staff = $this->staff();
        $resident = Resident::factory()->create(['name' => 'Juan Dela Cruz']);

        BlotterEntry::create([
            'resident_id' => $resident->id,
            'resident_name' => $resident->name,
            'complainant_name' => 'Rosa Dela Cruz',
            'incident_type' => 'Noise Disturbance',
            'incident_date' => '2026-10-02',
            'incident_time' => '23:40',
            'location' => 'Purok 1',
            'narrative' => 'Loud videoke session past curfew hours.',
            'status' => 'open',
            'recorded_by' => $staff->id,
        ]);

        Sanctum::actingAs($staff);

        $this->getJson('/api/staff/blotter/entries')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident_name', 'Juan Dela Cruz')
            ->assertJsonPath('data.0.complainant_name', 'Rosa Dela Cruz')
            ->assertJsonPath('data.0.incident_type', 'Noise Disturbance')
            ->assertJsonPath('data.0.status', 'open')
            ->assertJsonPath('status_counts.all', 1)
            ->assertJsonPath('status_counts.open', 1)
            ->assertJsonPath('status_counts.resolved', 0);
    }

    public function test_staff_can_filter_blotter_entries_by_status_and_search(): void
    {
        $staff = $this->staff();

        BlotterEntry::create([
            'resident_name' => 'Ana Villanueva',
            'incident_type' => 'Physical Injury',
            'incident_date' => '2026-10-14',
            'narrative' => 'Minor injury reported after an accidental fall.',
            'status' => 'resolved',
        ]);
        BlotterEntry::create([
            'resident_name' => 'Carlo Mendoza',
            'incident_type' => 'Trespassing',
            'incident_date' => '2026-10-18',
            'narrative' => 'Repeated entry into a private vacant lot.',
            'status' => 'open',
        ]);

        Sanctum::actingAs($staff);

        $this->getJson('/api/staff/blotter/entries?status=resolved')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident_name', 'Ana Villanueva');

        $this->getJson('/api/staff/blotter/entries?search=Mendoza')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident_name', 'Carlo Mendoza');
    }

    public function test_staff_can_list_blottered_residents(): void
    {
        $staff = $this->staff();
        $resident = Resident::factory()->create(['name' => 'Maria Santos']);

        BlotterEntry::create([
            'resident_id' => $resident->id,
            'resident_name' => $resident->name,
            'incident_type' => 'Property Damage',
            'incident_date' => '2026-09-30',
            'narrative' => 'Damaged store glass panel reported.',
            'status' => 'open',
        ]);
        BlotterEntry::create([
            'resident_id' => $resident->id,
            'resident_name' => $resident->name,
            'incident_type' => 'Verbal Abuse / Oral Defamation',
            'incident_date' => '2026-10-05',
            'narrative' => 'Oral defamation incident reported.',
            'status' => 'resolved',
        ]);

        Sanctum::actingAs($staff);

        $this->getJson('/api/staff/blotter/residents')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident_name', 'Maria Santos')
            ->assertJsonPath('data.0.entries_count', 2)
            ->assertJsonPath('data.0.latest_incident_type', 'Verbal Abuse / Oral Defamation')
            ->assertJsonPath('data.0.latest_incident_date', '2026-10-05');
    }

    public function test_staff_can_search_blottered_residents(): void
    {
        $staff = $this->staff();

        BlotterEntry::create([
            'resident_name' => 'Pedro Reyes',
            'incident_type' => 'Theft',
            'incident_date' => '2026-10-09',
            'narrative' => 'Item taken from a parked tricycle.',
            'status' => 'referred',
        ]);
        BlotterEntry::create([
            'resident_name' => 'Liza Bautista',
            'incident_type' => 'Domestic Dispute',
            'incident_date' => '2026-10-20',
            'narrative' => 'Household dispute brought for mediation.',
            'status' => 'open',
        ]);

        Sanctum::actingAs($staff);

        $this->getJson('/api/staff/blotter/residents?search=Pedro')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident_name', 'Pedro Reyes');
    }

    public function test_staff_can_filter_blotter_entries_by_resident(): void
    {
        $staff = $this->staff();
        $resident = Resident::factory()->create(['name' => 'Maria Santos']);
        $otherResident = Resident::factory()->create(['name' => 'Pedro Reyes']);

        BlotterEntry::create([
            'resident_id' => $resident->id,
            'resident_name' => $resident->name,
            'incident_type' => 'Property Damage',
            'incident_date' => '2026-09-30',
            'narrative' => 'Damaged store glass panel reported.',
            'status' => 'open',
        ]);
        BlotterEntry::create([
            'resident_id' => $otherResident->id,
            'resident_name' => $otherResident->name,
            'incident_type' => 'Theft',
            'incident_date' => '2026-10-09',
            'narrative' => 'Item taken from a parked tricycle.',
            'status' => 'resolved',
        ]);

        Sanctum::actingAs($staff);

        $this->getJson('/api/staff/blotter/entries?resident='.$resident->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident_name', 'Maria Santos')
            ->assertJsonPath('status_counts.all', 1)
            ->assertJsonPath('status_counts.open', 1)
            ->assertJsonPath('status_counts.resolved', 0);

        $this->getJson('/api/staff/blotter/entries?resident=Maria%20Santos')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident_name', 'Maria Santos');
    }

    public function test_staff_can_record_a_new_blotter_entry(): void
    {
        $staff = $this->staff();
        $resident = Resident::factory()->create(['name' => 'Ana Villanueva']);

        Sanctum::actingAs($staff);

        $this->postJson('/api/staff/blotter/entries', [
            'resident_id' => $resident->id,
            'resident_name' => $resident->name,
            'complainant_name' => 'Luis Reyes',
            'incident_type' => 'Noise Disturbance',
            'incident_date' => '2026-10-21',
            'incident_time' => '22:15',
            'location' => 'Purok 2',
            'narrative' => 'Residents reported loud music past the curfew hour.',
            'status' => 'open',
        ])
            ->assertCreated()
            ->assertJsonPath('data.resident_name', 'Ana Villanueva')
            ->assertJsonPath('data.resident_id', $resident->id)
            ->assertJsonPath('data.complainant_name', 'Luis Reyes')
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.reference_code', 'BLT-00001');

        $this->assertDatabaseHas('blotter_entries', [
            'resident_id' => $resident->id,
            'complainant_name' => 'Luis Reyes',
            'incident_type' => 'Noise Disturbance',
            'recorded_by' => $staff->id,
        ]);
    }

    public function test_blotter_entry_requires_a_resident_name_when_no_account_is_linked(): void
    {
        $staff = $this->staff();
        Sanctum::actingAs($staff);

        $this->postJson('/api/staff/blotter/entries', [
            'incident_type' => 'Others',
            'incident_date' => '2026-10-21',
            'narrative' => 'An entry without any resident information attached.',
        ])->assertStatus(422);
    }

    public function test_blotter_entries_require_staff_authentication(): void
    {
        $this->getJson('/api/staff/blotter/entries')->assertStatus(401);
        $this->getJson('/api/staff/blotter/residents')->assertStatus(401);
    }

    public function test_admin_can_list_blotter_entries(): void
    {
        $admin = Admin::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => 'password',
        ]);
        BlotterEntry::create([
            'resident_name' => 'Maria Santos',
            'complainant_name' => 'Luis Reyes',
            'incident_type' => 'Property Damage',
            'incident_date' => '2026-09-30',
            'narrative' => 'Damaged store glass panel reported.',
            'status' => 'open',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/blotter/entries')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident_name', 'Maria Santos')
            ->assertJsonPath('data.0.complainant_name', 'Luis Reyes')
            ->assertJsonPath('data.0.incident_type', 'Property Damage');
    }

    public function test_staff_can_update_blotter_entry_status(): void
    {
        $staff = $this->staff();
        $entry = BlotterEntry::create([
            'resident_name' => 'Maria Santos',
            'incident_type' => 'Property Damage',
            'incident_date' => '2026-09-30',
            'narrative' => 'Damaged store glass panel reported.',
            'status' => 'open',
            'recorded_by' => $staff->id,
        ]);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/staff/blotter/entries/{$entry->id}", [
            'status' => 'resolved',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved')
            ->assertJsonPath('data.reference_code', $entry->reference_code);

        $this->assertDatabaseHas('blotter_entries', [
            'id' => $entry->id,
            'status' => 'resolved',
        ]);
    }

    public function test_staff_can_add_remark_to_blotter_entry(): void
    {
        $staff = $this->staff();
        $entry = BlotterEntry::create([
            'resident_name' => 'Maria Santos',
            'incident_type' => 'Property Damage',
            'incident_date' => '2026-09-30',
            'narrative' => 'Damaged store glass panel reported.',
            'status' => 'open',
            'remarks' => 'Initial remark.',
            'recorded_by' => $staff->id,
        ]);

        Sanctum::actingAs($staff);

        $this->patchJson("/api/staff/blotter/entries/{$entry->id}", [
            'remark' => 'Follow-up: glass panel has been replaced.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'open');

        $this->assertDatabaseHas('blotter_entries', [
            'id' => $entry->id,
            'remarks' => 'Initial remark.' . "\n\n--- Added remark ---\nFollow-up: glass panel has been replaced.",
        ]);
    }

    public function test_updating_blotter_entry_requires_staff_authentication(): void
    {
        $entry = BlotterEntry::create([
            'resident_name' => 'Maria Santos',
            'incident_type' => 'Property Damage',
            'incident_date' => '2026-09-30',
            'narrative' => 'Damaged store glass panel reported.',
            'status' => 'open',
        ]);

        $this->patchJson("/api/staff/blotter/entries/{$entry->id}", [
            'status' => 'resolved',
        ])->assertStatus(401);
    }
}
