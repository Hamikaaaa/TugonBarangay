<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Cedula')
            ->update([
                'requirements' => json_encode([
                    ['key' => 'national_government_id', 'label' => 'National Government ID', 'required' => true],
                ]),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('document_types')
            ->where('value', 'Cedula')
            ->update([
                'requirements' => json_encode([]),
                'updated_at' => now(),
            ]);
    }
};
