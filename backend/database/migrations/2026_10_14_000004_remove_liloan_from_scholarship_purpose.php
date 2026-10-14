<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->replacePurposeOption('Liloan Scholarship Program', 'Scholarship Program');
    }

    public function down(): void
    {
        $this->replacePurposeOption('Scholarship Program', 'Liloan Scholarship Program');
    }

    private function replacePurposeOption(string $from, string $to): void
    {
        $documentType = DB::table('document_types')->where('value', 'Barangay Certificate')->first();
        if (!$documentType) return;

        $fields = json_decode($documentType->fields ?: '[]', true) ?: [];
        foreach ($fields as &$field) {
            if (($field['key'] ?? null) !== 'purpose') continue;
            $field['options'] = array_values(array_unique(array_map(
                static fn ($option) => $option === $from ? $to : $option,
                $field['options'] ?? [],
            )));
        }
        unset($field);

        DB::table('document_types')->where('id', $documentType->id)->update([
            'fields' => json_encode($fields, JSON_UNESCAPED_UNICODE),
            'updated_at' => now(),
        ]);
    }
};
