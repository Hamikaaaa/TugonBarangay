<?php

namespace Tests\Feature;

use App\Models\ChatbotEscalation;
use App\Models\Admin;
use App\Models\Resident;
use App\Models\Staff;
use Database\Seeders\ChatbotFaqSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResidentBantayBotTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_browse_all_87_categorized_predefined_questions(): void
    {
        $resident = Resident::factory()->create();
        Sanctum::actingAs($resident);
        $this->seed(ChatbotFaqSeeder::class);

        $response = $this->getJson('/api/resident/faqs')->assertOk();

        $this->assertCount(87, $response->json());
        $response->assertJsonFragment([
            'category' => 'Complaint Management',
            'question' => 'How do I file a complaint?',
        ]);
    }

    public function test_bot_matches_predefined_questions_exactly_and_by_terms(): void
    {
        $resident = Resident::factory()->create();
        Sanctum::actingAs($resident);
        $this->seed(ChatbotFaqSeeder::class);

        $this->postJson('/api/resident/bantaybot/ask', [
            'question' => 'WHAT CAN BANTAYBOT DO',
        ])->assertOk()
            ->assertJsonPath('matched', true)
            ->assertJsonPath('faq.category', 'General Information');

        $this->postJson('/api/resident/bantaybot/ask', [
            'question' => 'requirements for Barangay Residency',
        ])->assertOk()
            ->assertJsonPath('matched', true)
            ->assertJsonPath('faq.question', 'What are the requirements for Barangay Residency?');
    }

    public function test_unknown_question_returns_escalation_fallback(): void
    {
        $resident = Resident::factory()->create();
        Sanctum::actingAs($resident);

        $this->postJson('/api/resident/bantaybot/ask', [
            'question' => 'Can you explain quantum teleportation in detail?',
        ])->assertOk()
            ->assertJsonPath('matched', false)
            ->assertJsonPath('faq', null)
            ->assertJsonPath('answer', 'I do not have a confident answer for that question. You can rephrase it or escalate it to barangay staff for follow-up.');
    }

    public function test_resident_can_escalate_a_question_and_receive_a_reference(): void
    {
        $resident = Resident::factory()->create();
        Sanctum::actingAs($resident);

        $response = $this->postJson('/api/resident/bantaybot/escalate', [
            'question' => 'Can I speak to staff about a document request?',
            'category' => 'Document Request',
        ])->assertCreated()
            ->assertJsonPath('reference', 'BOT-00001')
            ->assertJsonPath('escalation.status', 'pending');

        $escalation = ChatbotEscalation::firstOrFail();
        $this->assertSame($resident->id, $escalation->resident_id);
        $this->assertDatabaseHas('notifications', [
            'resident_id' => $resident->id,
            'type' => 'bantaybot_escalation_received',
        ]);
        $this->assertSame('BOT-00001', $response->json('reference'));
    }

    public function test_resident_can_only_see_their_own_escalations_and_staff_replies(): void
    {
        $resident = Resident::factory()->create();
        $otherResident = Resident::factory()->create();
        ChatbotEscalation::create([
            'resident_id' => $resident->id,
            'question' => 'How do I correct my document request?',
            'faq_category' => 'Document Request',
            'status' => 'replied',
            'staff_reply' => 'Open the returned request and select Correct and Resubmit.',
            'replied_at' => now(),
        ]);
        ChatbotEscalation::create([
            'resident_id' => $otherResident->id,
            'question' => 'Private question from another resident',
            'status' => 'pending',
        ]);
        Sanctum::actingAs($resident);

        $this->getJson('/api/resident/bantaybot/escalations')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.question', 'How do I correct my document request?')
            ->assertJsonPath('data.0.staff_reply', 'Open the returned request and select Correct and Resubmit.')
            ->assertJsonPath('data.0.status', 'replied');
    }

    public function test_admin_can_reply_to_escalation_and_notify_the_resident(): void
    {
        $resident = Resident::factory()->create();
        $admin = Admin::create([
            'name' => 'Test Admin',
            'email' => 'bot-admin@example.com',
            'password' => 'Password123!',
        ]);
        $escalation = ChatbotEscalation::create([
            'resident_id' => $resident->id,
            'question' => 'How do I check my request?',
            'faq_category' => 'Request Status',
        ]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/bantaybot/escalations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $escalation->id)
            ->assertJsonPath('data.0.status', 'pending');

        $this->patchJson("/api/admin/bantaybot/escalations/{$escalation->id}/reply", [
            'staff_reply' => 'Open Document Requests and check Request History.',
        ])->assertOk()
            ->assertJsonPath('escalation.status', 'replied')
            ->assertJsonPath('escalation.staff_reply', 'Open Document Requests and check Request History.')
            ->assertJsonPath('escalation.replied_at', fn($value) => is_string($value));

        $this->assertDatabaseHas('notifications', [
            'resident_id' => $resident->id,
            'type' => 'bantaybot_escalation_replied',
        ]);

        Sanctum::actingAs($resident);
        $this->getJson('/api/resident/bantaybot/escalations')
            ->assertOk()
            ->assertJsonPath('data.0.staff_reply', 'Open Document Requests and check Request History.');
    }

    public function test_only_staff_or_admin_can_reply_to_escalations(): void
    {
        $resident = Resident::factory()->create();
        $escalation = ChatbotEscalation::create([
            'resident_id' => $resident->id,
            'question' => 'When is the office open?',
        ]);
        Sanctum::actingAs($resident);

        $this->patchJson("/api/admin/bantaybot/escalations/{$escalation->id}/reply", [
            'staff_reply' => 'The office is open weekdays.',
        ])->assertForbidden();
    }
}
