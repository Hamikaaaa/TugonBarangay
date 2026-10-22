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

        $fields = json_decode($type->applicant_fields ?: '[]', true) ?: [];
        $age = [
            'key' => 'age',
            'label' => 'Age',
            'type' => 'number',
            'required' => true,
            'min' => 0,
            'max' => 150,
            'readOnly' => true,
            'section' => 'applicant',
        ];
        $found = false;
        foreach ($fields as &$field) {
            if (($field['key'] ?? null) === 'age') {
                $field = array_merge($field, $age);
                $found = true;
                break;
            }
        }
        unset($field);
        if (!$found) {
            $fields[] = $age;
        }

        DB::table('document_types')
            ->where('id', $type->id)
            ->update([
                'applicant_fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        $type = DB::table('document_types')
            ->where('value', 'First-Time Jobseeker Certification')
            ->first();
        if (!$type) {
            return;
        }

        $fields = json_decode($type->applicant_fields ?: '[]', true) ?: [];
        $fields = array_values(array_filter(
            $fields,
            fn (array $field) => ($field['key'] ?? null) !== 'age',
        ));
        DB::table('document_types')
            ->where('id', $type->id)
            ->update(['applicant_fields' => json_encode($fields), 'updated_at' => now()]);
    }
};
