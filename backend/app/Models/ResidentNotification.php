<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidentNotification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    protected $fillable = [
        'resident_id',
        'type',
        'title',
        'message',
        'read_at',
    ];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }
}
