<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $applicantFields = [
            ['key' => 'full_name', 'label' => 'Applicant name', 'type' => 'text', 'required' => true, 'readOnly' => true, 'section' => 'applicant'],
            ['key' => 'address', 'label' => 'Applicant address', 'type' => 'text', 'required' => true, 'readOnly' => true, 'section' => 'applicant'],
            ['key' => 'contact_number', 'label' => 'Contact number', 'type' => 'tel', 'required' => true, 'readOnly' => true, 'section' => 'applicant'],
            ['key' => 'email_address', 'label' => 'Email address', 'type' => 'email', 'required' => false, 'readOnly' => true, 'section' => 'applicant'],
        ];

        $projectFields = [
            ['key' => 'project_owner_name', 'label' => 'Project owner', 'type' => 'text', 'required' => true, 'section' => 'details', 'group' => 'Project information'],
            ['key' => 'project_address', 'label' => 'Project address/location', 'type' => 'text', 'required' => true, 'section' => 'details', 'group' => 'Project information'],
            ['key' => 'construction_type', 'label' => 'Type of construction', 'type' => 'select', 'required' => true, 'options' => ['New Construction', 'Renovation/Repair', 'Extension/Addition', 'Demolition', 'Fencing', 'Other'], 'section' => 'details', 'group' => 'Project information'],
            ['key' => 'proposed_floor_area', 'label' => 'Proposed floor area (m?, if applicable)', 'type' => 'number', 'required' => false, 'min' => 0, 'step' => 0.01, 'section' => 'details', 'group' => 'Project information'],
        ];

        $fencingFields = [
            ['key' => 'project_owner_name', 'label' => 'Project owner', 'type' => 'text', 'required' => true, 'section' => 'details', 'group' => 'Project information'],
            ['key' => 'project_address', 'label' => 'Project address/location', 'type' => 'text', 'required' => true, 'section' => 'details', 'group' => 'Project information'],
            ['key' => 'construction_type', 'label' => 'Type of construction', 'type' => 'text', 'required' => true, 'readOnly' => true, 'section' => 'details', 'group' => 'Project information'],
            ['key' => 'fence_material', 'label' => 'Fence material', 'type' => 'text', 'required' => true, 'section' => 'details', 'group' => 'Fence details'],
            ['key' => 'fence_height', 'label' => 'Fence height (meters)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'section' => 'details', 'group' => 'Fence details'],
            ['key' => 'fence_length', 'label' => 'Fence length (meters)', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 0.01, 'section' => 'details', 'group' => 'Fence details'],
        ];

        $requirements = [
            ['key' => 'valid_id', 'label' => 'Valid government-issued ID', 'required' => true],
            ['key' => 'proof_of_ownership', 'label' => 'Proof of ownership (if available)', 'required' => false],
            ['key' => 'lease_or_authorization', 'label' => 'Owner authorization (if applying for someone else)', 'required' => false],
            ['key' => 'site_plan', 'label' => 'Property sketch or site plan (if available)', 'required' => false],
        ];

        $types = [
            'Construction Permit' => ['fields' => $projectFields, 'requirements' => $requirements],
            'Fencing Permit' => ['fields' => $fencingFields, 'requirements' => $requirements],
        ];

        foreach ($types as $value => $config) {
            DB::table('document_types')->where('value', $value)->update([
                'applicant_fields' => json_encode($applicantFields),
                'fields' => json_encode($config['fields']),
                'requirements' => json_encode($config['requirements']),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        // Permit requests already submitted with the previous fields remain valid.
    }
};
