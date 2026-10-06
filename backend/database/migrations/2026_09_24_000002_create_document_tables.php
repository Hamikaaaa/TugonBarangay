
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('enabled')->default(true);
            $table->decimal('fee', 10, 2)->default(0);
            $table->string('processing_time')->default('2 days');
            $table->timestamps();
        });

        Schema::create('document_requirements', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->boolean('mandatory')->default(true);
            $table->boolean('enabled')->default(true);
            $table->text('instruction')->nullable();
            $table->timestamps();
        });

        Schema::create('document_type_requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('document_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_requirement_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('document_templates', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->string('signature');
            $table->integer('version')->default(1);
            $table->string('updated_by')->nullable();
            $table->text('change_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_templates');
        Schema::dropIfExists('document_type_requirements');
        Schema::dropIfExists('document_requirements');
        Schema::dropIfExists('document_types');
    }
};