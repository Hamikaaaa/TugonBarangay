<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Cedula')
            ->update([
                'label' => 'Cedula (Community Tax Certificate)',
                'name' => 'Cedula (Community Tax Certificate)',
                'fee_mode' => 'assessed',
                'applicant_fields' => json_encode([
                    ['key' => 'first_name', 'label' => 'First Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'last_name', 'label' => 'Last Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'middle_name', 'label' => 'Middle Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ]),
                'fields' => json_encode([]),
                'requirements' => json_encode([]),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('document_types')
            ->where('value', 'Cedula')
            ->update([
                'applicant_fields' => json_encode([
                    ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'address', 'label' => 'Home address', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'date_of_birth', 'label' => 'Date of birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'civil_status', 'label' => 'Civil status', 'type' => 'select', 'required' => true, 'options' => ['Single', 'Married', 'Widowed', 'Separated'], 'section' => 'applicant'],
                    ['key' => 'citizenship', 'label' => 'Citizenship', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'occupation', 'label' => 'Occupation or profession', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'contact_number', 'label' => 'Contact number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                ]),
                'fields' => json_encode([
                    ['key' => 'place_of_birth', 'label' => 'Place of birth', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'annual_income', 'label' => 'Estimated annual income (PHP)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'section' => 'details'],
                ]),
                'requirements' => json_encode([
                    ['key' => 'valid_id', 'label' => 'Valid government-issued ID', 'required' => true],
                    ['key' => 'proof_of_address', 'label' => 'Proof of address', 'required' => false],
                    ['key' => 'proof_of_income', 'label' => 'Proof of income, if available', 'required' => false],
                ]),
                'updated_at' => now(),
            ]);
    }
};
