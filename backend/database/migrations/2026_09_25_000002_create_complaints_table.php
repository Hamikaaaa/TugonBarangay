<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('category');
            $table->string('subject');
            $table->text('description');
            $table->date('incident_date')->nullable();
            $table->string('location')->nullable();
            $table->text('relevant_information')->nullable();
            $table->string('evidence_path')->nullable();
            $table->string('status')->default('pending');
            $table->text('resolution_details')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
