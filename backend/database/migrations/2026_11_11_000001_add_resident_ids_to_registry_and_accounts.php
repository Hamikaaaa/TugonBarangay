<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('barangay_registry', function (Blueprint $table) {
            $table->string('resident_id')->nullable()->unique();
        });

        Schema::table('residents', function (Blueprint $table) {
            $table->string('resident_id')->nullable()->unique();
        });

        DB::table('barangay_registry')
            ->orderBy('id')
            ->get()
            ->each(function (object $record) {
                DB::table('barangay_registry')
                    ->where('id', $record->id)
                    ->update(['resident_id' => 'TBR-'.str_pad((string) $record->id, 6, '0', STR_PAD_LEFT)]);
            });

        $assignedResidentIds = [];

        DB::table('residents')
            ->orderBy('id')
            ->get()
            ->each(function (object $resident) use (&$assignedResidentIds) {
                $registryRecord = DB::table('barangay_registry')
                    ->where('first_name', $resident->first_name)
                    ->where('last_name', $resident->last_name)
                    ->whereDate('date_of_birth', $resident->date_of_birth)
                    ->where('sex', $resident->sex)
                    ->where('purok', $resident->purok)
                    ->first();

                $residentId = $registryRecord
                    && ! in_array($registryRecord->resident_id, $assignedResidentIds, true)
                    ? $registryRecord->resident_id
                    : 'TBA-'.str_pad((string) $resident->id, 6, '0', STR_PAD_LEFT);

                $assignedResidentIds[] = $residentId;

                DB::table('residents')
                    ->where('id', $resident->id)
                    ->update(['resident_id' => $residentId]);
            });
    }

    public function down(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->dropUnique(['resident_id']);
            $table->dropColumn('resident_id');
        });

        Schema::table('barangay_registry', function (Blueprint $table) {
            $table->dropUnique(['resident_id']);
            $table->dropColumn('resident_id');
        });
    }
};
