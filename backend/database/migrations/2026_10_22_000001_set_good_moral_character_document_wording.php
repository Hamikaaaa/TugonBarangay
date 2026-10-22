<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const WORDING = "TO WHOM IT MAY CONCERN:\n\nThis is to certify that {{full_name}}, of legal age, a resident of {{purok}}, Barangay Tayud, Municipality of Consolacion, Province of Cebu, Philippines, has been known to this office and is, to the best of our knowledge and based on available barangay records, a person of good moral character and reputation in the community.\n\nThis certification is issued upon the request of the above-named person for {{purpose}} and for whatever lawful purpose it may serve.\n\nIssued this {{issued_day}} day of {{issued_month}}, {{issued_year}}, at Barangay Tayud, Municipality of Consolacion, Cebu, Philippines.\nRespectfully yours,\n\n[NAME OF PUNONG BARANGAY]\nPunong Barangay";

    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Certificate of Good Moral Character')
            ->where(fn ($query) => $query->whereNull('template')->orWhere('template', ''))
            ->update([
                'template' => self::WORDING,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('document_types')
            ->where('value', 'Certificate of Good Moral Character')
            ->where('template', self::WORDING)
            ->update([
                'template' => null,
                'updated_at' => now(),
            ]);
    }
};
