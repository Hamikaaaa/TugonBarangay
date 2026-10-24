<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('summon_entries', function (Blueprint $table) {
            $table->id();
            $table->string('barangay_name');
            $table->string('municipality');
            $table->string('province');
            $table->string('complainant');
            $table->string('respondent');
            $table->string('reference_no')->nullable();
            $table->string('nature_of_dispute', 1000)->nullable();
            $table->string('respondent_address', 500)->nullable();
            $table->date('hearing_date');
            $table->string('hearing_time', 5);
            $table->string('venue', 500);
            $table->string('issued_by')->nullable();
            $table->json('document_settings')->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->boolean('complainant_attended')->nullable();
            $table->boolean('respondent_attended')->nullable();
            $table->string('status')->default('scheduled');
            $table->string('template_path')->nullable();
            $table->string('template_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('summon_entries');
    }
};
