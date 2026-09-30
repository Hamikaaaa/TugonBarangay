<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ResidentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');

Route::middleware(['auth:sanctum', 'role:resident'])->prefix('resident')->group(function () {
    Route::get('/dashboard', [ResidentController::class, 'dashboard']);
    Route::get('/requests', [ResidentController::class, 'requests']);
    Route::post('/requests', [ResidentController::class, 'storeRequest'])
        ->middleware('verified');
    Route::post('/requests/{documentRequest}/resubmit', [ResidentController::class, 'resubmitRequest'])
        ->middleware('verified');
    Route::get('/complaints', [ResidentController::class, 'complaints']);
    Route::post('/complaints', [ResidentController::class, 'storeComplaint'])
        ->middleware('verified');
    Route::get('/complaints/{complaint}/evidence', [ResidentController::class, 'downloadComplaintEvidence']);
    Route::get('/notifications', [ResidentController::class, 'notifications']);
    Route::patch('/notifications/read-all', [ResidentController::class, 'markAllNotificationsRead']);
    Route::patch('/notifications/{notification}', [ResidentController::class, 'updateNotification']);
    Route::delete('/notifications/{notification}', [ResidentController::class, 'destroyNotification']);
    Route::get('/faqs', [ResidentController::class, 'faqs']);
    Route::get('/bantaybot/escalations', [ResidentController::class, 'botEscalations']);
    Route::post('/bantaybot/ask', [ResidentController::class, 'askBot']);
    Route::post('/bantaybot/escalate', [ResidentController::class, 'escalateBot']);
    Route::post('/feedback', [ResidentController::class, 'storeFeedback']);
    Route::patch('/profile', [ResidentController::class, 'updateProfile']);
});

Route::middleware(['auth:sanctum', 'role:admin,staff'])->prefix('admin')->group(function () {
    Route::get('/bantaybot/escalations', [ResidentController::class, 'adminBotEscalations']);
    Route::patch('/bantaybot/escalations/{chatbotEscalation}/reply', [ResidentController::class, 'replyToBotEscalation']);
    Route::get('/pending-residents', [AdminController::class, 'pendingResidents']);
    Route::patch('/residents/{user}/verify', [AdminController::class, 'verifyResident']);
    Route::patch('/residents/{user}/reject', [AdminController::class, 'rejectResident']);
});
