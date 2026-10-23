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

        $removedKeys = [
            'applicant_is_owner',
            'authorized_person_name',
            'authorization_letter',
            'authorized_person_id',
            'business_owner_id',
        ];
        $applicantFields = json_decode($documentType->applicant_fields ?? '[]', true) ?: [];
        $fields = json_decode($documentType->fields ?? '[]', true) ?: [];
        $requirements = json_decode($documentType->requirements ?? '[]', true) ?: [];

        $applicantFields = array_values(array_filter(
            $applicantFields,
            fn (array $field) => !in_array($field['key'] ?? null, $removedKeys, true),
        ));
        $fields = array_map(static function (array $field): array {
            if (($field['key'] ?? null) === 'taxpayer_signature_name') {
                $field['label'] = 'Taxpayer name';
            }

            return $field;
        }, $fields);
        $requirements = array_values(array_filter(
            $requirements,
            fn (array $requirement) => !in_array($requirement['key'] ?? null, $removedKeys, true),
        ));

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'description' => 'New applications require a Purok Certification, Cedula, applicant ID, DTI/SEC registration, and business photo. If rented, attach the contract of lease. Renewals require the previous Business Clearance.',
                'applicant_fields' => json_encode($applicantFields),
                'fields' => json_encode($fields),
                'requirements' => json_encode($requirements),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Removed authorization fields are not restored to avoid reintroducing
        // requirements that applicants have been told are no longer needed.
    }
};
