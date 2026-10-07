<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_types', function (Blueprint $table) {
            $table->string('value')->nullable()->unique();
            $table->string('label')->nullable();
            $table->string('fee_mode')->default('fixed');
            $table->boolean('one_time')->default(false);
            $table->boolean('active')->default(true);
            $table->json('applicant_fields')->nullable();
            $table->json('fields')->nullable();
            $table->json('requirements')->nullable();
        });

        $now = now();
        $commonPersonalFields = [
            ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
            ['key' => 'address', 'label' => 'House/Building No., Street, and Subdivision', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
            ['key' => 'date_of_birth', 'label' => 'Date of Birth', 'type' => 'date', 'required' => true, 'section' => 'applicant'],
            ['key' => 'age', 'label' => 'Age', 'type' => 'number', 'required' => true, 'readOnly' => true, 'section' => 'applicant'],
            ['key' => 'sex', 'label' => 'Sex', 'type' => 'select', 'required' => true, 'options' => ['Female', 'Male', 'Other'], 'section' => 'applicant'],
            ['key' => 'citizenship', 'label' => 'Citizenship', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
            ['key' => 'civil_status', 'label' => 'Civil Status', 'type' => 'select', 'required' => true, 'options' => ['Single', 'Married', 'Widowed', 'Separated', 'Other'], 'section' => 'applicant'],
            ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
        ];
        $purposeOptions = ['Employment', 'School enrollment or scholarship', 'Business or business permit', 'Travel', 'Bank or loan application', 'Other'];
        $purposeField = ['key' => 'purpose', 'label' => 'Purpose of request', 'type' => 'select', 'required' => true, 'options' => $purposeOptions, 'section' => 'details'];
        $purposeOtherField = [
            'key' => 'purpose_other',
            'label' => 'Please specify your purpose',
            'type' => 'text',
            'required' => true,
            'requiredWhen' => ['key' => 'purpose', 'value' => 'Other'],
            'section' => 'details',
        ];
        $residencyApplicantFields = array_values(array_filter(
            $commonPersonalFields,
            fn (array $field) => $field['key'] !== 'citizenship',
        ));
        $requirements = [
            ['key' => 'purok_certificate', 'label' => 'Purok Certificate', 'required' => true],
            ['key' => 'valid_id', 'label' => 'Valid government-issued ID', 'required' => true],
        ];
        $records = [
            [
                'value' => 'Construction Permit',
                'label' => 'Construction Permit',
                'fee_mode' => 'fixed',
                'fee' => 0,
                'one_time' => false,
                'applicant_fields' => [
                    ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'contact_number', 'label' => 'Contact Number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'email_address', 'label' => 'Email Address', 'type' => 'email', 'required' => true, 'section' => 'applicant'],
                ],
                'fields' => [
                    ['key' => 'valid_id_type', 'label' => 'Valid ID type', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'valid_id_number', 'label' => 'Valid ID number', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'property_owner_name', 'label' => "Property owner's name", 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'property_street_number', 'label' => 'Property street/house number', 'type' => 'text', 'required' => false, 'section' => 'details'],
                    ['key' => 'property_purok', 'label' => 'Property Purok', 'type' => 'text', 'required' => true, 'section' => 'details'],
                    ['key' => 'lot_number', 'label' => 'Lot number', 'type' => 'text', 'required' => false, 'section' => 'details'],
                    ['key' => 'tax_declaration_number', 'label' => 'Tax Declaration number', 'type' => 'text', 'required' => false, 'section' => 'details'],
                    ['key' => 'title_number', 'label' => 'TCT/OCT number', 'type' => 'text', 'required' => false, 'section' => 'details'],
                    ['key' => 'property_ownership', 'label' => "Applicant's relationship to property", 'type' => 'select', 'required' => true, 'options' => ['Owner', 'Authorized Representative'], 'section' => 'details'],
                    ['key' => 'construction_type', 'label' => 'Type of construction', 'type' => 'select', 'required' => true, 'options' => ['New construction', 'Renovation', 'Repair', 'Extension', 'Fencing'], 'section' => 'details'],
                    ['key' => 'structure_type', 'label' => 'Type of structure', 'type' => 'select', 'required' => true, 'options' => ['Residential', 'Commercial', 'Other'], 'section' => 'details'],
                    ['key' => 'structure_details', 'label' => 'Specify structure', 'type' => 'text', 'required' => true, 'requiredWhen' => ['key' => 'structure_type', 'value' => 'Other'], 'showWhen' => ['key' => 'structure_type', 'value' => 'Other'], 'section' => 'details'],
                    ['key' => 'number_of_floors', 'label' => 'Number of floors', 'type' => 'number', 'required' => true, 'min' => 1, 'section' => 'details'],
                    ['key' => 'estimated_project_cost', 'label' => 'Estimated project cost (PHP)', 'type' => 'number', 'required' => true, 'min' => 0, 'section' => 'details'],
                    ['key' => 'proposed_construction_date', 'label' => 'Proposed construction date', 'type' => 'date', 'required' => true, 'section' => 'details'],
                    ['key' => 'project_description', 'label' => 'Brief construction description', 'type' => 'textarea', 'required' => true, 'section' => 'details'],
                ],
                'requirements' => [
                    ['key' => 'valid_id', 'label' => 'Valid ID', 'required' => true],
                    ['key' => 'proof_of_ownership', 'label' => 'Proof of ownership', 'required' => false],
                    ['key' => 'title_or_tax_declaration', 'label' => 'TCT/OCT or Tax Declaration', 'required' => false],
                    ['key' => 'lease_or_authorization', 'label' => 'Lease or owner authorization', 'required' => false, 'requiredWhen' => ['key' => 'property_ownership', 'value' => 'Authorized Representative']],
                    ['key' => 'architectural_plans', 'label' => 'Building/architectural plans', 'required' => false],
                    ['key' => 'structural_plans', 'label' => 'Structural plans', 'required' => false],
                    ['key' => 'electrical_plans', 'label' => 'Electrical plans', 'required' => false],
                    ['key' => 'plumbing_plans', 'label' => 'Plumbing/sanitary plans', 'required' => false],
                    ['key' => 'other_plans', 'label' => 'Other plans required by the Building Official', 'required' => false],
                ],
            ],
            [
                'value' => 'Barangay Certification',
                'label' => 'Barangay Clearance',
                'fee_mode' => 'fixed',
                'fee' => 80,
                'one_time' => false,
                'applicant_fields' => $commonPersonalFields,
                'fields' => [$purposeField, $purposeOtherField],
                'requirements' => $requirements,
            ],
            [
                'value' => 'Barangay Certificate',
                'label' => 'Barangay Certificate',
                'fee_mode' => 'fixed',
                'fee' => 80,
                'one_time' => false,
                'applicant_fields' => $commonPersonalFields,
                'fields' => [$purposeField, $purposeOtherField],
                'requirements' => $requirements,
            ],
            [
                'value' => 'Barangay Residency',
                'label' => 'Certificate of Residency',
                'fee_mode' => 'fixed',
                'fee' => 130,
                'one_time' => false,
                'applicant_fields' => $residencyApplicantFields,
                'fields' => [
                    ['key' => 'years_of_residency', 'label' => 'Length of residency (years)', 'type' => 'number', 'required' => true, 'min' => 0, 'max' => 150, 'section' => 'details'],
                    ['key' => 'months_of_residency', 'label' => 'Additional months of residency', 'type' => 'number', 'required' => false, 'min' => 0, 'max' => 11, 'section' => 'details'],
                    $purposeField,
                    $purposeOtherField,
                ],
                'requirements' => $requirements,
            ],
            [
                'value' => 'Barangay Indigency',
                'label' => 'Certificate of Indigency',
                'fee_mode' => 'fixed',
                'fee' => 0,
                'one_time' => false,
                'applicant_fields' => $commonPersonalFields,
                'fields' => [[
                    'key' => 'purpose',
                    'label' => 'Purpose of request',
                    'type' => 'select',
                    'required' => true,
                    'options' => ['Medical Assistance', 'Educational Assistance', 'Financial Assistance', 'Scholarship', 'Legal Assistance', 'Social Welfare Assistance', 'Other'],
                    'section' => 'details',
                ], $purposeOtherField],
                'requirements' => $requirements,
            ],
            [
                'value' => 'Business Permit',
                'label' => 'Business Clearance',
                'fee_mode' => 'assessed',
                'fee' => 0,
                'one_time' => false,
                'applicant_fields' => [
                    ['key' => 'contact_number', 'label' => 'Contact Number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'address', 'label' => 'Applicant Address', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
                    ['key' => 'sex', 'label' => 'Sex', 'type' => 'select', 'required' => true, 'options' => ['Female', 'Male', 'Other'], 'section' => 'applicant'],
                    ['key' => 'business_name', 'label' => 'Business Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'business_address', 'label' => 'Business Address', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'occupation', 'label' => 'Occupation', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'income', 'label' => 'Income (PHP)', 'type' => 'number', 'required' => true, 'min' => 0, 'section' => 'applicant'],
                ],
                'fields' => [],
                'requirements' => $requirements,
            ],
            [
                'value' => 'Certificate of Good Moral Character',
                'label' => 'Certificate of Good Moral Character',
                'fee_mode' => 'fixed',
                'fee' => 0,
                'one_time' => false,
                'applicant_fields' => $commonPersonalFields,
                'fields' => [$purposeField, $purposeOtherField],
                'requirements' => $requirements,
            ],
            [
                'value' => 'First-Time Jobseeker Certification',
                'label' => 'First-Time Job Seeker Certification',
                'fee_mode' => 'fixed',
                'fee' => 0,
                'one_time' => true,
                'applicant_fields' => $commonPersonalFields,
                'fields' => [$purposeField, $purposeOtherField],
                'requirements' => $requirements,
            ],
        ];

        foreach ($records as &$record) {
            $record['applicant_fields'] = json_encode($record['applicant_fields']);
            $record['fields'] = json_encode($record['fields']);
            $record['requirements'] = json_encode($record['requirements']);
            $record['name'] = $record['label'];
            $record['enabled'] = $record['active'] ?? true;
            $record['description'] = null;
            $record['processing_time'] = '2 days';
            $record['created_at'] = $now;
            $record['updated_at'] = $now;
        }
        unset($record);
        DB::table('document_types')->insert($records);
    }

    public function down(): void
    {
        Schema::table('document_types', function (Blueprint $table) {
            $table->dropUnique(['value']);
            $table->dropColumn([
                'value',
                'label',
                'fee_mode',
                'one_time',
                'active',
                'applicant_fields',
                'fields',
                'requirements',
            ]);
        });
    }
};
