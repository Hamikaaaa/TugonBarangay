<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BarangayRegistry extends Model
{
    protected $table = 'barangay_registry';

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'date_of_birth',
        'sex',
        'purok',
        'address',
        'mobile_number',
    ];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date'];
    }
}
