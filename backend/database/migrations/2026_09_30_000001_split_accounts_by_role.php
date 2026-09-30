<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('suffix')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('sex')->nullable();
            $table->string('purok')->nullable();
            $table->string('address')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->string('profile_photo')->nullable();
            $table->string('verification_status')->default('verified');
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        foreach (['staff', 'admins'] as $tableName) {
            Schema::create($tableName, function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->string('profile_photo')->nullable();
                $table->timestamps();
            });
        }

        $accounts = DB::table('users')->orderBy('id')->get();
        foreach ($accounts as $account) {
            $tableName = match ($account->role) {
                'resident' => 'residents',
                'staff' => 'staff',
                'admin' => 'admins',
                default => throw new RuntimeException("Unsupported account role: {$account->role}"),
            };

            $attributes = [
                'id' => $account->id,
                'name' => $account->name,
                'email' => $account->email,
                'email_verified_at' => $account->email_verified_at,
                'password' => $account->password,
                'remember_token' => $account->remember_token,
                'profile_photo' => $account->profile_photo,
                'created_at' => $account->created_at,
                'updated_at' => $account->updated_at,
            ];

            if ($tableName === 'residents') {
                $attributes += [
                    'first_name' => $account->first_name,
                    'middle_name' => $account->middle_name,
                    'last_name' => $account->last_name,
                    'suffix' => $account->suffix,
                    'date_of_birth' => $account->date_of_birth,
                    'sex' => $account->sex,
                    'purok' => $account->purok,
                    'address' => $account->address,
                    'mobile_number' => $account->mobile_number,
                    'verification_status' => $account->verification_status,
                    'rejection_reason' => $account->rejection_reason,
                ];
            }

            DB::table($tableName)->insert($attributes);
            DB::table('personal_access_tokens')
                ->where('tokenable_type', 'App\\Models\\User')
                ->where('tokenable_id', $account->id)
                ->update(['tokenable_type' => match ($tableName) {
                    'residents' => App\Models\Resident::class,
                    'staff' => App\Models\Staff::class,
                    'admins' => App\Models\Admin::class,
                }]);
        }

        foreach (['document_requests', 'complaints', 'notifications', 'feedback'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropForeign(['user_id']);
                $indexColumn = match ($tableName) {
                    'document_requests', 'complaints' => 'status',
                    'notifications' => 'read_at',
                    'feedback' => 'service_type',
                };
                $table->dropIndex("{$tableName}_user_id_{$indexColumn}_index");
                $table->renameColumn('user_id', 'resident_id');
                $table->foreign('resident_id')->references('id')->on('residents')->cascadeOnDelete();
                $table->index(['resident_id', $indexColumn]);
            });
        }

        Schema::drop('users');
    }

    public function down(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('suffix')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('sex')->nullable();
            $table->string('purok')->nullable();
            $table->string('address')->nullable();
            $table->string('mobile_number')->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role')->default('resident');
            $table->rememberToken();
            $table->string('profile_photo')->nullable();
            $table->string('verification_status')->default('verified');
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        $idMap = [];
        $nextId = 1;
        foreach (
            [
                'residents' => 'resident',
                'staff' => 'staff',
                'admins' => 'admin',
            ] as $tableName => $role
        ) {
            foreach (DB::table($tableName)->orderBy('id')->get() as $account) {
                $newId = $nextId++;
                $idMap[$tableName][$account->id] = $newId;
                DB::table('users')->insert([
                    'id' => $newId,
                    'name' => $account->name,
                    'first_name' => $account->first_name ?? null,
                    'middle_name' => $account->middle_name ?? null,
                    'last_name' => $account->last_name ?? null,
                    'suffix' => $account->suffix ?? null,
                    'date_of_birth' => $account->date_of_birth ?? null,
                    'sex' => $account->sex ?? null,
                    'purok' => $account->purok ?? null,
                    'address' => $account->address ?? null,
                    'mobile_number' => $account->mobile_number ?? null,
                    'email' => $account->email,
                    'email_verified_at' => $account->email_verified_at,
                    'password' => $account->password,
                    'role' => $role,
                    'remember_token' => $account->remember_token,
                    'profile_photo' => $account->profile_photo,
                    'verification_status' => $account->verification_status ?? 'verified',
                    'rejection_reason' => $account->rejection_reason ?? null,
                    'created_at' => $account->created_at,
                    'updated_at' => $account->updated_at,
                ]);

                DB::table('personal_access_tokens')
                    ->where('tokenable_type', match ($tableName) {
                        'residents' => App\Models\Resident::class,
                        'staff' => App\Models\Staff::class,
                        'admins' => App\Models\Admin::class,
                    })
                    ->where('tokenable_id', $account->id)
                    ->update([
                        'tokenable_type' => 'App\\Models\\User',
                        'tokenable_id' => $newId,
                    ]);
            }
        }

        foreach (['document_requests', 'complaints', 'notifications', 'feedback'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropForeign(['resident_id']);
                $table->dropIndex("{$tableName}_resident_id_" . match ($tableName) {
                    'document_requests', 'complaints' => 'status',
                    'notifications' => 'read_at',
                    'feedback' => 'service_type',
                } . '_index');
                $table->renameColumn('resident_id', 'user_id');
            });

            foreach ($idMap['residents'] ?? [] as $oldId => $newId) {
                DB::table($tableName)->where('user_id', $oldId)->update(['user_id' => $newId]);
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $indexColumn = match ($tableName) {
                    'document_requests', 'complaints' => 'status',
                    'notifications' => 'read_at',
                    'feedback' => 'service_type',
                };
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->index(['user_id', $indexColumn]);
            });
        }

        Schema::drop('residents');
        Schema::drop('staff');
        Schema::drop('admins');
    }
};
