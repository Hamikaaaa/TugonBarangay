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
                'fields' => json_encode([
                    [
                        'key' => 'taxable_amount',
                        'label' => 'Annual Gross Salary (PHP)',
                        'type' => 'number',
                        'required' => true,
                        'min' => 0,
                        'step' => 0.01,
                        'section' => 'details',
                    ],
                ]),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('document_types')
            ->where('value', 'Cedula')
            ->update([
                'fields' => json_encode([]),
                'updated_at' => now(),
            ]);
    }
};
