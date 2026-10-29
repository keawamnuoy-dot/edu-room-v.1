<?php
declare(strict_types=1);

require __DIR__ . '/../api/config.php';

if (PHP_SAPI !== 'cli' || $argc !== 4) {
    fwrite(STDERR, "Usage: php tools\\create-account.php email name role\nRole: super_admin | admin | staff | user\n");
    exit(2);
}

[$script, $email, $name, $role] = $argv;
$email = strtolower(trim($email));
$name = trim($name);
$roles = ['super_admin', 'admin', 'staff', 'user'];
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !str_ends_with($email, '@crru.ac.th') || $name === '' || mb_strlen($name) > 100 || !in_array($role, $roles, true)) {
    fwrite(STDERR, "Invalid email, name, or role.\n");
    exit(2);
}

fwrite(STDOUT, 'Password (8-72 bytes): ');
$password = trim((string)fgets(STDIN));
if (strlen($password) < 8 || strlen($password) > 72) {
    fwrite(STDERR, "Password must be 8-72 bytes.\n");
    exit(2);
}

try {
    $statement = database()->prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)');
    $statement->execute([$email, $name, password_hash($password, PASSWORD_DEFAULT), $role]);
    fwrite(STDOUT, "Account created: {$email} ({$role})\n");
} catch (PDOException $error) {
    if ($error->getCode() === '23000') {
        fwrite(STDERR, "An account with that email already exists.\n");
        exit(1);
    }
    throw $error;
}
