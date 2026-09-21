<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('barangay_registry', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix')->nullable();
            $table->date('date_of_birth');
            $table->string('sex');
            $table->string('purok');
            $table->string('address')->nullable();
            $table->string('mobile_number', 11);
            $table->timestamps();
            $table->index(['last_name', 'first_name', 'date_of_birth']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('barangay_registry');
    }
};
