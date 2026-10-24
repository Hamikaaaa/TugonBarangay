<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BarangayDocumentSetting extends Model
{
    protected $fillable = ['key', 'settings', 'template_path', 'template_name'];

    protected function casts(): array
    {
        return ['settings' => 'array'];
    }
}
