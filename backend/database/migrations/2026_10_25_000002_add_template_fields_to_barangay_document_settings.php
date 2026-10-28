<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('barangay_document_settings')) {
            return;
        }

        Schema::table('barangay_document_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('barangay_document_settings', 'template_path')) {
                $table->string('template_path')->nullable();
            }
            if (!Schema::hasColumn('barangay_document_settings', 'template_name')) {
                $table->string('template_name')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('barangay_document_settings')) {
            return;
        }

        Schema::table('barangay_document_settings', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('barangay_document_settings', 'template_path')) $columns[] = 'template_path';
            if (Schema::hasColumn('barangay_document_settings', 'template_name')) $columns[] = 'template_name';
            if ($columns) $table->dropColumn($columns);
        });
    }
};
