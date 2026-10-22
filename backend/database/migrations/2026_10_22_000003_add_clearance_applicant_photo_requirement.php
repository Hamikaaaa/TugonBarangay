<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->first();

        if (!$documentType) {
            return;
        }

        $requirements = json_decode($documentType->requirements, true) ?: [];
        if (collect($requirements)->contains('key', 'applicant_photo')) {
            return;
        }

        $requirements[] = [
            'key' => 'applicant_photo',
            'label' => 'Applicant Photo (JPG or PNG, up to 5 MB)',
            'required' => true,
        ];

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'requirements' => json_encode($requirements),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        $documentType = DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->first();

        if (!$documentType) {
            return;
        }

        $requirements = json_decode($documentType->requirements, true) ?: [];
        $requirements = array_values(array_filter(
            $requirements,
            fn (array $requirement) => ($requirement['key'] ?? null) !== 'applicant_photo',
        ));

        DB::table('document_types')
            ->where('id', $documentType->id)
            ->update([
                'requirements' => json_encode($requirements),
                'updated_at' => now(),
            ]);
    }
};
