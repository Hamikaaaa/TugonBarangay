<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private array $puroks = [
        1 => 'Sunflower',
        2 => 'Gumamela',
        3 => 'Calachuchi',
        4 => 'Zinnia',
        5 => 'Orchids',
        6 => 'Daisy',
        7 => 'Rosal',
        8 => 'Bombil',
        9 => 'Santan',
        10 => 'Bangkok',
    ];

    public function up(): void
    {
        foreach ($this->puroks as $number => $name) {
            foreach (['barangay_registry', 'residents'] as $table) {
                DB::table($table)
                    ->whereRaw('LOWER(TRIM(purok)) = ?', [strtolower("Purok {$number}")])
                    ->update(['purok' => $name]);
            }
        }
    }

    public function down(): void
    {
        foreach ($this->puroks as $number => $name) {
            foreach (['barangay_registry', 'residents'] as $table) {
                DB::table($table)
                    ->where('purok', $name)
                    ->update(['purok' => "Purok {$number}"]);
            }
        }
    }
};
