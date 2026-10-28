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

        $requirements = json_decode($documentType->requirements ?? '[]', true) ?: [];
        $fields = json_decode($documentType->fields ?? '[]', true) ?: [];
        foreach ($requirements as &$requirement) {
            if (($requirement['key'] ?? null) === 'purok_certification') {
                $requirement['showWhen'] = [
                    'key' => 'application_type',
                    'value' => ['New', 'Renewal'],
                ];
                $requirement['requiredWhen'] = [
                    'key' => 'application_type',
                    'value' => ['New', 'Renewal'],
                ];
            } elseif (($requirement['key'] ?? null) === 'previous_business_clearance') {
                $requirement['showWhen'] = [
                    'key' => 'application_type',
                    'value' => 'Renewal',
                ];
                $requirement['requiredWhen'] = [
                    'key' => 'application_type',
                    'value' => 'Renewal',
                ];
            }
        }
        unset($requirement);
        if (!collect($fields)->contains('key', 'business_attestation_accepted')) {
            $fields[] = [
                'key' => 'business_attestation_accepted',
                'label' => 'Attestation acceptance',
                'type' => 'text',
                'required' => false,
                'residentVisible' => false,
                'group' => '2. Type, taxpayer, and business information',
            ];
        }

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'description' => 'For new applications, attach a Purok Certification, Cedula, applicant ID, DTI/SEC registration, and a picture of the business. For renewals, attach the previous Business Clearance and Purok Certification. If rented, attach the contract of lease.',
                'requirements' => json_encode($requirements),
                'fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Keep renewal document requirements in place when rolling back.
    }
};
