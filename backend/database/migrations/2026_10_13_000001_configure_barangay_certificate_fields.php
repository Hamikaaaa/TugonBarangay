<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Barangay Certificate')
            ->first();

        if (!$documentType) {
            return;
        }

        $fields = json_decode($documentType->fields ?: '[]', true) ?: [];
        foreach ($fields as &$field) {
            if (($field['key'] ?? null) === 'purpose') {
                $field['options'] = array_values(array_unique(array_merge(
                    ['Scholarship Program'],
                    $field['options'] ?? [],
                )));
            }
        }
        unset($field);
        if (!collect($fields)->contains(fn ($field) => ($field['key'] ?? null) === 'purpose')) {
            $fields[] = [
                'key' => 'purpose',
                'label' => 'Purpose of request',
                'type' => 'select',
                'required' => true,
                'options' => ['Scholarship Program', 'Employment', 'School enrollment or scholarship', 'Other'],
                'section' => 'details',
            ];
        }

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode([
                    ['key' => 'first_name', 'label' => 'First name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'middle_name', 'label' => 'Middle name', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
                    ['key' => 'last_name', 'label' => 'Last name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'date_of_birth', 'label' => 'Date of birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'age', 'label' => 'Age', 'type' => 'number', 'required' => true, 'readOnly' => true, 'section' => 'applicant'],
                    ['key' => 'sex', 'label' => 'Gender', 'type' => 'select', 'required' => true, 'options' => ['Female', 'Male', 'Other'], 'section' => 'applicant'],
                    ['key' => 'civil_status', 'label' => 'Civil status', 'type' => 'select', 'required' => true, 'options' => ['Single', 'Married', 'Widowed', 'Separated', 'Other'], 'section' => 'applicant'],
                    ['key' => 'citizenship', 'label' => 'Nationality', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ]),
                'fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Barangay Certificate')
            ->first();

        if (!$documentType) {
            return;
        }

        $fields = json_decode($documentType->fields ?: '[]', true) ?: [];
        foreach ($fields as &$field) {
            if (($field['key'] ?? null) === 'purpose') {
                $field['options'] = ['Employment', 'School enrollment or scholarship', 'Business or business permit', 'Travel', 'Bank or loan application', 'Other'];
            }
        }
        unset($field);

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode([
                    ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'address', 'label' => 'House/Building No., Street, and Subdivision', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
                    ['key' => 'date_of_birth', 'label' => 'Date of Birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'sex', 'label' => 'Sex', 'type' => 'select', 'required' => true, 'options' => ['Female', 'Male', 'Other'], 'section' => 'applicant'],
                    ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ]),
                'fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }
};
