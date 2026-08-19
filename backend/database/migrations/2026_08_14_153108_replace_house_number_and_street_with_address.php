<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['house_number', 'street']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('address')->nullable()->after('purok');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('address');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('house_number')->nullable()->after('purok');
            $table->string('street')->nullable()->after('house_number');
        });
    }
};
