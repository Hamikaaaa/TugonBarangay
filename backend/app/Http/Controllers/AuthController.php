<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\BarangayRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;


class AuthController extends Controller
{
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

            'email' => 'required|email:rfc,dns|unique:users,email',
        ]);

        $registryRecord = BarangayRegistry::where('first_name', $validated['first_name'])
            ->where('last_name', $validated['last_name'])
            ->whereDate('date_of_birth', $validated['date_of_birth'])
            ->where('sex', $validated['sex'])
            ->where('purok', $validated['purok'])
            ->first();

        if (!$registryRecord) {
            return response()->json([
                'message' => 'You are not registered in our barangay. Please contact the barangay office or email barangay@tugonbarangay.gov.ph for assistance.',
                'errors' => ['registry' => ['You are not registered in our barangay. Please contact the barangay office or email barangay@tugonbarangay.gov.ph for assistance.']],
            ], 422);
        }



        // Create full name
        $name = trim(
            $validated['first_name'] . ' ' .
                ($validated['middle_name'] ?? '') . ' ' .
                $validated['last_name'] . ' ' .
                ($validated['suffix'] ?? '')
        );

        // Create user
        $user = User::create([
            'name' => $name,

            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'suffix' => $validated['suffix'] ?? null,

            'date_of_birth' => $validated['date_of_birth'],
            'sex' => $validated['sex'],

            'purok' => $validated['purok'],
            'address' => $validated['address'] ?? null,

            'mobile_number' => $validated['mobile_number'],
            'email' => $validated['email'],

            'password' => $validated['password'],

            'role' => 'resident',
            'verification_status' => 'pending',
            'rejection_reason' => null,
        ]);





        return response()->json([
            'message' => 'Registration submitted. Your account is pending barangay verification.',
            'user' => $user,
        ], 201);
    }
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.',
            ], 401);
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
