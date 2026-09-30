<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chatbot_escalations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->text('question');
            $table->string('faq_category')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
            $table->index(['resident_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_escalations');
    }
};
