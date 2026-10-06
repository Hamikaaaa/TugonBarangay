<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComplaintCategory extends Model
{
    protected $fillable = [
        'name',
        'description',
        'enabled',
    ];
}