<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatbotMessage extends Model
{
    protected $fillable = [
        'resident_id',
        'faq_id',
        'question',
        'answer',
        'faq_category',
        'matched',
        'intent',
        'answered_at',
    ];

    protected function casts(): array
    {
        return [
            'matched' => 'boolean',
            'answered_at' => 'datetime',
        ];
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function faq(): BelongsTo
    {
        return $this->belongsTo(ChatbotFaq::class);
    }
}
