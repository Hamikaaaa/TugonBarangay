<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('document_requests', 'document_content')) {
                $table->json('document_content')->nullable();
            }

            if (!Schema::hasColumn('document_requests', 'document_generated_at')) {
                $table->timestamp('document_generated_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('document_requests', function (Blueprint $table) {
            if (Schema::hasColumn('document_requests', 'document_content')) {
                $table->dropColumn('document_content');
            }

            if (Schema::hasColumn('document_requests', 'document_generated_at')) {
                $table->dropColumn('document_generated_at');
            }
        });
    }
};
