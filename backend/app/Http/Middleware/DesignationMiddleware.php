<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DesignationMiddleware
{
    public function handle(Request $request, Closure $next, string $designation): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->role === 'admin' || $user->designation === $designation) {
            return $next($request);
        }

        return response()->json([
            'message' => "You do not have permission for the {$designation} designation.",
        ], 403);
    }
}
