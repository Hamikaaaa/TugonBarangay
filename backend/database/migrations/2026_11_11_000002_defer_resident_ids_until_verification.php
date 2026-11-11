<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('barangay_registry')->update(['resident_id' => null]);
        DB::table('residents')->update(['resident_id' => null]);

        DB::table('residents')
            ->where('verification_status', 'verified')
            ->orderBy('id')
            ->get()
            ->each(function (object $resident): void {
                $residentId = $this->generateResidentId();

                DB::table('residents')
                    ->where('id', $resident->id)
                    ->update(['resident_id' => $residentId]);

                $registryRecord = DB::table('barangay_registry')
                    ->where('first_name', $resident->first_name)
                    ->where('last_name', $resident->last_name)
                    ->whereDate('date_of_birth', $resident->date_of_birth)
                    ->where('sex', $resident->sex)
                    ->where('purok', $resident->purok)
                    ->first();

                if ($registryRecord && ! $registryRecord->resident_id) {
                    DB::table('barangay_registry')
                        ->where('id', $registryRecord->id)
                        ->update(['resident_id' => $residentId]);
                }
            });
    }

    public function down(): void
    {
        DB::table('barangay_registry')
            ->orderBy('id')
            ->get()
            ->each(function (object $record): void {
                DB::table('barangay_registry')
                    ->where('id', $record->id)
                    ->update(['resident_id' => 'TBR-'.str_pad((string) $record->id, 6, '0', STR_PAD_LEFT)]);
            });

        $assignedResidentIds = [];
        DB::table('residents')
            ->orderBy('id')
            ->get()
            ->each(function (object $resident) use (&$assignedResidentIds): void {
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

    private function generateResidentId(): string
    {
        do {
            $residentId = (string) random_int(100000, 999999);
        } while (
            DB::table('residents')->where('resident_id', $residentId)->exists()
            || DB::table('barangay_registry')->where('resident_id', $residentId)->exists()
        );

        return $residentId;
    }
};
