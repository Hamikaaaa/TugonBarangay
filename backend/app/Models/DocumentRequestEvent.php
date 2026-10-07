<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentRequestEvent extends Model
{
    protected $fillable = [
        'document_request_id',
        'actor_id',
        'actor_name',
        'actor_role',
        'action',
        'from_status',
        'to_status',
        'metadata',
    ];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }

    public static function record(
        DocumentRequest $documentRequest,
        ?Account $actor,
        string $action,
        ?string $fromStatus = null,
        ?string $toStatus = null,
        array $metadata = [],
    ): self {
        return self::create([
            'document_request_id' => $documentRequest->id,
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name ?? 'System',
            'actor_role' => $actor?->role ?? 'system',
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'metadata' => $metadata ?: null,
        ]);
    }

    public function documentRequest(): BelongsTo
    {
        return $this->belongsTo(DocumentRequest::class);
    }
}
