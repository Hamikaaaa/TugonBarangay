<?php

namespace Tests\Feature;

use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_store_profile_photo_path(): void
    {
        $user = Resident::create([
            'name' => 'Jane Doe',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'date_of_birth' => '1999-05-10',
            'sex' => 'Female',
            'purok' => 'Purok 1',
            'email' => 'jane@example.com',
            'password' => 'password123',
            'profile_photo' => 'profile_photos/jane.png',
        ]);

        $this->assertSame('profile_photos/jane.png', $user->fresh()->profile_photo);
    }
}
