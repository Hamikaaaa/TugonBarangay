<?php

namespace App\Models;

class Staff extends Account
{
    protected $table = 'staff';

    protected $fillable = ['name', 'email', 'password', 'profile_photo', 'designation', 'is_active'];

    protected const ROLE = 'staff';

    public const DOCUMENT_REQUEST_OFFICER = 'Document Request Officer';

    public const COMPLAINT_MANAGEMENT_OFFICER = 'Complaint Management Officer';

    protected function casts(): array
    {
        return [...parent::casts(), 'is_active' => 'boolean'];
    }
}
