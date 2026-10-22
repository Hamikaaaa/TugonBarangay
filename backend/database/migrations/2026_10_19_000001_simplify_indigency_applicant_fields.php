<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $type = DB::table('document_types')->where('value', 'Barangay Indigency')->first();
        if (!$type) {
            return;
        }

        $fields = json_decode($type->applicant_fields ?: '[]', true) ?: [];
        $fields = array_values(array_filter(
            $fields,
            fn (array $field) => !in_array($field['key'] ?? null, ['address', 'date_of_birth', 'sex'], true),
        ));

        DB::table('document_types')->where('id', $type->id)->update([
            'applicant_fields' => json_encode($fields),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        $type = DB::table('document_types')->where('value', 'Barangay Indigency')->first();
        if (!$type) {
            return;
        }

        $fields = json_decode($type->applicant_fields ?: '[]', true) ?: [];
        $keys = array_column($fields, 'key');
        $restore = [
            ['key' => 'address', 'label' => 'House/Building No., Street, and Subdivision', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
            ['key' => 'date_of_birth', 'label' => 'Date of Birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
            ['key' => 'sex', 'label' => 'Sex', 'type' => 'select', 'required' => true, 'options' => ['Female', 'Male', 'Other'], 'section' => 'applicant'],
        ];
        foreach ($restore as $field) {
            if (!in_array($field['key'], $keys, true)) {
                $fields[] = $field;
            }
        }

        DB::table('document_types')->where('id', $type->id)->update([
            'applicant_fields' => json_encode($fields),
            'updated_at' => now(),
        ]);
    }
};
