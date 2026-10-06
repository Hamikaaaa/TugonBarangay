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
            ['email' => 'document-staff@tugonbarangay.test'],
            [
                'name' => 'Document Request Officer',
                'designation' => Staff::DOCUMENT_REQUEST_OFFICER,
                'password' => 'password123',
            ]
        );

        Staff::updateOrCreate(
            ['email' => 'complaint-staff@tugonbarangay.test'],
            [
                'name' => 'Complaint Management Officer',
                'designation' => Staff::COMPLAINT_MANAGEMENT_OFFICER,
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
