<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chatbot_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('faq_id')->nullable()->constrained('chatbot_faqs')->nullOnDelete();
            $table->text('question');
            $table->text('answer');
            $table->string('faq_category')->nullable();
            $table->boolean('matched')->default(false);
            $table->string('intent')->nullable();
            $table->timestamp('answered_at')->nullable();
            $table->timestamps();
            $table->index(['resident_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_messages');
    }
};
