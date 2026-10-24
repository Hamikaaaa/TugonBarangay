<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangay_document_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('settings');
            $table->string('template_path')->nullable();
            $table->string('template_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangay_document_settings');
    }
};
