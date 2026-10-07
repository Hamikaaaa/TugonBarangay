<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentRequest extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (DocumentRequest $documentRequest) {
            $documentRequest->status_changed_at ??= now();
        });
    }

    protected $fillable = [
        'resident_id',
        'assigned_staff_id',
        'document_type',
        'details',
        'status',
        'fee',
        'staff_remarks',
        'rejection_reason',
        'document_content',
        'document_generated_at',
        'released_at',
        'status_changed_at',
    ];

    protected $appends = ['document_type_label'];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'fee' => 'decimal:2',
            'document_content' => 'array',
            'document_generated_at' => 'datetime',
            'released_at' => 'datetime',
            'status_changed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class, 'resident_id');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'document_type', 'value');
    }

    public function assignedStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'assigned_staff_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(DocumentRequestEvent::class)->latest();
    }

    public function getDocumentTypeLabelAttribute(): string
    {
        $labels = [
            'Barangay Certification' => 'Barangay Clearance',
            'Barangay Residency' => 'Certificate of Residency',
            'Barangay Indigency' => 'Certificate of Indigency',
            'Business Permit' => 'Business Clearance',
            'First-Time Jobseeker Certification' => 'First-Time Job Seeker Certification',
        ];

        return $this->type?->label ?? $labels[$this->document_type] ?? $this->document_type;
    }
}
