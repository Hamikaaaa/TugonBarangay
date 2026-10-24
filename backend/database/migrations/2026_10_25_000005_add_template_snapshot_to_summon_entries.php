<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('summon_entries')) return;
        Schema::table('summon_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('summon_entries', 'template_path')) $table->string('template_path')->nullable();
            if (!Schema::hasColumn('summon_entries', 'template_name')) $table->string('template_name')->nullable();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('summon_entries')) return;
        $columns = array_values(array_filter(['template_path', 'template_name'], fn ($column) => Schema::hasColumn('summon_entries', $column)));
        if ($columns) Schema::table('summon_entries', fn (Blueprint $table) => $table->dropColumn($columns));
    }
};
