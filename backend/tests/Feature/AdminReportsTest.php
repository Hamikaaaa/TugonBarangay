<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\ChatbotEscalation;
use App\Models\Complaint;
use App\Models\DocumentRequest;
use App\Models\Feedback;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_report_aggregates_cross_service_activity_for_selected_months(): void
    {
        $this->travelTo(now()->setDate(2026, 10, 8)->setTime(12, 0));
        $resident = Resident::factory()->create(['created_at' => now()->subMonth()]);

        DocumentRequest::factory()->create([
            'resident_id' => $resident->id,
            'status' => 'completed',
            'created_at' => now()->subMonth(),
        ]);
        Complaint::create([
            'resident_id' => $resident->id,
            'category' => 'Street lighting',
            'subject' => 'Broken street light',
            'description' => 'The street light is not working.',
            'status' => 'resolved',
            'created_at' => now(),
        ]);
        ChatbotEscalation::create([
            'resident_id' => $resident->id,
            'question' => 'How do I apply?',
            'status' => 'replied',
            'created_at' => now(),
        ]);
        Feedback::create([
            'resident_id' => $resident->id,
            'service_type' => 'complaint',
            'rating' => 4,
            'created_at' => now(),
        ]);
        Feedback::create([
            'resident_id' => $resident->id,
            'service_type' => 'bantaybot',
            'rating' => 2,
            'created_at' => now(),
        ]);
        DocumentRequest::factory()->create([
            'resident_id' => $resident->id,
            'status' => 'pending',
            'created_at' => now()->subMonths(8),
        ]);

        $admin = Admin::create([
            'name' => 'Reports Admin',
            'email' => 'reports-admin@example.com',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/reports?months=6')
            ->assertOk()
            ->assertJsonPath('period.months', 6)
            ->assertJsonPath('summary.document_requests.total', 1)
            ->assertJsonPath('summary.document_requests.completed', 1)
            ->assertJsonPath('summary.complaints.resolved', 1)
            ->assertJsonPath('summary.chatbot_escalations.replied', 1)
            ->assertJsonPath('summary.new_residents', 1)
            ->assertJsonPath('summary.feedback.average_rating', 3)
            ->assertJsonPath('monthly.4.document_requests', 1)
            ->assertJsonPath('monthly.4.new_residents', 1)
            ->assertJsonPath('monthly.5.complaints', 1)
            ->assertJsonPath('monthly.5.feedback', 2)
            ->assertJsonPath('monthly.5.feedback_average_rating', 3);

        $this->assertCount(6, $response->json('monthly'));
        $this->assertSame(
            [['category' => 'Street lighting', 'count' => 1]],
            $response->json('complaint_categories'),
        );
    }

    public function test_cross_service_report_is_admin_only_and_validates_period(): void
    {
        Sanctum::actingAs(Resident::factory()->create());
        $this->getJson('/api/admin/reports')->assertForbidden();

        Sanctum::actingAs(Admin::create([
            'name' => 'Reports Admin',
            'email' => 'reports-period-admin@example.com',
            'password' => 'password123',
        ]));
        $this->getJson('/api/admin/reports?months=5')->assertUnprocessable();
    }
}
