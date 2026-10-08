<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\BarangayRegistry;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminResidentRegistryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(Admin::create([
            'name' => 'Registry Admin',
            'email' => 'registry-admin@example.com',
            'password' => 'password123',
        ]));
    }

    public function test_admin_can_search_paginated_barangay_registry_masterlist(): void
    {
        $match = BarangayRegistry::create([
            'first_name' => 'Maria',
            'middle_name' => 'Luz',
            'last_name' => 'Santos',
            'date_of_birth' => '1990-04-12',
            'sex' => 'Female',
            'purok' => 'Purok 2',
            'address' => 'Main Street',
            'mobile_number' => '09171234567',
        ]);
        BarangayRegistry::create([
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'date_of_birth' => '1985-02-01',
            'sex' => 'Male',
            'purok' => 'Purok 1',
            'mobile_number' => '09181234567',
        ]);

        $this->getJson('/api/admin/barangay-registry?search=Maria&per_page=1')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $match->id)
            ->assertJsonPath('data.0.first_name', 'Maria');
    }

    public function test_pending_account_review_includes_registry_match_and_admin_can_approve(): void
    {
        $registryRecord = BarangayRegistry::create([
            'first_name' => 'Ana',
            'middle_name' => 'Mae',
            'last_name' => 'Reyes',
            'date_of_birth' => '1994-07-22',
            'sex' => 'Female',
            'purok' => 'Purok 3',
            'address' => 'Barangay Road',
            'mobile_number' => '09192345678',
        ]);
        $resident = Resident::factory()->create([
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'date_of_birth' => '1994-07-22',
            'sex' => 'Female',
            'purok' => 'Purok 3',
            'verification_status' => 'pending',
        ]);

        $this->getJson('/api/admin/pending-residents')
            ->assertOk()
            ->assertJsonPath('0.id', $resident->id)
            ->assertJsonPath('0.registry_match.id', $registryRecord->id);

        $this->patchJson("/api/admin/residents/{$resident->id}/verify")
            ->assertOk()
            ->assertJsonPath('user.verification_status', 'verified');
    }

    public function test_resident_registry_dashboard_reports_registry_and_verification_totals(): void
    {
        BarangayRegistry::create([
            'first_name' => 'Liza',
            'last_name' => 'Garcia',
            'date_of_birth' => '1992-03-14',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'mobile_number' => '09170000001',
        ]);

        Resident::factory()->create([
            'first_name' => 'Liza',
            'last_name' => 'Garcia',
            'date_of_birth' => '1992-03-14',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'verification_status' => 'pending',
        ]);
        Resident::factory()->create([
            'first_name' => 'Marco',
            'last_name' => 'Lopez',
            'verification_status' => 'pending',
        ]);
        Resident::factory()->create(['verification_status' => 'verified']);
        Resident::factory()->create(['verification_status' => 'rejected']);

        $this->getJson('/api/admin/residents/registry-stats')
            ->assertOk()
            ->assertJsonPath('registry_total', 1)
            ->assertJsonPath('pending_total', 2)
            ->assertJsonPath('pending_matched', 1)
            ->assertJsonPath('pending_unmatched', 1)
            ->assertJsonPath('verified_total', 1)
            ->assertJsonPath('rejected_total', 1);
    }
}
