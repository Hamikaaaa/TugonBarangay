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

        $fields = json_decode($type->fields ?: '[]', true) ?: [];
        $fields = array_values(array_filter(
            $fields,
            fn (array $field) => ($field['key'] ?? null) !== 'pronoun',
        ));

        DB::table('document_types')
            ->where('id', $type->id)
            ->update([
                'fields' => json_encode($fields),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // The certificate uses the resident's registered sex; no extra pronoun field is needed.
    }
};
