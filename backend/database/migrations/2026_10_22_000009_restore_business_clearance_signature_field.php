<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Business Permit')
            ->first();

        if (!$documentType) {
            return;
        }

        $fields = json_decode($documentType->fields ?? '[]', true) ?: [];
        $hasSignatureField = collect($fields)->contains(
            fn (array $field) => ($field['key'] ?? null) === 'taxpayer_signature_name',
        );

        if (!$hasSignatureField) {
            $fields[] = [
                'key' => 'taxpayer_signature_name',
                'label' => 'Taxpayer / authorized representative name',
                'type' => 'text',
                'required' => true,
                'group' => 'Attestation',
            ];

            DB::table('document_types')
                ->where('id', $documentType->id)
                ->update([
                    'fields' => json_encode($fields),
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Business Permit')
            ->first();

        if (!$documentType) {
            return;
        }

        $fields = json_decode($documentType->fields ?? '[]', true) ?: [];
        $fields = array_values(array_filter(
            $fields,
            fn (array $field) => ($field['key'] ?? null) !== 'taxpayer_signature_name',
        ));

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }
};
