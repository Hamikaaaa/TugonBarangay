<?php

namespace App\Support;

use App\Models\Resident;
use App\Models\BarangayRegistry;
use Illuminate\Support\Str;

class ResidentIdentityKey
{
    public static function make(Resident $resident): ?string
    {
        $dateOfBirth = trim((string) $resident->date_of_birth);
        $firstName = trim((string) $resident->first_name);
        $lastName = trim((string) $resident->last_name);
        $name = $firstName !== '' && $lastName !== ''
            ? $firstName.' '.$lastName
            : (string) $resident->name;

        if (blank($dateOfBirth) || blank($name)) {
            return null;
        }

        if ($firstName !== '' && $lastName !== '') {
            $registryRecord = BarangayRegistry::query()
                ->where('first_name', $firstName)
                ->where('last_name', $lastName)
                ->whereDate('date_of_birth', substr($dateOfBirth, 0, 10))
                ->where('sex', $resident->sex)
                ->where('purok', $resident->purok)
                ->orderBy('id')
                ->first();
            if ($registryRecord) {
                return hash('sha256', 'registry:'.$registryRecord->id);
            }
        }

        $normalizedName = Str::ascii(mb_strtolower(trim($name)));
        $normalizedName = preg_replace('/[^a-z0-9]+/i', ' ', $normalizedName);
        $normalizedName = preg_replace('/\s+/', ' ', trim($normalizedName));

        if (blank($normalizedName)) {
            return null;
        }

        return hash('sha256', substr($dateOfBirth, 0, 10).'|'.$normalizedName);
    }
}
