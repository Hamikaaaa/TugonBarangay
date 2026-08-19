<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'staff@tugonbarangay.test'],
            [
                'name' => 'Test Staff',
                'password' => 'password123',
                'role' => 'staff',
            ]
        );

        User::updateOrCreate(
            ['email' => 'admin@tugonbarangay.test'],
            [
                'name' => 'Test Admin',
                'password' => 'password123',
                'role' => 'admin',
            ]
        );
    }
}
