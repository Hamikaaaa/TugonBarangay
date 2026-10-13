<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_types', function (Blueprint $table) {
            $table->string('uploaded_template_path')->nullable();
            $table->string('uploaded_template_name')->nullable();
            $table->boolean('template_enabled')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('document_types', function (Blueprint $table) {
            $table->dropColumn(['uploaded_template_path', 'uploaded_template_name', 'template_enabled']);
        });
    }
};
