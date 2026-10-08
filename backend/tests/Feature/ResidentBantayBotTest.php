<?php

namespace Tests\Feature;

use App\Models\ChatbotEscalation;
use App\Models\ChatbotFaq;
use App\Models\ChatbotMessage;
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

    public function test_bot_responds_to_common_greetings_as_greetings(): void
    {
        $resident = Resident::factory()->create();
        Sanctum::actingAs($resident);

        foreach (['Hello!', 'hello there', 'good morning po', 'Good morning and how are you?', 'Magandang umaga po', 'Maayong buntag', 'How are you?'] as $greeting) {
            $this->postJson('/api/resident/bantaybot/ask', [
                'question' => $greeting,
            ])->assertOk()
                ->assertJsonPath('matched', true)
                ->assertJsonPath('intent', 'greeting')
                ->assertJsonPath('faq', null)
                ->assertJsonPath('answer', 'Hello! Good day, and welcome to BantayBot. How can I help you with barangay services today?');
        }
    }

    public function test_bot_messages_are_saved_with_timestamps_and_scoped_to_the_resident(): void
    {
        $resident = Resident::factory()->create();
        $otherResident = Resident::factory()->create();
        Sanctum::actingAs($resident);

        $response = $this->postJson('/api/resident/bantaybot/ask', [
            'question' => 'Good morning',
        ])->assertOk()
            ->assertJsonPath('intent', 'greeting')
            ->assertJsonStructure(['id', 'sent_at', 'received_at']);

        $this->assertDatabaseHas('chatbot_messages', [
            'id' => $response->json('id'),
            'resident_id' => $resident->id,
            'question' => 'Good morning',
            'intent' => 'greeting',
        ]);

        $this->getJson('/api/resident/bantaybot/messages')
            ->assertOk()
            ->assertJsonPath('data.0.id', $response->json('id'))
            ->assertJsonPath('data.0.question', 'Good morning')
            ->assertJsonPath('data.0.answer.intent', 'greeting')
            ->assertJsonPath('data.0.sent_at', $response->json('sent_at'))
            ->assertJsonPath('data.0.received_at', $response->json('received_at'));

        ChatbotMessage::create([
            'resident_id' => $otherResident->id,
            'question' => 'Private question',
            'answer' => 'Private answer',
            'matched' => false,
            'answered_at' => now(),
        ]);

        $this->getJson('/api/resident/bantaybot/messages')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissing(['question' => 'Private question']);
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

    public function test_admin_can_create_edit_list_and_delete_chatbot_faqs(): void
    {
        $admin = Admin::create([
            'name' => 'FAQ Admin',
            'email' => 'faq-admin@example.com',
            'password' => 'Password123!',
        ]);
        Sanctum::actingAs($admin);

        $created = $this->postJson('/api/admin/bantaybot/faqs', [
            'category' => 'Office Information',
            'question' => 'When does the office open?',
            'answer' => 'The office opens at 8:00 AM.',
        ])->assertCreated()
            ->assertJsonPath('faq.category', 'Office Information')
            ->assertJsonPath('faq.question', 'When does the office open?');
        $faqId = $created->json('faq.id');

        $this->getJson('/api/admin/bantaybot/stats')
            ->assertOk()
            ->assertJsonPath('questions', 1)
            ->assertJsonPath('categories', 1)
            ->assertJsonPath('questions_by_category.0.category', 'Office Information')
            ->assertJsonPath('questions_by_category.0.count', 1);

        $this->getJson('/api/admin/bantaybot/faqs')
            ->assertOk()
            ->assertJsonPath('data.0.id', $faqId);

        $this->putJson("/api/admin/bantaybot/faqs/{$faqId}", [
            'category' => 'Office Hours',
            'question' => 'What time does the office open?',
            'answer' => 'The office opens at 8:30 AM.',
        ])->assertOk()
            ->assertJsonPath('faq.answer', 'The office opens at 8:30 AM.');

        $this->deleteJson("/api/admin/bantaybot/faqs/{$faqId}")
            ->assertOk();
        $this->assertDatabaseMissing('chatbot_faqs', ['id' => $faqId]);
    }

    public function test_resident_cannot_manage_admin_chatbot_faqs(): void
    {
        Sanctum::actingAs(Resident::factory()->create());

        $this->getJson('/api/admin/bantaybot/faqs')->assertForbidden();
        $this->postJson('/api/admin/bantaybot/faqs', [
            'category' => 'General',
            'question' => 'Can I add this?',
            'answer' => 'No.',
        ])->assertForbidden();
    }
}
