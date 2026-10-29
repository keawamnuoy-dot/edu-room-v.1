<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

try {
    require __DIR__ . '/config.php';
    $config = databaseUrl();
    $db = database();
    $db->query($config['driver'] === 'pgsql' ? 'SELECT 1' : 'SELECT 1');
    echo json_encode([
        'status' => 'ok',
        'runtime' => 'php',
        'driver' => $config['driver'],
        'database' => 'connected',
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'runtime' => 'php',
        'database' => 'disconnected',
    ], JSON_UNESCAPED_UNICODE);
}
