<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotFaq extends Model
{
    use HasFactory;

    protected $fillable = [
        'category',
        'question',
        'question_ceb',
        'answer',
        'answer_ceb',
        'keywords',
        'keywords_ceb',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'keywords_ceb' => 'array',
            'is_active' => 'boolean',
        ];
    }
}
