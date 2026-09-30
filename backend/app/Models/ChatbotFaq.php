<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotFaq extends Model
{
    use HasFactory;

    protected $fillable = ['category', 'question', 'answer', 'keywords', 'is_active'];

    protected function casts(): array
    {
        return ['keywords' => 'array', 'is_active' => 'boolean'];
    }
}
