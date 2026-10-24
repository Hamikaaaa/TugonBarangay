<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('summon_entries')) return;

        if (!Schema::hasColumn('summon_entries', 'complainant_attended')) {
            Schema::table('summon_entries', fn (Blueprint $table) => $table->boolean('complainant_attended')->nullable());
        }
        if (!Schema::hasColumn('summon_entries', 'respondent_attended')) {
            Schema::table('summon_entries', fn (Blueprint $table) => $table->boolean('respondent_attended')->nullable());
        }
        if (!Schema::hasColumn('summon_entries', 'status')) {
            Schema::table('summon_entries', fn (Blueprint $table) => $table->string('status')->default('scheduled'));
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('summon_entries')) return;

        $columns = array_values(array_filter(
            ['complainant_attended', 'respondent_attended', 'status'],
            fn ($column) => Schema::hasColumn('summon_entries', $column),
        ));
        if ($columns) Schema::table('summon_entries', fn (Blueprint $table) => $table->dropColumn($columns));
    }
};
