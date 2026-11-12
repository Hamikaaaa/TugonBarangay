<?php

namespace Tests\Feature;

use App\Models\PasswordResetVerification;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_password_changes_only_after_email_code_verification(): void
    {
        $resident = Resident::create([
            'name' => 'Jamie Resident',
            'email' => 'resident@example.com',
            'password' => 'OldPassword1!',
            'verification_status' => 'pending',
        ]);

        $request = $this->postJson('/api/password/forgot', [
            'email' => $resident->email,
        ]);

        $request->assertAccepted()
            ->assertJsonPath('message', 'If an account with that email exists, an email with a verification code has been sent.');
        $this->assertTrue(Hash::check('OldPassword1!', $resident->fresh()->password));

        $transport = Mail::mailer()->getSymfonyTransport();
        $originalMessage = $transport->messages()->last()->getOriginalMessage();
        $this->assertSame('TugonBarangay', $originalMessage->getFrom()[0]->getName());
        $email = quoted_printable_decode($originalMessage->toString());
        $this->assertStringContainsString('password change verification code', strtolower($email));
        $this->assertStringContainsString('request to change the password', strtolower($email));
        preg_match('/<p[^>]*>(\d{5})<\/p>/', $email, $matches);
        $code = $matches[1] ?? null;
        $this->assertNotNull($code, 'The password-reset email should contain a 5-digit verification code.');

        $resetId = $request->json('reset_id');
        $this->postJson('/api/password/forgot/verify', [
            'reset_id' => $resetId,
            'code' => '00000',
        ])->assertUnprocessable();
        $this->assertTrue(Hash::check('OldPassword1!', $resident->fresh()->password));

        $verification = PasswordResetVerification::findOrFail($resetId);
        $verified = $this->postJson('/api/password/forgot/verify', [
            'reset_id' => $resetId,
            'code' => $code,
        ])->assertOk();
        $this->postJson('/api/password/forgot/verify', [
            'reset_id' => $resetId,
            'code' => $code,
        ])->assertUnprocessable();

        $this->postJson('/api/password/forgot/reset', [
            'reset_id' => $resetId,
            'reset_token' => $verified->json('reset_token'),
            'password' => 'NewPassword2!',
            'password_confirmation' => 'NewPassword2!',
        ])->assertOk();

        $this->assertTrue(Hash::check('NewPassword2!', $resident->fresh()->password));
        $this->assertFalse(Hash::check('OldPassword1!', $resident->fresh()->password));
        $this->assertDatabaseMissing('password_reset_verifications', ['id' => $verification->id]);
    }

    public function test_password_reset_response_does_not_disclose_unknown_email_accounts(): void
    {
        $response = $this->postJson('/api/password/forgot', [
            'email' => 'unknown@example.com',
        ]);

        $response->assertAccepted()
            ->assertJsonPath('message', 'If an account with that email exists, an email with a verification code has been sent.');
        $this->assertSame(0, Mail::mailer()->getSymfonyTransport()->messages()->count());

        $this->postJson('/api/password/forgot/verify', [
            'reset_id' => $response->json('reset_id'),
            'code' => '12345',
        ])->assertUnprocessable();
    }

    public function test_password_reset_code_expires_after_five_minutes(): void
    {
        $resident = Resident::create([
            'name' => 'Jamie Resident',
            'email' => 'resident@example.com',
            'password' => 'OldPassword1!',
        ]);

        $request = $this->postJson('/api/password/forgot', [
            'email' => $resident->email,
        ]);
        $this->travel(5)->minutes();

        $this->postJson('/api/password/forgot/verify', [
            'reset_id' => $request->json('reset_id'),
            'code' => '12345',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'The code is invalid or expired. Request a new password reset code and try again.');
    }
}
