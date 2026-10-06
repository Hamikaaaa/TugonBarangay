<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'resident_id',
        'document_type',
        'details',
        'status',
        'fee',
        'staff_remarks',
        'rejection_reason',
        'document_content',
        'document_generated_at',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'fee' => 'decimal:2',
            'document_content' => 'array',
            'document_generated_at' => 'datetime',
            'released_at' => 'datetime',
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
}
