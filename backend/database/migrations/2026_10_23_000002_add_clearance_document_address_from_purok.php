<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->first();

        if (!$documentType) {
            return;
        }

        $fields = json_decode($documentType->applicant_fields, true) ?: [];
        $fields = array_values(array_filter($fields, fn (array $field) => ($field['key'] ?? null) !== 'address'));
        $purokIndex = array_search('purok', array_column($fields, 'key'), true);
        $addressField = [
            'key' => 'address',
            'label' => 'Address',
            'type' => 'text',
            'required' => false,
            'residentVisible' => false,
            'section' => 'applicant',
        ];

        array_splice($fields, $purokIndex === false ? count($fields) : $purokIndex, 0, [$addressField]);

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->first();

        if (!$documentType) {
            return;
        }

        $fields = json_decode($documentType->applicant_fields, true) ?: [];
        $fields = array_values(array_filter($fields, fn (array $field) => ($field['key'] ?? null) !== 'address'));

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }
};
