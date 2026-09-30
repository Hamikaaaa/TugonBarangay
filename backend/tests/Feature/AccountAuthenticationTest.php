<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Resident;
use App\Models\Staff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AccountAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('accountTypes')]
    public function test_each_account_type_can_log_in_and_authenticate_its_token(string $modelClass, string $role): void
    {
        $account = $modelClass === Resident::class
            ? Resident::factory()->create(['password' => 'Password123!'])
            : $modelClass::create([
                'name' => "Test {$role}",
                'email' => "{$role}@example.com",
                'password' => 'Password123!',
            ]);

        $login = $this->postJson('/api/login', [
            'email' => $account->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('user.role', $role);

        $this->withToken($login->json('token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('role', $role);
    }

    public static function accountTypes(): array
    {
        return [
            'resident' => [Resident::class, 'resident'],
            'staff' => [Staff::class, 'staff'],
            'admin' => [Admin::class, 'admin'],
        ];
    }
}
