<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$u = new App\Models\User;
var_export($u->getFillable());
echo PHP_EOL;
$contents = file_get_contents('app/Models/User.php');
if (str_contains($contents, "'profile_photo'")) { echo "HAS_PROFILE_PHOTO\n"; } else { echo "MISSING_PROFILE_PHOTO\n"; }
if (str_contains($contents, "'photo'")) { echo "HAS_PHOTO\n"; } else { echo "MISSING_PHOTO\n"; }
