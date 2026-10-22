<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->replaceSignatory('Hon. fe Q. Cuyos');
    }

    public function down(): void
    {
        $this->replaceSignatory('HON. FE Q. CUYOS');
    }

    private function replaceSignatory(string $replacement): void
    {
        DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->get(['id', 'template'])
            ->each(function (object $documentType) use ($replacement): void {
                $template = str_ireplace(
                    ['HON. FE Q. CUYOS', 'Hon. Fe Q. Cuyos'],
                    $replacement,
                    $documentType->template ?? '',
                );

                if ($template !== $documentType->template) {
                    DB::table('document_types')
                        ->where('id', $documentType->id)
                        ->update(['template' => $template, 'updated_at' => now()]);
                }
            });
    }
};
