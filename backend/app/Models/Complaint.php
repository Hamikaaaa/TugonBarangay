<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Complaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'category',
        'subject',
        'description',
        'incident_date',
        'incident_time',
        'location',
        'involved_persons',
        'relevant_information',
        'evidence_path',
        'resolution_images',
        'status',
        'priority',
        'staff_remarks',
        'resolution_details',
        'resolved_at',
        'status_updated_at',
    ];

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
            'resolved_at' => 'datetime',
            'status_updated_at' => 'datetime',
            'resolution_images' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(Resident::class, 'resident_id');
    }

    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'assigned_staff_id');
    }

    public function timelineEvents(): HasMany
    {
        return $this->hasMany(ComplaintTimelineEvent::class, 'complaint_id')->orderBy('created_at');
    }
}
