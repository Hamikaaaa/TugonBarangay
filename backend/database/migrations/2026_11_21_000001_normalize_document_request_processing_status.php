<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_requests')
            ->where('status', 'processing')
            ->update(['status' => 'under_review']);
    }

    public function down(): void
    {
        // This normalization cannot be safely reversed after new reviews are recorded.
    }
};
