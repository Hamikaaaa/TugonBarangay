<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Feedback;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminFeedbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_search_and_filter_feedback_with_overview_statistics(): void
    {
        $resident = Resident::factory()->create([
            'name' => 'Lydia Santos',
            'email' => 'lydia@example.com',
        ]);
        $otherResident = Resident::factory()->create();
        Feedback::create([
            'resident_id' => $resident->id,
            'service_type' => 'bantaybot',
            'rating' => 5,
            'comment' => 'The chatbot was helpful.',
        ]);
        Feedback::create([
            'resident_id' => $otherResident->id,
            'service_type' => 'complaint',
            'rating' => 2,
            'comment' => 'Please improve the response time.',
        ]);

        $admin = Admin::create([
            'name' => 'Test Admin',
            'email' => 'feedback-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/feedback?search=Lydia')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.resident.name', 'Lydia Santos')
            ->assertJsonPath('stats.total', 2)
            ->assertJsonPath('stats.average_rating', 3.5)
            ->assertJsonPath('stats.five_star', 1)
            ->assertJsonPath('stats.low_rating', 1);

        $this->getJson('/api/admin/feedback?service_type=complaint&rating=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.service_type', 'complaint')
            ->assertJsonPath('data.0.rating', 2);
    }

    public function test_feedback_overview_is_not_available_to_residents(): void
    {
        Sanctum::actingAs(Resident::factory()->create());

        $this->getJson('/api/admin/feedback')->assertForbidden();
    }
}
