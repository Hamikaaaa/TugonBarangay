<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlotterEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'resident_name',
        'complainant_name',
        'incident_type',
        'incident_date',
        'incident_time',
        'location',
        'narrative',
        'status',
        'remarks',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
        ];
    }

    protected $appends = ['reference_code'];

    public function getReferenceCodeAttribute(): string
    {
        return 'BLT-'.str_pad((string) $this->id, 5, '0', STR_PAD_LEFT);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class, 'resident_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'recorded_by');
    }
}
