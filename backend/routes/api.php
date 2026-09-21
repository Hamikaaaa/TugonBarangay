<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');

Route::middleware(['auth:sanctum', 'role:admin,staff'])->prefix('admin')->group(function () {
    Route::get('/pending-residents', [AdminController::class, 'pendingResidents']);
    Route::patch('/residents/{user}/verify', [AdminController::class, 'verifyResident']);
    Route::patch('/residents/{user}/reject', [AdminController::class, 'rejectResident']);
});
