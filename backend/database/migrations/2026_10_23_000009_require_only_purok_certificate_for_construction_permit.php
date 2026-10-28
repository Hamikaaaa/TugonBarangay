<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Construction Permit')
            ->update([
                'requirements' => json_encode([
                    ['key' => 'purok_certificate', 'label' => 'Purok Certificate', 'required' => true],
                ]),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Keep the single required document in place when rolling back this form update.
    }
};
