<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $type = DB::table('document_types')
            ->where('value', 'First-Time Jobseeker Certification')
            ->first();
        if (!$type) {
            return;
        }

        $applicantFields = json_decode($type->applicant_fields ?: '[]', true) ?: [];
        $applicantFields = array_values(array_filter(
            $applicantFields,
            fn (array $field) => in_array($field['key'] ?? null, ['full_name', 'purok', 'age'], true),
        ));
        $keys = array_column($applicantFields, 'key');
        foreach ([
            ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
            ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
            ['key' => 'age', 'label' => 'Age', 'type' => 'number', 'required' => true, 'min' => 0, 'max' => 150, 'readOnly' => true, 'section' => 'applicant'],
        ] as $field) {
            if (!in_array($field['key'], $keys, true)) {
                $applicantFields[] = $field;
            }
        }

        DB::table('document_types')
            ->where('id', $type->id)
            ->update([
                'applicant_fields' => json_encode($applicantFields),
                'fields' => json_encode([
                    ['key' => 'years_of_residency', 'label' => 'Years of residency', 'type' => 'number', 'required' => true, 'min' => 0, 'max' => 150, 'step' => 1, 'section' => 'details'],
                ]),
                'one_time' => true,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        $type = DB::table('document_types')
            ->where('value', 'First-Time Jobseeker Certification')
            ->first();
        if (!$type) {
            return;
        }

        DB::table('document_types')
            ->where('id', $type->id)
            ->update([
                'applicant_fields' => json_encode([
                    ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'address', 'label' => 'House/Building No., Street, and Subdivision', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
                    ['key' => 'date_of_birth', 'label' => 'Date of Birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'sex', 'label' => 'Sex', 'type' => 'select', 'required' => true, 'options' => ['Female', 'Male', 'Other'], 'section' => 'applicant'],
                    ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ]),
                'fields' => json_encode([
                    ['key' => 'purpose', 'label' => 'Purpose of request', 'type' => 'select', 'required' => true, 'options' => ['Employment', 'School enrollment or scholarship', 'Business or business permit', 'Travel', 'Bank or loan application', 'Other'], 'section' => 'details'],
                    ['key' => 'purpose_other', 'label' => 'Please specify your purpose', 'type' => 'text', 'required' => true, 'requiredWhen' => ['key' => 'purpose', 'value' => 'Other'], 'section' => 'details'],
                ]),
                'one_time' => true,
                'updated_at' => now(),
            ]);
    }
};
