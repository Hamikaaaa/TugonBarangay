<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const WORDING = "This is to certify that the applicant whose name, picture, signature and thumb marks appearing hereto has not been brought before the Lupon/Pangkat of this Barangay for any complaint against {{object_pronoun}}, nor has committed any infraction of laws/ordinances as of this date, {{subject_pronoun}} {{subject_verb}} a law abiding citizen.\n\nNAME                 : {{full_name}}\nHOME ADDRESS         : {{address}}\nPLACE OF BIRTH       : {{place_of_birth}}\nDATE OF BIRTH        : {{date_of_birth}}\nREMARKS              : {{derogatory_remarks}}\n\nPURPOSE              : {{purpose}}\n\n______________________________\nApplicant's Signature\n\nVALID FOR            : Six (6) Months\n\nRes. Cert. No.        : ____________________\nIssued at             : CONSOLACION, CEBU\n\nLeft Thumb Mark                       Right Thumb Mark\n    \nHON. FE Q. CUYOS\nPunong Barangay\n\nPaid Under\nO.R. No.              : ____________________\nAmount Paid           : ₱75.00\nDoc. Stamp            : ₱30.00";

    public function up(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->first();

        if (!$documentType) {
            return;
        }

        $applicantFields = json_decode($documentType->applicant_fields, true) ?: [];
        foreach ($applicantFields as &$field) {
            if (($field['key'] ?? null) === 'address') {
                $field['label'] = 'Home Address';
                $field['required'] = true;
            }
        }
        unset($field);

        if (!collect($applicantFields)->contains('key', 'place_of_birth')) {
            $applicantFields[] = [
                'key' => 'place_of_birth',
                'label' => 'Place of Birth',
                'type' => 'text',
                'required' => true,
                'section' => 'applicant',
            ];
        }

        $fields = json_decode($documentType->fields, true) ?: [];
        $fields = array_values(array_filter($fields, fn (array $field) => ($field['key'] ?? null) !== 'purpose_other'));
        foreach ($fields as &$field) {
            if (($field['key'] ?? null) === 'purpose') {
                $field['label'] = 'Purpose (for example, employment at Gaisano)';
                $field['type'] = 'text';
                $field['required'] = true;
                unset($field['options'], $field['requiredWhen'], $field['showWhen']);
            }
        }
        unset($field);

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode($applicantFields),
                'fields' => json_encode($fields),
                'template' => blank($documentType->template) ? self::WORDING : $documentType->template,
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

        $applicantFields = json_decode($documentType->applicant_fields, true) ?: [];
        $applicantFields = array_values(array_filter(
            $applicantFields,
            fn (array $field) => ($field['key'] ?? null) !== 'place_of_birth',
        ));
        foreach ($applicantFields as &$field) {
            if (($field['key'] ?? null) === 'address') {
                $field['label'] = 'House/Building No., Street, and Subdivision';
                $field['required'] = false;
            }
        }
        unset($field);

        $fields = json_decode($documentType->fields, true) ?: [];
        foreach ($fields as &$field) {
            if (($field['key'] ?? null) === 'purpose') {
                $field['label'] = 'Purpose of request';
                $field['type'] = 'select';
                $field['options'] = ['Employment', 'School enrollment or scholarship', 'Business or business permit', 'Travel', 'Bank or loan application', 'Other'];
            }
        }
        unset($field);
        $fields[] = [
            'key' => 'purpose_other',
            'label' => 'Please specify your purpose',
            'type' => 'text',
            'required' => true,
            'requiredWhen' => ['key' => 'purpose', 'value' => 'Other'],
            'section' => 'details',
        ];

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'applicant_fields' => json_encode($applicantFields),
                'fields' => json_encode($fields),
                'template' => $documentType->template === self::WORDING ? null : $documentType->template,
                'updated_at' => now(),
            ]);
    }
};
