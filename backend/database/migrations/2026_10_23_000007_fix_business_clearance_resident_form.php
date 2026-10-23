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

        $rented = ['key' => 'place_of_business', 'value' => 'Rented'];
        $newApplication = ['key' => 'application_type', 'value' => 'New'];
        $renewal = ['key' => 'application_type', 'value' => 'Renewal'];

        DB::table('document_types')->where('id', $documentType->id)->update([
            'label' => 'Business Clearance',
            'name' => 'Business Clearance',
            'description' => 'For new applications, attach a Purok Certification, Cedula, applicant ID, DTI/SEC registration, and a picture of the business. For renewals, attach the previous Business Clearance and Purok Certification. If rented, attach the contract of lease.',
            'applicant_fields' => json_encode([
                ['key' => 'full_name', 'label' => 'Name of taxpayer', 'type' => 'text', 'required' => false, 'residentVisible' => false, 'section' => 'applicant'],
                ['key' => 'last_name', 'label' => 'Last name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'first_name', 'label' => 'First name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'middle_name', 'label' => 'Middle name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'address', 'label' => "Complete owner's address", 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                ['key' => 'contact_number', 'label' => 'Contact number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
            ]),
            'fields' => json_encode([
                ['key' => 'application_type', 'label' => 'Application', 'type' => 'select', 'required' => true, 'options' => ['New', 'Renewal'], 'group' => '1. Application details'],
                ['key' => 'amendment_type', 'label' => 'Amendments (optional)', 'type' => 'select', 'required' => false, 'options' => ['None', 'From Single to Partnership', 'From Single to Corporation', 'From Partnership to Single', 'From Partnership to Corporation', 'From Corporation to Single', 'From Corporation to Partnership'], 'group' => '1. Application details'],
                ['key' => 'transfer_type', 'label' => 'Transfer', 'type' => 'select', 'required' => false, 'options' => ['None', 'Location', 'Ownership'], 'group' => '1. Application details'],
                ['key' => 'transfer_location_to', 'label' => 'Transfer location to', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'transfer_type', 'value' => 'Location'], 'requiredWhen' => ['key' => 'transfer_type', 'value' => 'Location'], 'group' => '1. Application details'],
                ['key' => 'transfer_owner_to', 'label' => 'Transfer ownership to (person / entity)', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'transfer_type', 'value' => 'Ownership'], 'requiredWhen' => ['key' => 'transfer_type', 'value' => 'Ownership'], 'group' => '1. Application details'],
                ['key' => 'business_ownership', 'label' => 'Type of business', 'type' => 'select', 'required' => true, 'options' => ['Sole Proprietorship', 'Partnership', 'Corporation', 'Cooperative'], 'group' => '2. Type, taxpayer, and business information'],
                ['key' => 'business_name', 'label' => 'Business name', 'type' => 'text', 'required' => true, 'group' => '2. Type, taxpayer, and business information'],
                ['key' => 'tradename_franchise_name', 'label' => 'Tradename / franchise name', 'type' => 'text', 'required' => false, 'group' => '2. Type, taxpayer, and business information'],
                ['key' => 'business_address', 'label' => 'Complete business address', 'type' => 'text', 'required' => true, 'group' => '2. Type, taxpayer, and business information'],
                ['key' => 'business_area_sqm', 'label' => 'Business area (sq. m.)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'group' => '2. Type, taxpayer, and business information'],
                ['key' => 'place_of_business', 'label' => 'Place of business', 'type' => 'select', 'required' => true, 'options' => ['Owned', 'Rented'], 'group' => '2. Type, taxpayer, and business information'],
                ['key' => 'monthly_rental', 'label' => 'Monthly rental (PHP)', 'type' => 'number', 'required' => false, 'min' => 0, 'step' => 0.01, 'showWhen' => $rented, 'requiredWhen' => $rented, 'group' => '2. Type, taxpayer, and business information'],
                ['key' => 'lessor_name', 'label' => "Lessor's name", 'type' => 'text', 'required' => false, 'showWhen' => $rented, 'requiredWhen' => $rented, 'group' => '2. Type, taxpayer, and business information'],
                ['key' => 'lessor_address', 'label' => "Lessor's address", 'type' => 'text', 'required' => false, 'showWhen' => $rented, 'requiredWhen' => $rented, 'group' => '2. Type, taxpayer, and business information'],
            ]),
            'requirements' => json_encode([
                ['key' => 'purok_certification', 'label' => 'Purok Certification', 'required' => false, 'showWhen' => ['key' => 'application_type', 'value' => ['New', 'Renewal']], 'requiredWhen' => ['key' => 'application_type', 'value' => ['New', 'Renewal']]],
                ['key' => 'cedula_copy', 'label' => 'Cedula (Community Tax Certificate)', 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
                ['key' => 'applicant_id', 'label' => "Applicant's ID", 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
                ['key' => 'dti_sec_registration', 'label' => 'DTI / SEC registration', 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
                ['key' => 'business_picture', 'label' => 'Picture of the business', 'required' => false, 'showWhen' => $newApplication, 'requiredWhen' => $newApplication],
                ['key' => 'previous_business_clearance', 'label' => 'Previous Business Clearance', 'required' => false, 'showWhen' => $renewal, 'requiredWhen' => $renewal],
                ['key' => 'lease_contract', 'label' => 'Contract of lease', 'required' => false, 'showWhen' => $rented, 'requiredWhen' => $rented],
            ]),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Keep the current Business Clearance form configuration on rollback.
    }
};
