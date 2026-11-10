<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registration_verifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('channel');
            $table->string('destination');
            $table->longText('registration_payload');
            $table->string('verification_code_hash')->nullable();
            $table->string('verification_token_hash')->nullable();
            $table->unsignedTinyInteger('failed_attempts')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamps();

            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registration_verifications');
    }
};
