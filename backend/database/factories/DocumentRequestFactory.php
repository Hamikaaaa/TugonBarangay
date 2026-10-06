<?php

namespace Database\Factories;

use App\Models\DocumentRequest;
use App\Models\Resident;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentRequestFactory extends Factory
{
    protected $model = DocumentRequest::class;

    public function definition(): array
    {
        return [
            'resident_id' => Resident::factory(),
            'document_type' => 'Barangay Certification',
            'details' => [
                'notes' => 'Test request',
                'form_fields' => [],
                'requirements' => [],
            ],
            'status' => 'pending',
            'fee' => 0,
            'staff_remarks' => null,
            'rejection_reason' => null,
            'released_at' => null,
        ];
    }
}
