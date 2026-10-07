<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->updateDocumentAddressFields(false);
    }

    public function down(): void
    {
        $this->updateDocumentAddressFields(true);
    }

    private function updateDocumentAddressFields(bool $required): void
    {
        $documentTypes = DB::table('document_types')
            ->whereNotNull('value')
            ->get(['id', 'applicant_fields', 'fields']);

        foreach ($documentTypes as $documentType) {
            $applicantFields = $this->updateAddressField($documentType->applicant_fields, $required);
            $fields = $this->updateAddressField($documentType->fields, $required);

            if ($applicantFields !== $documentType->applicant_fields || $fields !== $documentType->fields) {
                DB::table('document_types')
                    ->where('id', $documentType->id)
                    ->update([
                        'applicant_fields' => $applicantFields,
                        'fields' => $fields,
                    ]);
            }
        }
    }

    private function updateAddressField(?string $json, bool $required): ?string
    {
        if ($json === null) {
            return null;
        }

        $fields = json_decode($json, true);
        if (!is_array($fields)) {
            return $json;
        }

        $changed = false;
        foreach ($fields as &$field) {
            if (($field['key'] ?? null) === 'address') {
                $field['required'] = $required;
                $changed = true;
            }
        }
        unset($field);

        return $changed ? json_encode($fields) : $json;
    }
};
