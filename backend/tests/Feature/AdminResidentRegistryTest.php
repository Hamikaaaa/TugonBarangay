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
            ->assertJsonPath('data.0.resident_id', null)
            ->assertJsonPath('data.0.first_name', 'Maria');
    }

    public function test_admin_can_bulk_import_registry_rows_and_duplicate_records_are_skipped(): void
    {
        BarangayRegistry::create([
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'date_of_birth' => '1990-04-12',
            'sex' => 'Female',
            'purok' => 'Purok 2',
            'mobile_number' => '09171234567',
        ]);

        $this->postJson('/api/admin/barangay-registry/import', [
            'records' => [
                [
                    'first_name' => 'Maria',
                    'last_name' => 'Santos',
                    'date_of_birth' => '1990-04-12',
                    'sex' => 'Female',
                    'purok' => 'Purok 2',
                    'mobile_number' => '09171234567',
                ],
                [
                    'first_name' => 'Juan',
                    'middle_name' => 'Dela',
                    'last_name' => 'Cruz',
                    'date_of_birth' => '1985-02-01',
                    'sex' => 'Male',
                    'purok' => 'Purok 1',
                    'address' => 'Main Street',
                    'mobile_number' => '09181234567',
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('imported_count', 1)
            ->assertJsonPath('skipped_count', 1);

        $this->assertSame(2, BarangayRegistry::count());
        $imported = BarangayRegistry::where('first_name', 'Juan')->firstOrFail();
        $this->assertNull($imported->resident_id);
    }

    public function test_invalid_bulk_import_rows_do_not_create_partial_registry_records(): void
    {
        $this->postJson('/api/admin/barangay-registry/import', [
            'records' => [
                [
                    'first_name' => 'Jamie',
                    'last_name' => 'Resident',
                    'date_of_birth' => '1990-01-01',
                    'sex' => 'Female',
                    'purok' => 'Purok 1',
                    'mobile_number' => '09171234567',
                ],
                [
                    'first_name' => 'Invalid',
                    'last_name' => 'Resident',
                    'date_of_birth' => '1990-01-01',
                    'sex' => 'Female',
                    'purok' => 'Purok 1',
                    'mobile_number' => '123',
                ],
            ],
        ])->assertUnprocessable()
            ->assertJsonPath('row_errors.3.0', 'The mobile number field format is invalid.');

        $this->assertSame(0, BarangayRegistry::count());
    }

    public function test_resident_account_list_includes_the_sign_in_id(): void
    {
        $resident = Resident::factory()->create();

        $this->getJson('/api/admin/resident-accounts')
            ->assertOk()
            ->assertJsonPath('data.0.id', $resident->id)
            ->assertJsonPath('data.0.resident_id', $resident->resident_id);
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
            ->assertJsonPath('user.verification_status', 'verified')
            ->assertJsonStructure(['user' => ['resident_id']]);

        $resident->refresh();
        $registryRecord->refresh();
        $this->assertMatchesRegularExpression('/^\d{6}$/', $resident->resident_id);
        $this->assertSame($resident->resident_id, $registryRecord->resident_id);
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
