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

        $applicantFields = json_decode($documentType->applicant_fields ?? '[]', true) ?: [];
        $fields = json_decode($documentType->fields ?? '[]', true) ?: [];
        $requirements = json_decode($documentType->requirements ?? '[]', true) ?: [];
        $removedKeys = [
            'email_address',
            'tax_year',
            'nature_of_business',
            'business_purok',
            'amendment_owner_from',
            'amendment_owner_to',
            'transfer_location_from',
            'transfer_owner_from',
            'taxpayer_signature_name',
            'taxpayer_position',
            'authorization_letter',
            'authorized_person_id',
            'business_owner_id',
            'applicant_is_owner',
            'authorized_person_name',
        ];

        $applicantFields = array_values(array_filter(
            $applicantFields,
            fn (array $field) => !in_array($field['key'] ?? null, $removedKeys, true),
        ));
        foreach ($applicantFields as &$field) {
            $key = $field['key'] ?? '';
            if ($key === 'full_name') {
                $field['label'] = 'Name of taxpayer';
                $field['required'] = false;
                $field['residentVisible'] = false;
            } elseif ($key === 'last_name') {
                $field['label'] = 'Last name';
                $field['required'] = true;
            } elseif ($key === 'first_name') {
                $field['label'] = 'First name';
                $field['required'] = true;
            } elseif ($key === 'middle_name') {
                $field['label'] = 'Middle name';
                $field['required'] = true;
            } elseif ($key === 'address') {
                $field['label'] = 'Complete owner address';
                $field['required'] = true;
            } elseif ($key === 'contact_number') {
                $field['label'] = 'Contact number';
                $field['required'] = true;
            }
        }
        unset($field);

        $groupOneKeys = [
            'application_type',
            'amendment_type',
            'transfer_type',
            'transfer_location_to',
            'transfer_owner_to',
        ];
        $fields = array_values(array_filter(
            $fields,
            fn (array $field) => !in_array($field['key'] ?? null, $removedKeys, true),
        ));
        $requirements = array_values(array_filter(
            $requirements,
            fn (array $requirement) => !in_array($requirement['key'] ?? null, $removedKeys, true),
        ));
        foreach ($requirements as &$requirement) {
            if (($requirement['key'] ?? null) === 'purok_certification') {
                $requirement['showWhen'] = ['key' => 'application_type', 'value' => ['New', 'Renewal']];
                $requirement['requiredWhen'] = ['key' => 'application_type', 'value' => ['New', 'Renewal']];
            } elseif (($requirement['key'] ?? null) === 'previous_business_clearance') {
                $requirement['showWhen'] = ['key' => 'application_type', 'value' => 'Renewal'];
                $requirement['requiredWhen'] = ['key' => 'application_type', 'value' => 'Renewal'];
            }
        }
        unset($requirement);
        $fieldsByKey = [];
        foreach ($fields as $field) {
            $fieldsByKey[$field['key']] = $field;
        }
        $fieldsByKey['business_attestation_accepted'] ??= [
            'key' => 'business_attestation_accepted',
            'label' => 'Attestation acceptance',
            'type' => 'text',
            'required' => false,
            'residentVisible' => false,
        ];

        $orderedKeys = [
            'application_type',
            'amendment_type',
            'transfer_type',
            'transfer_location_to',
            'transfer_owner_to',
            'business_ownership',
            'business_name',
            'tradename_franchise_name',
            'business_address',
            'business_area_sqm',
            'place_of_business',
            'monthly_rental',
            'lessor_name',
            'lessor_address',
            'business_attestation_accepted',
        ];
        $fields = [];
        foreach ($orderedKeys as $key) {
            if (!isset($fieldsByKey[$key])) {
                continue;
            }

            $field = $fieldsByKey[$key];
            $field['group'] = in_array($key, $groupOneKeys, true)
                ? '1. Application details'
                : '2. Type, taxpayer, and business information';
            if ($key === 'amendment_type') {
                $field['label'] = 'Amendments (optional)';
                $field['required'] = false;
                $field['options'] = [
                    'None',
                    'From Single to Partnership',
                    'From Single to Corporation',
                    'From Partnership to Single',
                    'From Partnership to Corporation',
                    'From Corporation to Single',
                    'From Corporation to Partnership',
                ];
            } elseif ($key === 'transfer_type') {
                $field['label'] = 'Transfer';
                $field['required'] = false;
                $field['options'] = ['None', 'Location', 'Ownership'];
            } elseif ($key === 'business_ownership') {
                $field['label'] = 'Type of business';
                $field['options'] = ['Sole Proprietorship', 'Partnership', 'Corporation', 'Cooperative'];
            } elseif ($key === 'business_address') {
                $field['label'] = 'Complete business address';
            } elseif ($key === 'tradename_franchise_name') {
                $field['label'] = 'Tradename / franchise name';
                $field['required'] = false;
            }
            $fields[] = $field;
        }

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'description' => 'For new applications, attach a Purok Certification, Cedula, applicant ID, DTI/SEC registration, and a picture of the business. For renewals, attach the previous Business Clearance and Purok Certification. If rented, attach the contract of lease.',
                'applicant_fields' => json_encode($applicantFields),
                'fields' => json_encode($fields),
                'requirements' => json_encode($requirements),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Keep the current resident form configuration when rolling back.
    }
};
