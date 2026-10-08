<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\DocumentTypeController;
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
    Route::get('/complaint-categories', [\App\Http\Controllers\ComplaintController::class, 'enabledCategories']);
    Route::get('/document-types', [DocumentTypeController::class, 'residentIndex']);
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
    Route::get('/bantaybot/messages', [ResidentController::class, 'botMessages']);
    Route::get('/bantaybot/escalations', [ResidentController::class, 'botEscalations']);
    Route::post('/bantaybot/ask', [ResidentController::class, 'askBot']);
    Route::post('/bantaybot/escalate', [ResidentController::class, 'escalateBot']);
    Route::post('/feedback', [ResidentController::class, 'storeFeedback']);
    Route::patch('/profile', [ResidentController::class, 'updateProfile']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/staff-accounts', [AdminController::class, 'staffAccounts']);
    Route::post('/staff-accounts', [AdminController::class, 'createStaffAccount']);
    Route::patch('/staff-accounts/{staff}/status', [AdminController::class, 'updateStaffAccountStatus']);
    Route::get('/notifications', [AdminController::class, 'notifications']);
    Route::get('/reports', [AdminController::class, 'reports']);
    Route::get('/feedback', [AdminController::class, 'feedback']);
    Route::get('/document-types', [DocumentTypeController::class, 'adminIndex']);
    Route::post('/document-types', [DocumentTypeController::class, 'store']);
    Route::put('/document-types/{documentType}', [DocumentTypeController::class, 'update']);
    Route::delete('/document-types/{documentType}', [DocumentTypeController::class, 'destroy']);
    Route::get('/document-requests/overview', [\App\Http\Controllers\AdminDocumentRequestHistoryController::class, 'overview']);
    Route::get('/document-request-events', [\App\Http\Controllers\AdminDocumentRequestHistoryController::class, 'events']);
    Route::get('/document-requests', [\App\Http\Controllers\AdminDocumentRequestHistoryController::class, 'index']);
    Route::get('/document-requests/{documentRequest}', [\App\Http\Controllers\AdminDocumentRequestHistoryController::class, 'show']);
    Route::get('/bantaybot/escalations', [ResidentController::class, 'adminBotEscalations']);
    Route::patch('/bantaybot/escalations/{chatbotEscalation}/reply', [ResidentController::class, 'replyToBotEscalation']);
    Route::get('/bantaybot/faqs', [ResidentController::class, 'adminBotFaqs']);
    Route::post('/bantaybot/faqs', [ResidentController::class, 'storeBotFaq']);
    Route::put('/bantaybot/faqs/{chatbotFaq}', [ResidentController::class, 'updateBotFaq']);
    Route::delete('/bantaybot/faqs/{chatbotFaq}', [ResidentController::class, 'destroyBotFaq']);
    Route::get('/bantaybot/stats', [ResidentController::class, 'adminBotStats']);
    Route::get('/residents/registry-stats', [AdminController::class, 'residentRegistryStats']);
    Route::get('/barangay-registry', [AdminController::class, 'barangayRegistry']);
    Route::get('/pending-residents', [AdminController::class, 'pendingResidents']);
    Route::patch('/residents/{user}/verify', [AdminController::class, 'verifyResident']);
    Route::patch('/residents/{user}/reject', [AdminController::class, 'rejectResident']);
    Route::get('/complaint-categories', [\App\Http\Controllers\ComplaintController::class, 'categories']);
    Route::post('/complaint-categories', [\App\Http\Controllers\ComplaintController::class, 'storeCategory']);
    Route::patch('/complaint-categories/{id}', [\App\Http\Controllers\ComplaintController::class, 'updateCategory']);
    Route::delete('/complaint-categories/{id}', [\App\Http\Controllers\ComplaintController::class, 'destroyCategory']);
    Route::get('/complaints', [\App\Http\Controllers\StaffController::class, 'complaints']);
    Route::patch('/complaints/{complaint}/status', [\App\Http\Controllers\StaffController::class, 'updateComplaintStatus']);
    Route::get('/complaints/{complaint}/evidence', [\App\Http\Controllers\StaffController::class, 'downloadComplaintEvidence']);
});

Route::middleware(['auth:sanctum', 'role:staff', 'designation:Document Request Officer'])->prefix('staff')->group(function () {
    Route::get('/document-types', [DocumentTypeController::class, 'staffIndex']);
    Route::get('/document-request-dashboard', [\App\Http\Controllers\StaffController::class, 'documentRequestDashboard']);
    Route::get('/document-requests', [\App\Http\Controllers\StaffController::class, 'documentRequests']);
    Route::get('/document-requests/{documentRequest}', [\App\Http\Controllers\StaffController::class, 'showDocumentRequest']);
    Route::post('/document-requests/{documentRequest}/generate', [\App\Http\Controllers\StaffController::class, 'generateDocumentPreview']);
    Route::get('/document-requests/{documentRequest}/requirements/{requirement}', [\App\Http\Controllers\StaffController::class, 'downloadDocumentRequirement']);
    Route::patch('/document-requests/{documentRequest}/status', [\App\Http\Controllers\StaffController::class, 'updateDocumentRequestStatus']);
    Route::patch('/document-requests/{documentRequest}/fee', [\App\Http\Controllers\StaffController::class, 'updateDocumentRequestFee']);
});

Route::middleware(['auth:sanctum', 'role:staff', 'designation:Complaint Management Officer'])->prefix('staff')->group(function () {
    Route::get('/complaint-categories', [\App\Http\Controllers\ComplaintController::class, 'enabledCategories']);
    Route::get('/complaints', [\App\Http\Controllers\StaffController::class, 'complaints']);
    Route::get('/complaints/{complaint}', [\App\Http\Controllers\StaffController::class, 'showComplaint']);
    Route::patch('/complaints/{complaint}/classification', [\App\Http\Controllers\StaffController::class, 'updateComplaintClassification']);
    Route::patch('/complaints/{complaint}/status', [\App\Http\Controllers\StaffController::class, 'updateComplaintStatus']);
    Route::get('/complaints/{complaint}/evidence', [\App\Http\Controllers\StaffController::class, 'downloadComplaintEvidence']);
});
