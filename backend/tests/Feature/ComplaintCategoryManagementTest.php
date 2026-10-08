<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\ComplaintCategory;
use App\Models\Resident;
use App\Models\Staff;
use Database\Seeders\ComplaintCategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ComplaintCategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_add_and_disable_a_complaint_category(): void
    {
        $admin = Admin::create([
            'name' => 'Category Admin',
            'email' => 'category-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/complaint-categories', [
            'name' => 'Emergency Incident',
            'description' => 'Urgent public safety concerns.',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Emergency Incident')
            ->assertJsonPath('data.enabled', true);

        $category = ComplaintCategory::where('name', 'Emergency Incident')->firstOrFail();
        $this->patchJson('/api/admin/complaint-categories/'.$category->id, [
            'enabled' => false,
        ])->assertOk()
            ->assertJsonPath('data.enabled', false);

        $this->assertDatabaseHas('complaint_categories', [
            'id' => $category->id,
            'name' => 'Emergency Incident',
            'enabled' => false,
        ]);
    }

    public function test_staff_cannot_manage_categories_and_residents_only_receive_enabled_categories(): void
    {
        $staff = Staff::factory()->create([
            'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
        ]);
        Sanctum::actingAs($staff);

        $this->postJson('/api/admin/complaint-categories', [
            'name' => 'Staff-created category',
        ])->assertForbidden();

        $this->getJson('/api/staff/complaint-categories')
            ->assertOk()
            ->assertJsonPath('data', []);

        ComplaintCategory::create(['name' => 'Community Safety', 'enabled' => true]);
        ComplaintCategory::create(['name' => 'Disabled Category', 'enabled' => false]);

        Sanctum::actingAs(Resident::factory()->create());

        $this->getJson('/api/resident/complaint-categories')
            ->assertOk()
            ->assertJsonPath('data', ['Community Safety']);
    }

    public function test_category_seeder_preserves_existing_categories_and_admin_availability(): void
    {
        ComplaintCategory::create([
            'name' => 'Noise and Disturbance',
            'enabled' => false,
        ]);

        $this->seed(ComplaintCategorySeeder::class);

        $this->assertSame(1, ComplaintCategory::where('name', 'Noise and Disturbance')->count());
        $this->assertDatabaseHas('complaint_categories', [
            'name' => 'Noise and Disturbance',
            'enabled' => false,
        ]);
        $this->assertDatabaseHas('complaint_categories', [
            'name' => 'Other Barangay Concern',
            'enabled' => true,
        ]);
    }
}