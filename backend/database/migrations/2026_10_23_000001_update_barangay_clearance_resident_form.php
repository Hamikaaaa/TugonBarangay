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

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode([
                    ['key' => 'first_name', 'label' => 'First Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'last_name', 'label' => 'Last Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'middle_name', 'label' => 'Middle Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'place_of_birth', 'label' => 'Place of Birth', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'date_of_birth', 'label' => 'Date of Birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
                ]),
                'fields' => json_encode([
                    [
                        'key' => 'purpose',
                        'label' => 'Purpose',
                        'type' => 'select',
                        'required' => true,
                        'options' => ['Employment', 'School enrollment or scholarship', 'Business or business permit', 'Travel', 'Bank or loan application', 'Other'],
                        'section' => 'details',
                    ],
                    [
                        'key' => 'purpose_other',
                        'label' => 'Please specify your purpose',
                        'type' => 'text',
                        'required' => true,
                        'showWhen' => ['key' => 'purpose', 'value' => 'Other'],
                        'requiredWhen' => ['key' => 'purpose', 'value' => 'Other'],
                        'section' => 'details',
                        'submit' => false,
                    ],
                ]),
                'requirements' => json_encode([
                    ['key' => 'valid_id', 'label' => 'Valid ID', 'required' => true],
                    ['key' => 'purok_certificate', 'label' => 'Purok Certification', 'required' => true],
                ]),
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

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode([
                    ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'address', 'label' => 'Home Address', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'date_of_birth', 'label' => 'Date of Birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'sex', 'label' => 'Sex', 'type' => 'select', 'required' => true, 'options' => ['Female', 'Male', 'Other'], 'section' => 'applicant'],
                    ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'place_of_birth', 'label' => 'Place of Birth', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ]),
                'fields' => json_encode([
                    ['key' => 'purpose', 'label' => 'Purpose (for example, employment at Gaisano)', 'type' => 'text', 'required' => true, 'section' => 'details'],
                ]),
                'requirements' => json_encode([
                    ['key' => 'purok_certificate', 'label' => 'Purok Certificate', 'required' => true],
                    ['key' => 'valid_id', 'label' => 'Valid government-issued ID', 'required' => true],
                    ['key' => 'applicant_photo', 'label' => 'Applicant Photo (JPG or PNG, up to 5 MB)', 'required' => true],
                ]),
                'updated_at' => now(),
            ]);
    }
};
