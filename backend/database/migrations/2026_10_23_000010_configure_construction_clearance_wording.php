<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const WORDING = "**TO WHOM IT MAY CONCERN:**\n\nThis is to certify that **{{full_name}}**, a resident of **{{address}}**, has requested a Barangay Clearance for the proposed construction of **{{type_of_structure}}** located at **{{project_address}}**, within the territorial jurisdiction of Barangay **{{barangay_name}}**.\n\nBased on the records of this Barangay and the information submitted by the applicant, the Barangay has no objection to the proposed construction activity, subject to compliance with applicable barangay ordinances and the necessary permits and clearances from the Municipal or City Government and other concerned authorities.\n\nThis clearance is issued upon the request of the applicant for **construction purposes** and does not constitute a Building Permit or authorize construction without the required approvals from the appropriate government agencies.\n\nIssued this {{issued_day}} of {{issued_month}}, {{issued_year}}, at Barangay {{barangay_name}}, {{municipality}}, Cebu, Philippines.";

    public function up(): void
    {
        $type = DB::table('document_types')->where('value', 'Construction Permit')->first();
        if (!$type) {
            return;
        }

        $fields = json_decode((string) $type->fields, true) ?: [];
        if (!collect($fields)->contains(fn (array $field) => ($field['key'] ?? null) === 'type_of_structure')) {
            $fields[] = [
                'key' => 'type_of_structure',
                'label' => 'Type of structure/building',
                'type' => 'text',
                'required' => true,
                'section' => 'details',
                'group' => '2. Project information',
            ];
        }

        $updates = ['fields' => json_encode($fields), 'updated_at' => now()];
        if (blank($type->template)) {
            $updates['template'] = self::WORDING;
        }

        DB::table('document_types')->where('id', $type->id)->update($updates);
    }

    public function down(): void
    {
        // Keep the wording and field for requests already submitted.
    }
};
