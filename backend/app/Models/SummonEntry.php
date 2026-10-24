<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SummonEntry extends Model
{
    protected $fillable = [
        'barangay_name', 'municipality', 'province', 'complainant', 'respondent',
        'reference_no', 'nature_of_dispute', 'respondent_address', 'hearing_date',
        'hearing_time', 'venue', 'issued_by', 'document_settings', 'recorded_by',
        'complainant_attended', 'respondent_attended', 'status',
        'template_path', 'template_name',
    ];

    protected function casts(): array
    {
        return [
            'hearing_date' => 'date',
            'document_settings' => 'array',
            'complainant_attended' => 'boolean',
            'respondent_attended' => 'boolean',
        ];
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'recorded_by');
    }
}
