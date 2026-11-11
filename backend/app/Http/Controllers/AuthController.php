<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\BarangayRegistry;
use App\Models\PasswordResetVerification;
use App\Models\RegistrationVerification;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function requestPasswordReset(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc'],
        ]);
        $this->ensureEmailDeliveryConfigured();

        $email = strtolower($validated['email']);
        $account = Resident::whereRaw('LOWER(email) = ?', [$email])->first()
            ?? Staff::whereRaw('LOWER(email) = ?', [$email])->first()
            ?? Admin::whereRaw('LOWER(email) = ?', [$email])->first();
        if ($account) {
            PasswordResetVerification::where('account_type', $account->getTable())
                ->where('account_id', $account->getKey())
                ->delete();
        }

        $code = (string) random_int(10000, 99999);
        $verification = PasswordResetVerification::create([
            'id' => (string) Str::uuid(),
            'account_type' => $account?->getTable(),
            'account_id' => $account?->getKey(),
            'email' => $email,
            'code_hash' => Hash::make($code),
            'failed_attempts' => 0,
            'expires_at' => now()->addMinutes(5),
        ]);

        if ($account) {
            $this->sendPasswordResetCode($email, $code);
        }

        return response()->json([
            'message' => 'If an account with that email exists, an email with a verification code has been sent.',
            'reset_id' => $verification->id,
        ], 202);
    }

    public function verifyPasswordResetCode(Request $request)
    {
        $validated = $request->validate([
            'reset_id' => ['required', 'uuid'],
            'code' => ['required', 'regex:/^\d{5}$/'],
        ]);
        $verification = PasswordResetVerification::whereKey($validated['reset_id'])->first();

        if (
            ! $verification
            || ! $verification->account_type
            || ! $verification->account_id
            || $verification->failed_attempts >= 5
            || $verification->expires_at->isPast()
            || ! Hash::check($validated['code'], $verification->code_hash)
        ) {
            if ($verification && $verification->failed_attempts < 5) {
                $verification->increment('failed_attempts');
            }

            return response()->json([
                'message' => 'The code is invalid or expired. Request a new password reset code and try again.',
            ], 422);
        }

        $resetToken = Str::random(64);
        $verification->forceFill([
            'code_hash' => Hash::make(Str::random(40)),
            'reset_token_hash' => Hash::make($resetToken),
            'reset_expires_at' => now()->addMinutes(10),
        ])->save();

        return response()->json([
            'message' => 'Code verified. You can now set a new password.',
            'reset_token' => $resetToken,
        ]);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'reset_id' => ['required', 'uuid'],
            'reset_token' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
        ]);

        return DB::transaction(function () use ($validated) {
            $verification = PasswordResetVerification::whereKey($validated['reset_id'])
                ->lockForUpdate()
                ->first();

            if (
                ! $verification
                || ! $verification->account_type
                || ! $verification->account_id
                || ! $verification->reset_expires_at
                || $verification->reset_expires_at->isPast()
                || ! $verification->reset_token_hash
                || ! Hash::check($validated['reset_token'], $verification->reset_token_hash)
            ) {
                return response()->json([
                    'message' => 'This password reset session is invalid or expired. Request a new code.',
                ], 422);
            }

            $account = $this->passwordResetAccount($verification);
            if (! $account) {
                $verification->delete();

                return response()->json([
                    'message' => 'This account could not be found. Request a new password reset code.',
                ], 422);
            }

            $account->forceFill(['password' => $validated['password']])->save();
            $account->tokens()->delete();
            PasswordResetVerification::where('account_type', $verification->account_type)
                ->where('account_id', $verification->account_id)
                ->delete();

            return response()->json([
                'message' => 'Your password has been changed. You can now log in with your new password.',
            ]);
        });
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:50',

            'date_of_birth' => 'required|date',
            'sex' => 'required|string|max:50',

            'purok' => 'required|string|max:100',
            'address' => 'nullable|string|max:255',

            'mobile_number' => ['required', 'regex:/^09\d{9}$/'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
            'verification_method' => ['required', Rule::in(['email', 'sms'])],

            'email' => [
                'required',
                'email:rfc,dns',
                Rule::unique('residents', 'email'),
                Rule::unique('staff', 'email'),
                Rule::unique('admins', 'email'),
            ],
        ]);

        $registryRecord = BarangayRegistry::where('first_name', $validated['first_name'])
            ->where('last_name', $validated['last_name'])
            ->whereDate('date_of_birth', $validated['date_of_birth'])
            ->where('sex', $validated['sex'])
            ->where('purok', $validated['purok'])
            ->first();

        if (! $registryRecord) {
            return response()->json([
                'message' => 'You are not registered in our barangay. Please contact the barangay office or email barangay@tugonbarangay.gov.ph for assistance.',
                'errors' => ['registry' => ['You are not registered in our barangay. Please contact the barangay office or email barangay@tugonbarangay.gov.ph for assistance.']],
            ], 422);
        }

        if ($this->residentExistsForRegistry($registryRecord)) {
            return response()->json([
                'message' => 'A resident account already exists for this registry record. Please sign in or contact the barangay office for help.',
                'errors' => ['registry' => ['A resident account already exists for this registry record.']],
            ], 422);
        }

        if ($validated['verification_method'] === 'email') {
            $this->ensureEmailDeliveryConfigured();
        }

        $validated['email'] = strtolower($validated['email']);
        $pending = RegistrationVerification::create([
            'id' => (string) Str::uuid(),
            'channel' => $validated['verification_method'],
            'destination' => $validated['verification_method'] === 'email'
                ? $validated['email']
                : $validated['mobile_number'],
            'registration_payload' => $validated,
        ]);

        $this->sendRegistrationVerification($pending);

        return response()->json([
            'message' => $pending->channel === 'email'
                ? 'A verification email has been sent. Verify your email to complete registration.'
                : 'A 5-digit verification code has been sent by SMS.',
            'verification' => [
                'id' => $pending->id,
                'channel' => $pending->channel,
                'destination' => $this->maskDestination($pending->destination, $pending->channel),
                'expires_at' => $pending->expires_at,
                'resend_at' => $pending->last_sent_at->copy()->addSeconds(90),
            ],
        ], 202);
    }

    public function verifyRegistrationCode(Request $request)
    {
        $validated = $request->validate([
            'verification_id' => ['required', 'uuid'],
            'code' => ['required', 'regex:/^\d{5}$/'],
        ]);

        $pending = RegistrationVerification::whereKey($validated['verification_id'])
            ->where('channel', 'sms')
            ->firstOrFail();

        if ($pending->failed_attempts >= 5) {
            return response()->json(['message' => 'Too many incorrect attempts. Request a new code to try again.'], 429);
        }

        if (! $pending->expires_at || $pending->expires_at->isPast()) {
            return response()->json([
                'message' => 'This code has expired. Resend a new code to continue.',
                'expired' => true,
            ], 422);
        }

        if (! $pending->verification_code_hash || ! Hash::check($validated['code'], $pending->verification_code_hash)) {
            $pending->increment('failed_attempts');

            return response()->json(['message' => 'The verification code is incorrect.'], 422);
        }

        $resident = $this->completeRegistration($pending);

        return response()->json([
            'message' => 'Your contact information has been verified. Registration submitted; your account is pending barangay verification.',
            'user' => $resident,
        ]);
    }

    public function resendRegistrationCode(Request $request)
    {
        $validated = $request->validate([
            'verification_id' => ['required', 'uuid'],
        ]);

        $pending = RegistrationVerification::whereKey($validated['verification_id'])->firstOrFail();

        if ($pending->created_at->addDay()->isPast()) {
            $pending->delete();

            return response()->json([
                'message' => 'This registration request has expired. Please start registration again.',
            ], 410);
        }

        if ($pending->last_sent_at && $pending->last_sent_at->copy()->addSeconds(90)->isFuture()) {
            return response()->json([
                'message' => 'You can request another code after the 90-second wait.',
                'resend_at' => $pending->last_sent_at->copy()->addSeconds(90),
            ], 429);
        }

        if ($pending->channel === 'email') {
            $this->ensureEmailDeliveryConfigured();
        }

        $this->sendRegistrationVerification($pending);

        return response()->json([
            'message' => $pending->channel === 'email'
                ? 'A new verification email has been sent.'
                : 'A new 5-digit verification code has been sent by SMS.',
            'verification' => [
                'id' => $pending->id,
                'channel' => $pending->channel,
                'destination' => $this->maskDestination($pending->destination, $pending->channel),
                'expires_at' => $pending->expires_at,
                'resend_at' => $pending->last_sent_at->copy()->addSeconds(90),
            ],
        ]);
    }

    public function verifyRegistrationEmail(string $id, string $token)
    {
        $pending = RegistrationVerification::whereKey($id)
            ->where('channel', 'email')
            ->first();

        if (
            ! $pending
            || ! $pending->expires_at
            || $pending->expires_at->isPast()
            || ! $pending->verification_token_hash
            || ! Hash::check($token, $pending->verification_token_hash)
        ) {
            return response()->view('registration-verified', [
                'success' => false,
                'loginUrl' => rtrim(config('app.frontend_url'), '/').'/register',
            ], 410);
        }

        $this->completeRegistration($pending);

        return redirect()->away(rtrim(config('app.frontend_url'), '/').'/registration/verified');
    }

    private function sendRegistrationVerification(RegistrationVerification $pending): void
    {
        $codeHash = null;
        $tokenHash = null;
        $expiresAt = now()->addMinutes(5);

        if ($pending->channel === 'sms') {
            $code = (string) random_int(10000, 99999);
            $codeHash = Hash::make($code);
        } else {
            $token = Str::random(64);
            $tokenHash = Hash::make($token);
        }

        $pending->forceFill([
            'verification_code_hash' => $codeHash,
            'verification_token_hash' => $tokenHash,
            'failed_attempts' => 0,
            'expires_at' => $expiresAt,
        ])->save();

        if ($pending->channel === 'sms') {
            $this->sendSmsVerification($pending->destination, $code);
        } else {
            $verifyUrl = route('registration.verify', ['id' => $pending->id, 'token' => $token]);
            $this->sendEmailVerification($pending->destination, $verifyUrl);
        }

        $pending->forceFill(['last_sent_at' => now()])->save();
    }

    private function sendSmsVerification(string $mobileNumber, string $code): void
    {
        $accountSid = config('services.twilio.account_sid');
        $authToken = config('services.twilio.auth_token');
        $fromNumber = config('services.twilio.from');

        if (! $accountSid || ! $authToken || ! $fromNumber) {
            abort(response()->json([
                'message' => 'SMS verification is not configured. Please contact the barangay office or choose email verification.',
            ], 503));
        }

        Http::asForm()
            ->withBasicAuth($accountSid, $authToken)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                'From' => $fromNumber,
                'To' => '+63'.substr($mobileNumber, 1),
                'Body' => "Your TugonBarangay verification code is {$code}. It expires in 5 minutes.",
            ])
            ->throw();
    }

    private function sendEmailVerification(string $email, string $verifyUrl): void
    {
        $buttonUrl = e($verifyUrl);
        $html = '<p>Thank you for registering with TugonBarangay.</p>'
            .'<p>Click the button below to verify your email and complete registration. This link expires in 5 minutes.</p>'
            .'<p><a href="'.$buttonUrl.'" style="display:inline-block;padding:12px 24px;background:#2455D6;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">VERIFY!</a></p>'
            .'<p>If you did not request this, you can ignore this email.</p>';

        Mail::html($html, function ($message) use ($email) {
            $message->to($email)->subject('Verify your TugonBarangay registration');
        });
    }

    private function ensureEmailDeliveryConfigured(): void
    {
        $mailer = config('mail.default');

        if ($mailer === 'log' || ($mailer === 'array' && ! app()->environment('testing'))) {
            abort(response()->json([
                'message' => 'Email delivery is not configured. Set up an SMTP mail provider in the backend environment before choosing email verification.',
            ], 503));
        }
    }

    private function sendPasswordResetCode(string $email, string $code): void
    {
        $html = '<p>We received a request to change the password for your TugonBarangay account.</p>'
            .'<p>Your 5-digit password reset verification code is:</p>'
            .'<p style="font-size:28px;font-weight:bold;letter-spacing:8px">'.e($code).'</p>'
            .'<p>This code expires in 5 minutes. Enter it on the password reset page to continue.</p>'
            .'<p>If you did not request a password change, do not share this code and you may ignore this email. Your password will not change unless the code is verified and a new password is submitted.</p>';

        Mail::html($html, function ($message) use ($email) {
            $message->to($email)->subject('Password change verification code - TugonBarangay');
        });
    }

    private function passwordResetAccount(PasswordResetVerification $verification): ?Model
    {
        $model = match ($verification->account_type) {
            'residents' => Resident::class,
            'staff' => Staff::class,
            'admins' => Admin::class,
            default => null,
        };

        return $model ? $model::find($verification->account_id) : null;
    }

    private function completeRegistration(RegistrationVerification $pending): Resident
    {
        return DB::transaction(function () use ($pending) {
            $pending = RegistrationVerification::whereKey($pending->id)
                ->lockForUpdate()
                ->firstOrFail();
            $payload = $pending->registration_payload;
            $registryRecord = BarangayRegistry::query()
                ->where('first_name', $payload['first_name'])
                ->where('last_name', $payload['last_name'])
                ->whereDate('date_of_birth', $payload['date_of_birth'])
                ->where('sex', $payload['sex'])
                ->where('purok', $payload['purok'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($this->residentExistsForRegistry($registryRecord)) {
                throw ValidationException::withMessages([
                    'registry' => ['A resident account already exists for this registry record.'],
                ]);
            }

            $name = trim(implode(' ', array_filter([
                $payload['first_name'],
                $payload['middle_name'] ?? null,
                $payload['last_name'],
                $payload['suffix'] ?? null,
            ])));

            $resident = Resident::create([
                'name' => $name,
                'first_name' => $payload['first_name'],
                'middle_name' => $payload['middle_name'] ?? null,
                'last_name' => $payload['last_name'],
                'suffix' => $payload['suffix'] ?? null,
                'date_of_birth' => $payload['date_of_birth'],
                'sex' => $payload['sex'],
                'purok' => $payload['purok'],
                'address' => $payload['address'] ?? null,
                'mobile_number' => $payload['mobile_number'],
                'email' => $payload['email'],
                'password' => $payload['password'],
                'verification_status' => 'pending',
                'rejection_reason' => null,
            ]);

            $verifiedAt = now();
            $resident->forceFill($pending->channel === 'email'
                ? ['email_verified_at' => $verifiedAt]
                : ['mobile_verified_at' => $verifiedAt])->save();

            $pending->delete();

            return $resident;
        });
    }

    private function residentExistsForRegistry(BarangayRegistry $registryRecord): bool
    {
        return Resident::query()
            ->where('first_name', $registryRecord->first_name)
            ->where('last_name', $registryRecord->last_name)
            ->whereDate('date_of_birth', $registryRecord->date_of_birth)
            ->where('sex', $registryRecord->sex)
            ->where('purok', $registryRecord->purok)
            ->exists();
    }

    private function maskDestination(string $destination, string $channel): string
    {
        if ($channel === 'sms') {
            return substr($destination, 0, 3).'****'.substr($destination, -4);
        }

        [$name, $domain] = explode('@', $destination, 2);

        return substr($name, 0, 1).str_repeat('*', max(1, strlen($name) - 1)).'@'.$domain;
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
        ]);

        $identifier = trim($credentials['email']);
        $email = strtolower($identifier);

        $user = Resident::where('resident_id', strtoupper($identifier))->first()
            ?? Resident::whereRaw('LOWER(email) = ?', [$email])->first()
            ?? Staff::whereRaw('LOWER(email) = ?', [$email])->first()
            ?? Admin::whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid resident ID, email, or password.',
            ], 401);
        }

        if ($user instanceof Resident && ! $user->is_active) {
            return response()->json(['message' => 'This resident account is disabled. Please contact an administrator.'], 403);
        }
        if ($user instanceof Resident) {
            $user->forceFill(['last_login_at' => now()])->save();
        }

        if ($user instanceof Staff && ! $user->is_active) {
            return response()->json([
                'message' => 'This staff account is disabled. Please contact an administrator.',
            ], 403);
        }

        $token = $user->createToken('tugonbarangay')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }
}
