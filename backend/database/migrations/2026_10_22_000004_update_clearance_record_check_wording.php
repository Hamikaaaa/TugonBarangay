<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const OLD_WORDING = "This is to certify that the applicant whose name, picture, signature and thumb marks appearing hereto has not been brought before the Lupon/Pangkat of this Barangay for any complaint against her, nor has committed any infraction of laws/ordinances as of this date, she is a law abiding citizen.\n\nNAME                 : {{full_name}}\nHOME ADDRESS         : {{address}}\nPLACE OF BIRTH       : {{place_of_birth}}\nDATE OF BIRTH        : {{date_of_birth}}\nREMARKS              : NO DEROGATORY RECORD\n\nPURPOSE              : {{purpose}}\n\n______________________________\nApplicant's Signature\n\nVALID FOR            : Six (6) Months\n\nRes. Cert. No.        : ____________________\nIssued at             : CONSOLACION, CEBU\n\nLeft Thumb Mark                       Right Thumb Mark\n\nHON. ANTONIETTO S. PEPITO\nPunong Barangay\n\nPaid Under\nO.R. No.              : ____________________\nAmount Paid           : ₱75.00\nDoc. Stamp            : ₱30.00";

    private const NEW_WORDING = "This is to certify that the applicant whose name, picture, signature and thumb marks appearing hereto has not been brought before the Lupon/Pangkat of this Barangay for any complaint against {{object_pronoun}}, nor has committed any infraction of laws/ordinances as of this date, {{subject_pronoun}} {{subject_verb}} a law abiding citizen.\n\nNAME                 : {{full_name}}\nHOME ADDRESS         : {{address}}\nPLACE OF BIRTH       : {{place_of_birth}}\nDATE OF BIRTH        : {{date_of_birth}}\nREMARKS              : {{derogatory_remarks}}\n\nPURPOSE              : {{purpose}}\n\n______________________________\nApplicant's Signature\n\nVALID FOR            : Six (6) Months\n\nRes. Cert. No.        : ____________________\nIssued at             : CONSOLACION, CEBU\n\nLeft Thumb Mark                       Right Thumb Mark\n    \nHON. FE Q. CUYOS\nPunong Barangay\n\nPaid Under\nO.R. No.              : ____________________\nAmount Paid           : ₱75.00\nDoc. Stamp            : ₱30.00";

    public function up(): void
    {
        DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->where('template', self::OLD_WORDING)
            ->update(['template' => self::NEW_WORDING, 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('document_types')
            ->where('value', 'Barangay Certification')
            ->where('template', self::NEW_WORDING)
            ->update(['template' => self::OLD_WORDING, 'updated_at' => now()]);
    }
};
