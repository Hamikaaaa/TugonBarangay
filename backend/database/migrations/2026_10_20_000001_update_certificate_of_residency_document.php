<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const WORDING = "To whom it may concern:\n\nThis is to certify that based on Record of Barangay Inhabitants (RBI), {{full_name}} is a bonafide resident of Purok {{purok}}, Barangay Tayud, Municipality of Consolacion and Province of Cebu, for {{years_of_residency}} years.\n\nThis certification is issued upon the request of the abovementioned name.\n\n\tIssued this {{issued_day}} of {{issued_month}} {{issued_year}} at the Office of the Punong Barangay, Barangay Tayud, Municipality of Consolacion, Province of Cebu, Philippines.";
    private const PREVIOUS_DEFAULT_WORDING = "To whom it may concern:\n\nThis is to certify that {{full_name}}, a resident of Purok {{purok}}, Barangay Tayud, Municipality of Consolacion, Province of Cebu, has been residing in this barangay for {{years_of_residency}} years.\n\nThis certification is issued upon the request of the above-named person for {{purpose}} and for whatever legal purpose it may serve.\n\nIssued and given this {{issued_day}} day of {{issued_month}}, {{issued_year}}, at Barangay Tayud, Consolacion, Cebu, Philippines.";

    public function up(): void
    {
        $type = DB::table('document_types')->where('value', 'Barangay Residency')->first();
        if (!$type) {
            return;
        }

        $applicantFields = [
            ['key' => 'first_name', 'label' => 'First Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
            ['key' => 'last_name', 'label' => 'Last Name', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
            ['key' => 'middle_name', 'label' => 'Middle Name', 'type' => 'text', 'required' => false, 'section' => 'applicant'],
            ['key' => 'purok', 'label' => 'Purok', 'type' => 'text', 'required' => true, 'section' => 'applicant'],
        ];

        $fields = json_decode($type->fields ?: '[]', true) ?: [];
        $fields = array_values(array_filter(
            $fields,
            fn (array $field) => !in_array($field['key'] ?? null, ['months_of_residency', 'purpose', 'purpose_other'], true),
        ));

        $updates = [
            'applicant_fields' => json_encode($applicantFields),
            'fields' => json_encode($fields),
            'updated_at' => now(),
        ];
        if (!trim((string) ($type->template ?? '')) || trim((string) $type->template) === self::PREVIOUS_DEFAULT_WORDING) {
            $updates['template'] = self::WORDING;
        }

        DB::table('document_types')->where('id', $type->id)->update($updates);
    }

    public function down(): void
    {
        // Keep the configured wording and reduced form if this migration is rolled back.
    }
};
