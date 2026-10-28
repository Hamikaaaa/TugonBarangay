<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $ownershipAmendments = [
            'From Single to Partnership',
            'From Single to Corporation',
            'From Partnership to Single',
            'From Partnership to Corporation',
            'From Corporation to Single',
            'From Corporation to Partnership',
        ];

        $fields = [
            ['key' => 'application_type', 'label' => 'Application', 'type' => 'select', 'required' => true, 'options' => ['New', 'Renewal'], 'group' => 'Application'],
            ['key' => 'tax_year', 'label' => 'Tax year', 'type' => 'number', 'required' => true, 'min' => 2020, 'step' => 1, 'group' => 'Application'],
            ['key' => 'business_ownership', 'label' => 'Type of business ownership', 'type' => 'select', 'required' => true, 'options' => ['Sole Proprietorship', 'Partnership', 'Corporation', 'Cooperative'], 'group' => 'Business information'],
            ['key' => 'business_name', 'label' => 'Business name', 'type' => 'text', 'required' => true, 'group' => 'Business information'],
            ['key' => 'tradename_franchise_name', 'label' => 'Trade name / franchise name', 'type' => 'text', 'required' => false, 'group' => 'Business information'],
            ['key' => 'nature_of_business', 'label' => 'Nature of business', 'type' => 'text', 'required' => true, 'group' => 'Business information'],
            ['key' => 'business_address', 'label' => 'Complete business address', 'type' => 'text', 'required' => true, 'group' => 'Business information'],
            ['key' => 'business_purok', 'label' => 'Business Purok', 'type' => 'text', 'required' => true, 'group' => 'Business information'],
            ['key' => 'business_area_sqm', 'label' => 'Business area (sq. m.)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'group' => 'Business information'],
            ['key' => 'place_of_business', 'label' => 'Place of business', 'type' => 'select', 'required' => true, 'options' => ['Owned', 'Rented'], 'group' => 'Business information'],
            ['key' => 'monthly_rental', 'label' => 'Monthly rental (PHP)', 'type' => 'number', 'required' => false, 'min' => 0, 'step' => 0.01, 'showWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'requiredWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'group' => 'Rental information'],
            ['key' => 'lessor_name', 'label' => "Lessor's name", 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'requiredWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'group' => 'Rental information'],
            ['key' => 'lessor_address', 'label' => "Lessor's address", 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'requiredWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'group' => 'Rental information'],
            ['key' => 'amendment_type', 'label' => 'Ownership amendment', 'type' => 'select', 'required' => true, 'options' => array_merge(['None'], $ownershipAmendments), 'group' => 'Amendments'],
            ['key' => 'amendment_owner_from', 'label' => 'Current owner / business type', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'amendment_type', 'value' => $ownershipAmendments], 'requiredWhen' => ['key' => 'amendment_type', 'value' => $ownershipAmendments], 'group' => 'Amendments'],
            ['key' => 'amendment_owner_to', 'label' => 'New owner(s) / business type', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'amendment_type', 'value' => $ownershipAmendments], 'requiredWhen' => ['key' => 'amendment_type', 'value' => $ownershipAmendments], 'group' => 'Amendments'],
            ['key' => 'transfer_type', 'label' => 'Transfer type', 'type' => 'select', 'required' => true, 'options' => ['None', 'Location', 'Ownership'], 'group' => 'Transfers'],
            ['key' => 'transfer_location_from', 'label' => 'Current business location', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'transfer_type', 'value' => 'Location'], 'requiredWhen' => ['key' => 'transfer_type', 'value' => 'Location'], 'group' => 'Transfers'],
            ['key' => 'transfer_location_to', 'label' => 'Transfer business to this location', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'transfer_type', 'value' => 'Location'], 'requiredWhen' => ['key' => 'transfer_type', 'value' => 'Location'], 'group' => 'Transfers'],
            ['key' => 'transfer_owner_from', 'label' => 'Current owner / ownership', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'transfer_type', 'value' => 'Ownership'], 'requiredWhen' => ['key' => 'transfer_type', 'value' => 'Ownership'], 'group' => 'Transfers'],
            ['key' => 'transfer_owner_to', 'label' => 'Transfer ownership to (person / entity)', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'transfer_type', 'value' => 'Ownership'], 'requiredWhen' => ['key' => 'transfer_type', 'value' => 'Ownership'], 'group' => 'Transfers'],
            ['key' => 'taxpayer_signature_name', 'label' => 'Taxpayer / authorized representative name', 'type' => 'text', 'required' => true, 'group' => 'Attestation'],
            ['key' => 'taxpayer_position', 'label' => 'Position', 'type' => 'text', 'required' => false, 'group' => 'Attestation'],
        ];

        $newApplication = ['key' => 'application_type', 'value' => 'New'];
        $renewal = ['key' => 'application_type', 'value' => 'Renewal'];
        $requirements = [
            ['key' => 'purok_certification', 'label' => 'Purok Certification', 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
            ['key' => 'cedula_copy', 'label' => 'Cedula (Community Tax Certificate)', 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
            ['key' => 'applicant_id', 'label' => "Applicant's ID", 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
            ['key' => 'dti_sec_registration', 'label' => 'DTI / SEC registration', 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
            ['key' => 'business_picture', 'label' => 'Picture of the business', 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
            ['key' => 'previous_business_clearance', 'label' => 'Previous Business Clearance', 'required' => false, 'showWhen' => $renewal, 'requiredWhen' => $renewal],
            ['key' => 'lease_contract', 'label' => 'Contract of lease', 'required' => false, 'showWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'requiredWhen' => ['key' => 'place_of_business', 'value' => 'Rented']],
            ['key' => 'authorization_letter', 'label' => "Photocopy of owner's signed authorization", 'required' => false, 'showWhen' => ['key' => 'applicant_is_owner', 'value' => 'No'], 'requiredWhen' => ['key' => 'applicant_is_owner', 'value' => 'No']],
            ['key' => 'authorized_person_id', 'label' => "Photocopy of authorized person's ID with 3 specimen signatures", 'required' => false, 'showWhen' => ['key' => 'applicant_is_owner', 'value' => 'No'], 'requiredWhen' => ['key' => 'applicant_is_owner', 'value' => 'No']],
            ['key' => 'business_owner_id', 'label' => "Photocopy of business owner's ID with 3 specimen signatures", 'required' => false, 'showWhen' => ['key' => 'applicant_is_owner', 'value' => 'No'], 'requiredWhen' => ['key' => 'applicant_is_owner', 'value' => 'No']],
        ];

        DB::table('document_types')->where('value', 'Business Permit')->update([
            'label' => 'Business Clearance',
            'name' => 'Business Clearance',
            'description' => "New applications require a Purok Certification, Cedula, applicant ID, DTI/SEC registration, and business photo. If rented, attach the contract of lease. If someone other than the owner is applying, attach the owner's authorization and both required IDs. Renewals require the previous Business Clearance.",
            'applicant_fields' => json_encode([
                ['key' => 'full_name', 'label' => 'Name of taxpayer', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'first_name', 'label' => 'First name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'last_name', 'label' => 'Last name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'middle_name', 'label' => 'Middle name', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
                ['key' => 'address', 'label' => "Complete owner's address", 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'contact_number', 'label' => 'Contact number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                ['key' => 'email_address', 'label' => 'Email address', 'type' => 'email', 'required' => true, 'section' => 'applicant'],
                ['key' => 'applicant_is_owner', 'label' => 'Are you the business owner?', 'type' => 'select', 'required' => true, 'options' => ['Yes', 'No'], 'section' => 'applicant'],
                ['key' => 'authorized_person_name', 'label' => "Authorized person's name", 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'applicant_is_owner', 'value' => 'No'], 'requiredWhen' => ['key' => 'applicant_is_owner', 'value' => 'No'], 'section' => 'applicant'],
            ]),
            'fields' => json_encode($fields),
            'requirements' => json_encode($requirements),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('document_types')->where('value', 'Business Permit')->update([
            'label' => 'Business Clearance',
            'name' => 'Business Clearance',
            'description' => null,
            'applicant_fields' => json_encode([
                ['key' => 'contact_number', 'label' => 'Contact Number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'address', 'label' => 'Applicant Address', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
                ['key' => 'sex', 'label' => 'Sex', 'type' => 'select', 'required' => true, 'options' => ['Female', 'Male', 'Other'], 'section' => 'applicant'],
                ['key' => 'business_name', 'label' => 'Business Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'business_address', 'label' => 'Business Address', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'occupation', 'label' => 'Occupation', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'income', 'label' => 'Income (PHP)', 'type' => 'number', 'required' => true, 'min' => 0, 'section' => 'applicant'],
            ]),
            'fields' => json_encode([]),
            'requirements' => json_encode([
                ['key' => 'purok_certificate', 'label' => 'Purok Certificate', 'required' => true],
                ['key' => 'valid_id', 'label' => 'Valid government-issued ID', 'required' => true],
            ]),
            'updated_at' => now(),
        ]);
    }
};
