<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Business Permit')
            ->update([
                'label' => 'Business Clearance',
                'name' => 'Business Clearance',
                'description' => 'For new applications, attach a Purok Certification, Cedula, applicant ID, DTI/SEC registration, and a picture of the business. For renewals, attach the previous Business Clearance. Complete this online form for either application.',
                'applicant_fields' => json_encode([
                    ['key' => 'full_name', 'label' => 'Name of taxpayer / applicant', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'address', 'label' => "Complete owner's address", 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'contact_number', 'label' => 'Contact number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'email_address', 'label' => 'Email address', 'type' => 'email', 'required' => true, 'section' => 'applicant'],
                ]),
                'fields' => json_encode([
                    ['key' => 'application_type', 'label' => 'Application', 'type' => 'select', 'required' => true, 'options' => ['New', 'Renewal'], 'section' => 'details'],
                    ['key' => 'tax_year', 'label' => 'Tax year', 'type' => 'number', 'required' => true, 'min' => 2020, 'step' => 1, 'section' => 'details'],
                    ['key' => 'business_ownership', 'label' => 'Type of business ownership', 'type' => 'select', 'required' => true, 'options' => ['Sole Proprietorship', 'Partnership', 'Corporation', 'Cooperative'], 'section' => 'details'],
                    ['key' => 'amendment_type', 'label' => 'Amendment, if applicable', 'type' => 'select', 'required' => false, 'options' => ['None', 'Single to Partnership', 'Single to Corporation', 'Partnership to Single', 'Partnership to Corporation', 'Corporation to Single', 'Corporation to Partnership'], 'section' => 'details'],
                    ['key' => 'transfer_type', 'label' => 'Transfer, if applicable', 'type' => 'select', 'required' => false, 'options' => ['None', 'Location', 'Ownership'], 'section' => 'details'],
                    ['key' => 'business_name', 'label' => 'Business name', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'tradename_franchise_name', 'label' => 'Trade name / franchise name', 'type' => 'text', 'required' => false, 'section' => 'details'],
                    ['key' => 'nature_of_business', 'label' => 'Nature of business', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'business_address', 'label' => 'Complete business address', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'business_purok', 'label' => 'Business Purok', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'business_area_sqm', 'label' => 'Business area (sq. m.)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'section' => 'details'],
                    ['key' => 'place_of_business', 'label' => 'Place of business', 'type' => 'select', 'required' => true, 'options' => ['Owned', 'Rented'], 'section' => 'details'],
                    ['key' => 'monthly_rental', 'label' => 'Monthly rental (PHP)', 'type' => 'number', 'required' => false, 'min' => 0, 'step' => 0.01, 'showWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'requiredWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'section' => 'details'],
                    ['key' => 'lessor_name', 'label' => "Lessor's name", 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'requiredWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'section' => 'details'],
                    ['key' => 'lessor_address', 'label' => "Lessor's address", 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'requiredWhen' => ['key' => 'place_of_business', 'value' => 'Rented'], 'section' => 'details'],
                    ['key' => 'taxpayer_signature_name', 'label' => 'Taxpayer / authorized representative name', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'taxpayer_position', 'label' => 'Position', 'type' => 'text', 'required' => false, 'section' => 'details'],
                ]),
                'requirements' => json_encode([
                    ['key' => 'purok_certification', 'label' => 'Purok Certification', 'required' => false, 'showWhen' => ['key' => 'application_type', 'value' => 'New'], 'requiredWhen' => ['key' => 'application_type', 'value' => 'New']],
                    ['key' => 'cedula_copy', 'label' => 'Cedula (Community Tax Certificate)', 'required' => false, 'showWhen' => ['key' => 'application_type', 'value' => 'New'], 'requiredWhen' => ['key' => 'application_type', 'value' => 'New']],
                    ['key' => 'applicant_id', 'label' => "Applicant's ID", 'required' => false, 'showWhen' => ['key' => 'application_type', 'value' => 'New'], 'requiredWhen' => ['key' => 'application_type', 'value' => 'New']],
                    ['key' => 'dti_sec_registration', 'label' => 'DTI / SEC registration', 'required' => false, 'showWhen' => ['key' => 'application_type', 'value' => 'New'], 'requiredWhen' => ['key' => 'application_type', 'value' => 'New']],
                    ['key' => 'business_picture', 'label' => 'Picture of the business', 'required' => false, 'showWhen' => ['key' => 'application_type', 'value' => 'New'], 'requiredWhen' => ['key' => 'application_type', 'value' => 'New']],
                    ['key' => 'previous_business_clearance', 'label' => 'Previous Business Clearance', 'required' => false, 'showWhen' => ['key' => 'application_type', 'value' => 'Renewal'], 'requiredWhen' => ['key' => 'application_type', 'value' => 'Renewal']],
                ]),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('document_types')
            ->where('value', 'Business Permit')
            ->update([
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
