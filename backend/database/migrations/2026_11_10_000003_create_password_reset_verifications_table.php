<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_verifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('account_type')->nullable();
            $table->unsignedBigInteger('account_id')->nullable();
            $table->string('email');
            $table->string('code_hash');
            $table->string('reset_token_hash')->nullable();
            $table->unsignedTinyInteger('failed_attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('reset_expires_at')->nullable();
            $table->timestamps();

            $table->index(['account_type', 'account_id']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_verifications');
    }
};
