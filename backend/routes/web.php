<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/registration/verify/{id}/{token}', [AuthController::class, 'verifyRegistrationEmail'])
    ->middleware('throttle:10,1')
    ->name('registration.verify');
