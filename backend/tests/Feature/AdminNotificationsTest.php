<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\ChatbotEscalation;
use App\Models\Complaint;
use App\Models\DocumentRequest;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminNotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_notifications_summarize_actionable_work_and_link_to_queues(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'pending']);
        DocumentRequest::factory()->create([
            'resident_id' => $resident->id,
            'status' => 'pending',
        ]);
        Complaint::create([
            'resident_id' => $resident->id,
            'category' => 'Road issue',
            'subject' => 'Pothole',
            'description' => 'Pothole in the road.',
            'status' => 'in_progress',
        ]);
        ChatbotEscalation::create([
            'resident_id' => $resident->id,
            'question' => 'How can I get a certificate?',
            'status' => 'pending',
        ]);

        Sanctum::actingAs(Admin::create([
            'name' => 'Notifications Admin',
            'email' => 'notifications-admin@example.com',
            'password' => 'password123',
        ]));

        $this->getJson('/api/admin/notifications')
            ->assertOk()
            ->assertJsonPath('total', 4)
            ->assertJsonCount(4, 'items')
            ->assertJsonFragment([
                'type' => 'resident_verification',
                'count' => 1,
                'path' => '/admin/dashboard',
            ])
            ->assertJsonFragment([
                'type' => 'document_requests',
                'count' => 1,
                'path' => '/admin/document-requests',
            ])
            ->assertJsonFragment([
                'type' => 'complaints',
                'count' => 1,
                'path' => '/admin/complaints',
            ])
            ->assertJsonFragment([
                'type' => 'bantaybot_escalations',
                'count' => 1,
                'path' => '/admin/chatbot/escalations',
            ]);
    }

    public function test_notifications_exclude_completed_work_and_are_admin_only(): void
    {
        $resident = Resident::factory()->create(['verification_status' => 'verified']);
        DocumentRequest::factory()->create([
            'resident_id' => $resident->id,
            'status' => 'completed',
        ]);
        Complaint::create([
            'resident_id' => $resident->id,
            'category' => 'Road issue',
            'subject' => 'Resolved pothole',
            'description' => 'Already resolved.',
            'status' => 'resolved',
        ]);
        ChatbotEscalation::create([
            'resident_id' => $resident->id,
            'question' => 'Already answered?',
            'status' => 'replied',
        ]);

        Sanctum::actingAs(Admin::create([
            'name' => 'Notifications Admin',
            'email' => 'empty-notifications-admin@example.com',
            'password' => 'password123',
        ]));
        $this->getJson('/api/admin/notifications')
            ->assertOk()
            ->assertJsonPath('total', 0)
            ->assertJsonCount(0, 'items');

        Sanctum::actingAs($resident);
        $this->getJson('/api/admin/notifications')->assertForbidden();
    }
}
