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
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'fee' => 'decimal:2',
            'released_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }
}
