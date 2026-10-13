<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    protected $hidden = [
        'uploaded_template_path',
    ];

    protected $fillable = [
        'name',
        'enabled',
        'value',
        'label',
        'fee_mode',
        'fee',
        'one_time',
        'active',
        'applicant_fields',
        'fields',
        'requirements',
        'template',
        'uploaded_template_path',
        'uploaded_template_name',
        'template_enabled',
    ];

    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'one_time' => 'boolean',
            'active' => 'boolean',
            'applicant_fields' => 'array',
            'fields' => 'array',
            'requirements' => 'array',
            'template_enabled' => 'boolean',
        ];
    }
}
