<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Schema;

class ComplaintTimelineEvent extends Model
{
    protected $fillable = [
        'complaint_id',
        'actor_id',
        'actor_name',
        'actor_role',
        'action',
        'metadata',
    ];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }

    public static function record(Complaint $complaint, ?Account $actor, string $action, array $metadata = []): self
    {
        if (!Schema::hasTable('complaint_timeline_events')) {
            return new self();
        }

        return self::create([
            'complaint_id' => $complaint->id,
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'System',
            'actor_role' => $actor?->role ?? 'system',
            'action' => $action,
            'metadata' => $metadata ?: null,
        ]);
    }

    public function complaint(): BelongsTo
    {
        return $this->belongsTo(Complaint::class);
    }
}
