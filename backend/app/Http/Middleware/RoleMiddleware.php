<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // User is not authenticated
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        // User does not have an allowed role
        if (!in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'You do not have permission to access this resource.'
            ], 403);
        }

        if ($user->role === 'staff' && !$user->is_active) {
            return response()->json([
                'message' => 'This staff account is disabled.',
            ], 403);
        }

        return $next($request);
    }
}
