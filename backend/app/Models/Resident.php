<?php

namespace App\Models;

class Resident extends Account
{
    protected const ROLE = 'resident';

    protected $fillable = [
        'name',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'date_of_birth',
        'sex',
        'purok',
        'address',
        'mobile_number',
        'email',
        'password',
        'profile_photo',
        'verification_status',
        'rejection_reason',
    ];

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class);
    }

    public function complaints()
    {
        return $this->hasMany(Complaint::class);
    }

    public function feedback()
    {
        return $this->hasMany(Feedback::class);
    }

    public function residentNotifications()
    {
        return $this->hasMany(ResidentNotification::class);
    }
}
