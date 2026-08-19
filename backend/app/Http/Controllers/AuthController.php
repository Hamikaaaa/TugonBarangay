<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Storage;


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

            'mobile_number' => 'required|string|max:20',
            'email' => 'required|email|unique:users,email',

            'password' => 'required|string|min:8|confirmed',

            'profile_photo' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png',
                'max:5120',
            ],
        ]);

        // Store profile photo
        $profilePhotoPath = $request
            ->file('profile_photo')
            ->store('profile_photos', 'public');



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

            'profile_photo' => $profilePhotoPath,

            'role' => 'resident',
        ]);





        return response()->json([
            'message' => 'Registration successful.',
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
