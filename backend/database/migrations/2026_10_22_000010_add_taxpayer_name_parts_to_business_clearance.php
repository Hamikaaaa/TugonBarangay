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

        $fields = json_decode($documentType->applicant_fields ?? '[]', true) ?: [];
        $definitions = [
            'full_name' => [
                'key' => 'full_name',
                'label' => 'Name of taxpayer',
                'type' => 'text',
                'required' => true,
                'section' => 'applicant',
            ],
            'first_name' => [
                'key' => 'first_name',
                'label' => 'First name',
                'type' => 'text',
                'required' => true,
                'section' => 'applicant',
            ],
            'last_name' => [
                'key' => 'last_name',
                'label' => 'Last name',
                'type' => 'text',
                'required' => true,
                'section' => 'applicant',
            ],
            'middle_name' => [
                'key' => 'middle_name',
                'label' => 'Middle name',
                'type' => 'text',
                'required' => false,
                'section' => 'applicant',
            ],
        ];

        $remainingFields = array_values(array_filter(
            $fields,
            fn (array $field) => !array_key_exists($field['key'] ?? '', $definitions),
        ));
        $insertIndex = collect($fields)->search(
            fn (array $field) => ($field['key'] ?? null) === 'full_name',
        );
        $insertIndex = $insertIndex === false ? 0 : $insertIndex;
        $applicantFields = array_merge(
            array_slice($remainingFields, 0, $insertIndex),
            array_values($definitions),
            array_slice($remainingFields, $insertIndex),
        );

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode($applicantFields),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Business Permit')
            ->first();

        if (!$documentType) {
            return;
        }

        $fields = json_decode($documentType->applicant_fields ?? '[]', true) ?: [];
        $fields = array_values(array_filter(
            $fields,
            fn (array $field) => !in_array(
                $field['key'] ?? null,
                ['first_name', 'last_name', 'middle_name'],
                true,
            ),
        ));

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }
};
