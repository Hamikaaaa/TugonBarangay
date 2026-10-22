<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\Resident;
use App\Support\ResidentIdentityKey;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('first_time_jobseeker_availments', function (Blueprint $table) {
            $table->char('identity_hash', 64)->primary();
            $table->unsignedBigInteger('document_request_id')->nullable()->index();
            $table->timestamp('claimed_at');
        });

        $requests = DB::table('document_requests as requests')
            ->join('residents', 'residents.id', '=', 'requests.resident_id')
            ->where('requests.document_type', 'First-Time Jobseeker Certification')
            ->where('requests.status', '!=', 'rejected')
            ->select([
                'requests.id as request_id',
                'requests.created_at',
                'residents.first_name',
                'residents.middle_name',
                'residents.last_name',
                'residents.suffix',
                'residents.name',
                'residents.date_of_birth',
                'residents.sex',
                'residents.purok',
            ])
            ->orderBy('requests.id')
            ->get();

        foreach ($requests as $request) {
            $resident = new Resident();
            $resident->setRawAttributes([
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'suffix' => $request->suffix,
                'name' => $request->name,
                'date_of_birth' => $request->date_of_birth,
                'sex' => $request->sex,
                'purok' => $request->purok,
            ]);
            $identityHash = ResidentIdentityKey::make($resident);
            if (!$identityHash) {
                continue;
            }

            DB::table('first_time_jobseeker_availments')->insertOrIgnore([
                'identity_hash' => $identityHash,
                'document_request_id' => $request->request_id,
                'claimed_at' => $request->created_at ?: now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('first_time_jobseeker_availments');
    }
};
