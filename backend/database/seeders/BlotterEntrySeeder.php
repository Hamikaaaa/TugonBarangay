<?php

namespace Database\Seeders;

use App\Models\BlotterEntry;
use App\Models\Resident;
use Illuminate\Database\Seeder;

class BlotterEntrySeeder extends Seeder
{
    public function run(): void
    {
        $entries = [
            [
                'resident_name' => 'Juan Dela Cruz',
                'incident_type' => 'Verbal Abuse / Oral Defamation',
                'incident_date' => '2026-09-18',
                'incident_time' => '20:15',
                'location' => 'Purok 3 basketball court',
                'narrative' => 'Complainant reported an oral defamation incident involving shouting and threatening remarks during a neighborhood basketball game.',
                'status' => 'resolved',
                'remarks' => 'Both parties mediated and agreed to settle amicably.',
            ],
            [
                'resident_name' => 'Maria Santos',
                'incident_type' => 'Noise Disturbance',
                'incident_date' => '2026-10-02',
                'incident_time' => '23:40',
                'location' => 'Purok 1, Block 4',
                'narrative' => 'Loud videoke session past curfew hours disrupted nearby households. Barangay responded with a warning notice.',
                'status' => 'open',
                'remarks' => null,
            ],
            [
                'resident_name' => 'Pedro Reyes',
                'incident_type' => 'Property Damage',
                'incident_date' => '2026-10-09',
                'incident_time' => '16:05',
                'location' => 'Purok 5, Sari-sari store',
                'narrative' => 'Damaged store glass panel reported during a loud argument between store owners and an unidentified customer.',
                'status' => 'referred',
                'remarks' => 'Referred to the Philippine National Police for further investigation.',
            ],
            [
                'resident_name' => 'Ana Villanueva',
                'incident_type' => 'Physical Injury',
                'incident_date' => '2026-10-14',
                'incident_time' => '07:30',
                'location' => 'Purok 2, Covered court',
                'narrative' => 'Minor injury reported after an accidental fall during a morning sports activity. First aid administered on site.',
                'status' => 'resolved',
                'remarks' => 'Both parties confirmed the matter was settled without further action.',
            ],
            [
                'resident_name' => 'Carlo Mendoza',
                'incident_type' => 'Trespassing',
                'incident_date' => '2026-10-18',
                'incident_time' => '21:10',
                'location' => 'Purok 6, Vacant lot',
                'narrative' => 'Repeated entry into a private vacant lot was reported. Owner requested barangay assistance to prevent further incursions.',
                'status' => 'open',
                'remarks' => null,
            ],
            [
                'resident_name' => 'Liza Bautista',
                'incident_type' => 'Domestic Dispute',
                'incident_date' => '2026-10-20',
                'incident_time' => '14:25',
                'location' => 'Purok 4, Barangay hall',
                'narrative' => 'Household dispute was brought to the barangay for mediation. Both parties agreed to a written compromise.',
                'status' => 'resolved',
                'remarks' => 'Compromise agreement signed and notarized by both parties.',
            ],
        ];

        foreach ($entries as $entry) {
            $resident = Resident::query()->where('name', $entry['resident_name'])->first();

            BlotterEntry::updateOrCreate(
                [
                    'resident_id' => $resident?->id,
                    'resident_name' => $entry['resident_name'],
                    'incident_date' => $entry['incident_date'],
                    'incident_type' => $entry['incident_type'],
                ],
                [
                    'incident_time' => $entry['incident_time'],
                    'location' => $entry['location'],
                    'narrative' => $entry['narrative'],
                    'status' => $entry['status'],
                    'remarks' => $entry['remarks'],
                ],
            );
        }
    }
}
