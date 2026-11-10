<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationVerification extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'channel',
        'destination',
        'registration_payload',
        'verification_code_hash',
        'verification_token_hash',
        'failed_attempts',
        'expires_at',
        'last_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'registration_payload' => 'encrypted:array',
            'expires_at' => 'datetime',
            'last_sent_at' => 'datetime',
        ];
    }
}
