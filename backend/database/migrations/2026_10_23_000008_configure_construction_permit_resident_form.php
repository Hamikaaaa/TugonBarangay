<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Construction Permit')
            ->update([
                'applicant_fields' => json_encode([
                    ['key' => 'full_name', 'label' => 'Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'address', 'label' => 'Address', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'contact_number', 'label' => 'Contact number', 'type' => 'tel', 'required' => true, 'section' => 'applicant'],
                    ['key' => 'email_address', 'label' => 'Email address', 'type' => 'email', 'required' => false, 'section' => 'applicant'],
                ]),
                'fields' => json_encode([
                    ['key' => 'project_owner_name', 'label' => 'Project owner', 'type' => 'text', 'required' => true, 'section' => 'details', 'group' => '2. Project information'],
                    ['key' => 'project_address', 'label' => 'Project address/location', 'type' => 'text', 'required' => true, 'section' => 'details', 'group' => '2. Project information'],
                    ['key' => 'construction_type', 'label' => 'Type of construction', 'type' => 'select', 'required' => true, 'options' => ['New Construction', 'Renovation/Repair', 'Extension/Addition', 'Demolition', 'Fencing', 'Other'], 'section' => 'details', 'group' => '2. Project information'],
                    ['key' => 'construction_type_other', 'label' => 'Specify other construction type', 'type' => 'text', 'required' => false, 'showWhen' => ['key' => 'construction_type', 'value' => 'Other'], 'requiredWhen' => ['key' => 'construction_type', 'value' => 'Other'], 'section' => 'details', 'group' => '2. Project information'],
                    ['key' => 'proposed_floor_area', 'label' => 'Proposed floor area (m², if applicable)', 'type' => 'number', 'required' => false, 'min' => 0, 'step' => 0.01, 'section' => 'details', 'group' => '2. Project information'],
                    ['key' => 'applicant_certification_accepted', 'label' => 'Applicant certification accepted', 'type' => 'text', 'required' => true, 'residentVisible' => false, 'section' => 'details', 'group' => '3. Applicant certification'],
                ]),
                'requirements' => json_encode([
                    ['key' => 'purok_certificate', 'label' => 'Purok Certificate', 'required' => true],
                ]),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Preserve submitted applications; the current resident form remains compatible.
    }
};
