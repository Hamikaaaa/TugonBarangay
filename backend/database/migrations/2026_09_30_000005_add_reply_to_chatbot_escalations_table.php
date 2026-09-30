<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chatbot_escalations', function (Blueprint $table) {
            $table->text('staff_reply')->nullable()->after('status');
            $table->timestamp('replied_at')->nullable()->after('staff_reply');
        });
    }

    public function down(): void
    {
        Schema::table('chatbot_escalations', function (Blueprint $table) {
            $table->dropColumn(['staff_reply', 'replied_at']);
        });
    }
};
