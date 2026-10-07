<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Construction Permit')
            ->update(['active' => false, 'enabled' => false]);

        DB::table('chatbot_faqs')
            ->where('category', 'Construction Permit')
            ->orWhere('question', 'like', '%Construction Permit%')
            ->update(['is_active' => false]);
    }

    public function down(): void
    {
        DB::table('document_types')
            ->where('value', 'Construction Permit')
            ->update(['active' => true, 'enabled' => true]);

        DB::table('chatbot_faqs')
            ->where('category', 'Construction Permit')
            ->orWhere('question', 'like', '%Construction Permit%')
            ->update(['is_active' => true]);
    }
};
