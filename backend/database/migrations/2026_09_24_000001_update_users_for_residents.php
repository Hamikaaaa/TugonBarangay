<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'resident_id')) {
                $table->string('resident_id')->nullable()->unique();
            }

            if (!Schema::hasColumn('users', 'barangay')) {
                $table->string('barangay')->nullable();
            }

            if (!Schema::hasColumn('users', 'mobile_number')) {
                $table->string('mobile_number')->nullable();
            }

            if (!Schema::hasColumn('users', 'address')) {
                $table->text('address')->nullable();
            }

            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->default('inactive');
            }

            if (!Schema::hasColumn('users', 'verification_status')) {
                $table->string('verification_status')->default('pending');
            }

            if (!Schema::hasColumn('users', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable();
            }

            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('resident');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = [
                'resident_id',
                'barangay',
                'mobile_number',
                'address',
                'status',
                'verification_status',
                'rejection_reason',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};