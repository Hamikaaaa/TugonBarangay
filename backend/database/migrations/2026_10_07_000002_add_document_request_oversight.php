<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('document_requests', 'assigned_staff_id')) {
                $table->foreignId('assigned_staff_id')->nullable()->after('resident_id')
                    ->constrained('staff')->nullOnDelete();
            }
            if (!Schema::hasColumn('document_requests', 'status_changed_at')) {
                $table->timestamp('status_changed_at')->useCurrent()->after('status');
            }
        });

        if (Schema::hasColumn('document_requests', 'status_changed_at')) {
            DB::table('document_requests')->whereNull('status_changed_at')->update([
                'status_changed_at' => DB::raw('COALESCE(updated_at, created_at)'),
            ]);
        }

        if (!Schema::hasTable('document_request_events')) {
            Schema::create('document_request_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('document_request_id')->constrained()->cascadeOnDelete();
                $table->unsignedBigInteger('actor_id')->nullable();
                $table->string('actor_name');
                $table->string('actor_role');
                $table->string('action');
                $table->string('from_status')->nullable();
                $table->string('to_status')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
                $table->index(['document_request_id', 'created_at']);
                $table->index(['action', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('document_request_events');

        if (Schema::hasTable('document_requests')) {
            Schema::table('document_requests', function (Blueprint $table) {
                if (Schema::hasColumn('document_requests', 'assigned_staff_id')) {
                    $table->dropConstrainedForeignId('assigned_staff_id');
                }
                if (Schema::hasColumn('document_requests', 'status_changed_at')) {
                    $table->dropColumn('status_changed_at');
                }
            });
        }
    }
};
