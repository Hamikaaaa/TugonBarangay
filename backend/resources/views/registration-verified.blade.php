<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $success ? 'Email verified' : 'Verification link expired' }} | TugonBarangay</title>
</head>
<body style="margin:0;background:#f4f7fb;color:#142a46;font-family:Arial,sans-serif">
    <main style="box-sizing:border-box;max-width:560px;margin:12vh auto;padding:40px 32px;background:#fff;border-radius:16px;text-align:center;box-shadow:0 12px 40px rgba(7,27,61,.12)">
        <h1 style="margin-top:0">{{ $success ? 'Email verified!' : 'Verification link expired' }}</h1>
        <p style="line-height:1.6">
            {{ $success
                ? 'Your registration is complete and your account is now pending barangay verification.'
                : 'This verification link is invalid or has expired. Please start registration again.' }}
        </p>
        <a href="{{ $loginUrl }}" style="display:inline-block;margin-top:16px;padding:12px 24px;border-radius:8px;background:#2455d6;color:#fff;text-decoration:none;font-weight:bold">
            {{ $success ? 'Go to login' : 'Register again' }}
        </a>
    </main>
</body>
</html>
