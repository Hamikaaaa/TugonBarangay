<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $type = DB::table('document_types')->where('value', 'Barangay Residency')->first();
        if (!$type) {
            return;
        }

        $existingFields = json_decode($type->fields ?: '[]', true) ?: [];
        $yearsField = collect($existingFields)->firstWhere('key', 'years_of_residency') ?? [
            'key' => 'years_of_residency',
            'label' => 'Length of residency (years)',
            'type' => 'number',
            'required' => true,
            'min' => 0,
            'max' => 150,
            'section' => 'details',
        ];
        $yearsField['enabled'] = true;
        $yearsField['required'] = true;
        $fields = [
            $yearsField,
            [
                'key' => 'purpose',
                'label' => 'Purpose of request',
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
                'requiredWhen' => ['key' => 'purpose', 'value' => 'Other'],
                'showWhen' => ['key' => 'purpose', 'value' => 'Other'],
                'submit' => false,
                'section' => 'details',
            ],
        ];

        $requirements = json_decode($type->requirements ?: '[]', true) ?: [];
        $requiredRequirementKeys = ['purok_certificate', 'valid_id'];
        $requirements = array_map(function (array $requirement) use ($requiredRequirementKeys) {
            if (in_array($requirement['key'] ?? null, $requiredRequirementKeys, true)) {
                $requirement['enabled'] = true;
                $requirement['required'] = true;
            }
            return $requirement;
        }, $requirements);
        $requirementKeys = array_column($requirements, 'key');
        foreach ([
            ['key' => 'purok_certificate', 'label' => 'Purok Certificate', 'required' => true],
            ['key' => 'valid_id', 'label' => 'Valid government-issued ID', 'required' => true],
        ] as $requirement) {
            if (!in_array($requirement['key'], $requirementKeys, true)) {
                $requirements[] = $requirement;
            }
        }

        DB::table('document_types')->where('id', $type->id)->update([
            'fields' => json_encode($fields),
            'requirements' => json_encode($requirements),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Keep the resident form purpose and required uploads in place on rollback.
    }
};
