<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('blotter_entries')) {
            return;
        }

        Schema::create('blotter_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->nullable()->constrained('residents')->nullOnDelete();
            $table->string('resident_name'); // The person being blottered (respondent)
            $table->string('complainant_name')->nullable(); // The person who filed the blotter
            $table->string('incident_type');
            $table->date('incident_date');
            $table->time('incident_time')->nullable();
            $table->string('location')->nullable();
            $table->text('narrative');
            $table->string('status')->default('open');
            $table->text('remarks')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('staff')->nullOnDelete();
            $table->timestamps();

            $table->index(['resident_id', 'status']);
            $table->index('incident_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blotter_entries');
    }
};
