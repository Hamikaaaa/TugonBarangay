<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Staff;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Staff::updateOrCreate(
            ['email' => 'staff@tugonbarangay.test'],
            [
                'name' => 'Test Staff',
                'password' => 'password123',
            ]
        );

        Admin::updateOrCreate(
            ['email' => 'admin@tugonbarangay.test'],
            [
                'name' => 'Test Admin',
                'password' => 'password123',
            ]
        );

        $this->call(ChatbotFaqSeeder::class);
    }
}
