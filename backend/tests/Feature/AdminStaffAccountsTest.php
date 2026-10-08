<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminStaffAccountsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(Admin::create([
            'name' => 'Staff Admin',
            'email' => 'staff-admin@example.com',
            'password' => 'Password123!',
        ]));
    }

    public function test_admin_can_create_staff_accounts_for_supported_designations(): void
    {
        $this->postJson('/api/admin/staff-accounts', [
            'name' => 'Document Officer',
            'email' => 'documents@example.com',
            'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated()
            ->assertJsonPath('staff.name', 'Document Officer')
            ->assertJsonPath('staff.designation', Staff::DOCUMENT_REQUEST_OFFICER)
            ->assertJsonPath('staff.is_active', true);

        $this->postJson('/api/admin/staff-accounts', [
            'name' => 'Complaint Officer',
            'email' => 'complaints@example.com',
            'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated();

        $this->assertDatabaseCount('staff', 2);
        $this->getJson('/api/admin/staff-accounts')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_disabling_staff_revokes_existing_sessions_and_blocks_login(): void
    {
        $staff = Staff::factory()->create([
            'password' => 'Password123!',
            'is_active' => true,
        ]);
        $staff->createToken('staff-test');

        $this->patchJson("/api/admin/staff-accounts/{$staff->id}/status", [
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('staff.is_active', false);

        $this->assertSame(0, $staff->tokens()->count());

        $this->postJson('/api/login', [
            'email' => $staff->email,
            'password' => 'Password123!',
        ])->assertForbidden()
            ->assertJsonPath('message', 'This staff account is disabled. Please contact an administrator.');

        $this->patchJson("/api/admin/staff-accounts/{$staff->id}/status", [
            'is_active' => true,
        ])->assertOk()
            ->assertJsonPath('staff.is_active', true);
    }
}
