<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->replaceSignatory('HON. ANTONIETTO S. PEPITO', 'Hon. Fe Q. Cuyos');
    }

    public function down(): void
    {
        $this->replaceSignatory('Hon. Fe Q. Cuyos', 'HON. ANTONIETTO S. PEPITO');
    }

    private function replaceSignatory(string $from, string $to): void
    {
        DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->where('template', 'like', '%'.$from.'%')
            ->get(['id', 'template'])
            ->each(function (object $documentType) use ($from, $to): void {
                DB::table('document_types')
                    ->where('id', $documentType->id)
                    ->update([
                        'template' => str_replace($from, $to, $documentType->template),
                        'updated_at' => now(),
                    ]);
            });
    }
};
