<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chatbot_faqs', function (Blueprint $table) {
            $table->string('question_ceb')->nullable()->after('question');
            $table->text('answer_ceb')->nullable()->after('answer');
            $table->json('keywords_ceb')->nullable()->after('keywords');
        });
    }

    public function down(): void
    {
        Schema::table('chatbot_faqs', function (Blueprint $table) {
            $table->dropColumn(['question_ceb', 'answer_ceb', 'keywords_ceb']);
        });
    }
};