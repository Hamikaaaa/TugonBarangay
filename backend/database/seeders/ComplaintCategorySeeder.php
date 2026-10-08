<?php

namespace Database\Seeders;

use App\Models\ComplaintCategory;
use Illuminate\Database\Seeder;

class ComplaintCategorySeeder extends Seeder
{
    private const CATEGORIES = [
        'Noise and Disturbance',
        'Neighbor Dispute',
        'Property Disputes',
        'Public Nuisance',
        'Environmental Concern',
        'Animal Related Concern',
        'Peace and Order',
        'Road and Public',
        'Facility Concern',
        'Illegal or Unauthorized Activity',
        'Other Barangay Concern',
    ];

    public function run(): void
    {
        foreach (self::CATEGORIES as $name) {
            ComplaintCategory::firstOrCreate(
                ['name' => $name],
                ['enabled' => true],
            );
        }
    }
}