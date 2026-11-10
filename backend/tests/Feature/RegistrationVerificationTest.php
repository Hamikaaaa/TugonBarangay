<?php

namespace Tests\Feature;

use App\Models\BarangayRegistry;
use App\Models\RegistrationVerification;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        BarangayRegistry::create([
            'first_name' => 'Jamie',
            'last_name' => 'Resident',
            'date_of_birth' => '1990-01-01',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'mobile_number' => '09171234567',
        ]);
    }

    public function test_sms_registration_creates_resident_only_after_the_code_is_verified(): void
    {
        config([
            'services.twilio.account_sid' => 'test-account',
            'services.twilio.auth_token' => 'test-token',
            'services.twilio.from' => '+15005550006',
        ]);
        Http::fake(['api.twilio.com/*' => Http::response([], 201)]);
        $code = null;
        Http::assertNothingSent();

        $response = $this->postJson('/api/register', $this->registrationData('sms'));

        $response->assertAccepted()
            ->assertJsonPath('verification.channel', 'sms')
            ->assertJsonPath('verification.destination', '091****4567');
        $this->assertSame(0, Resident::count());
        $this->assertSame(1, RegistrationVerification::count());

        Http::assertSent(function (ClientRequest $request) use (&$code) {
            preg_match('/code is (\d{5})/', $request['Body'], $matches);
            $code = $matches[1] ?? null;

            return $request['To'] === '+639171234567' && $code !== null;
        });
        $this->assertSame(5, strlen($code));

        $this->postJson('/api/register/verify-code', [
            'verification_id' => $response->json('verification.id'),
            'code' => $code,
        ])->assertOk()
            ->assertJsonPath('user.verification_status', 'pending');

        $this->assertSame(1, Resident::count());
        $this->assertNotNull(Resident::first()->mobile_verified_at);
        $this->assertSame(0, RegistrationVerification::count());
    }

    public function test_sms_code_expires_and_can_be_resent_after_the_cooldown(): void
    {
        config([
            'services.twilio.account_sid' => 'test-account',
            'services.twilio.auth_token' => 'test-token',
            'services.twilio.from' => '+15005550006',
        ]);
        Http::fake(['api.twilio.com/*' => Http::response([], 201)]);
        $response = $this->postJson('/api/register', $this->registrationData('sms'));
        $verificationId = $response->json('verification.id');

        $this->postJson('/api/register/resend-code', [
            'verification_id' => $verificationId,
        ])->assertStatus(429);

        $this->travel(5)->minutes();
        $this->postJson('/api/register/verify-code', [
            'verification_id' => $verificationId,
            'code' => '12345',
        ])->assertUnprocessable()
            ->assertJsonPath('expired', true);

        $this->travel(90)->seconds();
        $this->postJson('/api/register/resend-code', [
            'verification_id' => $verificationId,
        ])->assertOk()
            ->assertJsonPath('verification.channel', 'sms');

        $this->assertSame(0, Resident::count());
    }

    public function test_email_registration_sends_verify_button_and_completes_only_after_click(): void
    {
        $response = $this->postJson('/api/register', $this->registrationData('email'));

        $response->assertAccepted()
            ->assertJsonPath('verification.channel', 'email');
        $this->assertSame(0, Resident::count());

        $transport = Mail::mailer()->getSymfonyTransport();
        $message = $transport->messages()->last()->getOriginalMessage()->toString();
        $decodedMessage = quoted_printable_decode($message);
        $this->assertStringContainsString('VERIFY!', $decodedMessage);
        preg_match('~https?://[^\s"<]+/registration/verify/[^\s"<]+~', $decodedMessage, $matches);
        $this->assertNotEmpty($matches[0] ?? null, 'The verification email should contain its confirmation link.');

        $verifyPath = parse_url(html_entity_decode($matches[0]), PHP_URL_PATH);
        $this->get($verifyPath)
            ->assertRedirect('http://localhost:5173/registration/verified');

        $resident = Resident::firstOrFail();
        $this->assertNotNull($resident->email_verified_at);
        $this->assertNull($resident->mobile_verified_at);
        $this->assertSame('pending', $resident->verification_status);
        $this->assertSame(0, RegistrationVerification::count());
    }

    public function test_email_registration_does_not_claim_to_send_when_mailer_only_logs_messages(): void
    {
        config(['mail.default' => 'log']);

        $this->postJson('/api/register', $this->registrationData('email'))
            ->assertServiceUnavailable()
            ->assertJsonPath(
                'message',
                'Email delivery is not configured. Set up an SMTP mail provider in the backend environment before choosing email verification.',
            );

        $this->assertSame(0, RegistrationVerification::count());
        $this->assertSame(0, Resident::count());
    }

    private function registrationData(string $verificationMethod): array
    {
        return [
            'first_name' => 'Jamie',
            'last_name' => 'Resident',
            'date_of_birth' => '1990-01-01',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'mobile_number' => '09171234567',
            'email' => 'resident@gmail.com',
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
            'verification_method' => $verificationMethod,
        ];
    }
}
