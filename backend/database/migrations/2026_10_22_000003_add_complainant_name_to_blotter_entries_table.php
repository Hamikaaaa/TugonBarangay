<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('blotter_entries')) {
            return;
        }

        if (! Schema::hasColumn('blotter_entries', 'complainant_name')) {
            Schema::table('blotter_entries', function (Blueprint $table) {
                $table->string('complainant_name')->nullable()
                    ->after('resident_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('blotter_entries', 'complainant_name')) {
            Schema::table('blotter_entries', function (Blueprint $table) {
                $table->dropColumn('complainant_name');
            });
        }
    }
};
