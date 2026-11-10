<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetVerification extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'account_type',
        'account_id',
        'email',
        'code_hash',
        'reset_token_hash',
        'failed_attempts',
        'expires_at',
        'reset_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'reset_expires_at' => 'datetime',
        ];
    }
}
