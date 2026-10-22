<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $type = DB::table('document_types')
            ->where('value', 'First-Time Jobseeker Certification')
            ->first();
        if (!$type) {
            return;
        }

        $applicantFields = json_decode($type->applicant_fields ?: '[]', true) ?: [];
        $fields = json_decode($type->fields ?: '[]', true) ?: [];
        $allFields = collect($applicantFields)->merge($fields)->keyBy('key');
        $makeField = static function (string $key, string $label, string $type, array $defaults) use ($allFields): array {
            $configured = $allFields->get($key, []);
            return array_merge($configured, $defaults, [
                'key' => $key,
                'label' => $configured['label'] ?? $label,
                'type' => $type,
            ]);
        };

        DB::table('document_types')
            ->where('id', $type->id)
            ->update([
                'applicant_fields' => json_encode([
                    $makeField('full_name', 'Full Name', 'text', ['required' => true, 'section' => 'applicant', 'enabled' => true]),
                    $makeField('purok', 'Purok', 'text', ['required' => true, 'section' => 'applicant', 'enabled' => true]),
                    $makeField('age', 'Age', 'number', ['required' => true, 'min' => 0, 'max' => 150, 'readOnly' => true, 'section' => 'applicant', 'enabled' => true]),
                ]),
                'fields' => json_encode([
                    $makeField('years_of_residency', 'Years of residency', 'number', ['required' => true, 'min' => 0, 'max' => 150, 'step' => 1, 'section' => 'details', 'enabled' => true]),
                ]),
                'one_time' => true,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Restore the preceding one-time jobseeker form without changing its submitted requests.
    }
};
