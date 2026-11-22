<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('blotter_entries') && ! Schema::hasColumn('blotter_entries', 'recorded_by_name')) {
            Schema::table('blotter_entries', function (Blueprint $table) {
                $table->string('recorded_by_name')->nullable()->after('recorded_by');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('blotter_entries') && Schema::hasColumn('blotter_entries', 'recorded_by_name')) {
            Schema::table('blotter_entries', function (Blueprint $table) {
                $table->dropColumn('recorded_by_name');
            });
        }
    }
};
