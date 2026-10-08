<?php

namespace Database\Seeders;

use App\Models\Resident;
use Illuminate\Database\Seeder;

class ResidentSeeder extends Seeder
{
    public function run(): void
    {
        Resident::updateOrCreate(
            ['email' => 'resident@tugonbarangay.test'],
            [
                'name' => 'Resident User',
                'first_name' => 'Resident',
                'last_name' => 'User',
                'date_of_birth' => '1995-01-15',
                'sex' => 'Female',
                'purok' => 'Purok 1',
                'address' => 'Barangay Poblacion',
                'mobile_number' => '09171234567',
                'password' => 'password123',
                'verification_status' => 'verified',
            ]
        );
    }
}