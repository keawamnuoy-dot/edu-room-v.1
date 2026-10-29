<?php
declare(strict_types=1);

function databaseUrl(): array
{
    $url = getenv('DATABASE_URL') ?: getenv('DB_URL') ?: '';
    if ($url !== '') {
        $parts = parse_url($url);
        if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
            throw new RuntimeException('DATABASE_URL is invalid');
        }
        $scheme = strtolower($parts['scheme']);
        $driver = in_array($scheme, ['postgres', 'postgresql'], true) ? 'pgsql' : 'mysql';
        $database = ltrim((string)($parts['path'] ?? ''), '/');
        parse_str((string)($parts['query'] ?? ''), $query);
        return [
            'driver' => $driver,
            'host' => rawurldecode((string)$parts['host']),
            'port' => (int)($parts['port'] ?? ($driver === 'pgsql' ? 5432 : 3306)),
            'database' => rawurldecode($database),
            'user' => rawurldecode((string)($parts['user'] ?? '')),
            'password' => rawurldecode((string)($parts['pass'] ?? '')),
            'sslmode' => (string)($query['sslmode'] ?? (getenv('DB_SSLMODE') ?: ($driver === 'pgsql' ? 'require' : ''))),
        ];
    }

    $driver = strtolower((string)(getenv('DB_DRIVER') ?: 'mysql'));
    $driver = $driver === 'postgresql' || $driver === 'postgres' ? 'pgsql' : 'mysql';
    return [
        'driver' => $driver,
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => (int)(getenv('DB_PORT') ?: ($driver === 'pgsql' ? 5432 : 3306)),
        'database' => getenv('DB_NAME') ?: 'bookking_name',
        'user' => getenv('DB_USER') ?: ($driver === 'pgsql' ? 'postgres' : 'root'),
        'password' => getenv('DB_PASSWORD') ?: '',
        'sslmode' => getenv('DB_SSLMODE') ?: ($driver === 'pgsql' ? 'require' : ''),
    ];
}

function databaseDriver(): string
{
    return databaseUrl()['driver'];
}

function database(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = databaseUrl();
    if ($config['driver'] === 'pgsql') {
        $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['database']}";
        if ($config['sslmode'] !== '') {
            $dsn .= ';sslmode=' . $config['sslmode'];
        }
    } else {
        $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['database']};charset=utf8mb4";
    }

    $pdo = new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}
