<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Construction Permit')
            ->update(['active' => true, 'enabled' => true]);

        $now = now();
        $types = [
            [
                'value' => 'Cedula',
                'label' => 'Cedula (Community Tax Certificate)',
                'fee_mode' => 'assessed',
                'fee' => 0,
                'one_time' => false,
                'applicant_fields' => [
                    ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'address', 'label' => 'Home address', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'date_of_birth', 'label' => 'Date of birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'civil_status', 'label' => 'Civil status', 'type' => 'select', 'required' => true, 'options' => ['Single', 'Married', 'Widowed', 'Separated'], 'section' => 'applicant'],
                    ['key' => 'citizenship', 'label' => 'Citizenship', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'occupation', 'label' => 'Occupation or profession', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'contact_number', 'label' => 'Contact number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                ],
                'fields' => [
                    ['key' => 'place_of_birth', 'label' => 'Place of birth', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'annual_income', 'label' => 'Estimated annual income (PHP)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'section' => 'details'],
                ],
                'requirements' => [
                    ['key' => 'valid_id', 'label' => 'Valid government-issued ID', 'required' => true],
                    ['key' => 'proof_of_address', 'label' => 'Proof of address', 'required' => false],
                    ['key' => 'proof_of_income', 'label' => 'Proof of income, if available', 'required' => false],
                ],
            ],
            [
                'value' => 'Fencing Permit',
                'label' => 'Fencing Permit',
                'fee_mode' => 'assessed',
                'fee' => 0,
                'one_time' => false,
                'applicant_fields' => [
                    ['key' => 'full_name', 'label' => 'Applicant name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'contact_number', 'label' => 'Contact number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'email_address', 'label' => 'Email address', 'type' => 'email', 'required' => true, 'section' => 'applicant'],
                ],
                'fields' => [
                    ['key' => 'property_owner_name', 'label' => "Property owner's name", 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'property_address', 'label' => 'Property address', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'property_purok', 'label' => 'Property Purok', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'property_ownership', 'label' => "Applicant's relationship to property", 'type' => 'select', 'required' => true, 'options' => ['Owner', 'Authorized Representative'], 'section' => 'details'],
                    ['key' => 'fence_material', 'label' => 'Fence material', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'fence_height', 'label' => 'Fence height (meters)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'section' => 'details'],
                    ['key' => 'fence_length', 'label' => 'Fence length (meters)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'section' => 'details'],
                    ['key' => 'proposed_construction_date', 'label' => 'Proposed construction date', 'type' => 'date', 'required' => true, 'section' => 'details'],
                    ['key' => 'project_description', 'label' => 'Additional project details', 'type' => 'textarea', 'required' => false, 'section' => 'details'],
                ],
                'requirements' => [
                    ['key' => 'valid_id', 'label' => 'Valid government-issued ID', 'required' => true],
                    ['key' => 'proof_of_ownership', 'label' => 'Proof of ownership', 'required' => false],
                    ['key' => 'lease_or_authorization', 'label' => 'Owner authorization or lease', 'required' => false, 'requiredWhen' => ['key' => 'property_ownership', 'value' => 'Authorized Representative']],
                    ['key' => 'site_plan', 'label' => 'Property sketch or site plan', 'required' => false],
                ],
            ],
        ];

        foreach ($types as $type) {
            DB::table('document_types')->updateOrInsert(
                ['value' => $type['value']],
                [
                    'name' => $type['label'],
                    'label' => $type['label'],
                    'description' => null,
                    'enabled' => true,
                    'active' => true,
                    'fee_mode' => $type['fee_mode'],
                    'fee' => $type['fee'],
                    'one_time' => $type['one_time'],
                    'processing_time' => '2 days',
                    'applicant_fields' => json_encode($type['applicant_fields']),
                    'fields' => json_encode($type['fields']),
                    'requirements' => json_encode($type['requirements']),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }
    }

    public function down(): void
    {
        DB::table('document_types')
            ->whereIn('value', ['Cedula', 'Fencing Permit', 'Construction Permit'])
            ->update(['active' => false, 'enabled' => false]);
    }
};
