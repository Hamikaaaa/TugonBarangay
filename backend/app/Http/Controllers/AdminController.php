<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function pendingResidents()
    {
        return User::where('role', 'resident')
            ->where('verification_status', 'pending')
            ->latest()
            ->get();
    }

    public function verifyResident(User $user)
    {
        abort_unless($user->role === 'resident', 404);
        $user->update(['verification_status' => 'verified', 'rejection_reason' => null]);

        return response()->json(['message' => 'Resident verified.', 'user' => $user]);
    }

    public function rejectResident(Request $request, User $user)
    {
        abort_unless($user->role === 'resident', 404);
        $validated = $request->validate(['reason' => ['required', 'string', 'max:1000']]);
        $user->update(['verification_status' => 'rejected', 'rejection_reason' => $validated['reason']]);

        return response()->json(['message' => 'Resident rejected.', 'user' => $user]);
    }
}
