<?php

declare(strict_types=1);


if (session_status() === PHP_SESSION_NONE) {

    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'domain'   => '',
            'secure'   => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } else {
        session_set_cookie_params(0, '/');
    }
    session_start();
}

if (!isset($_SESSION['user_auth']) || !is_array($_SESSION['user_auth'])) {
    $_SESSION['user_auth'] = [];
}
if (!isset($_SESSION['admin_auth']) || !is_array($_SESSION['admin_auth'])) {
    $_SESSION['admin_auth'] = [];
}


if (!function_exists('getUserSession')) {
    /** Sesi web user, atau null bila belum login sebagai user. */
    function getUserSession(): ?array
    {
        $auth = $_SESSION['user_auth'] ?? null;
        if (!is_array($auth)) {
            return null;
        }
        if ((int) ($auth['id'] ?? 0) <= 0 || (string) ($auth['role'] ?? '') !== 'user') {
            return null;
        }
        return $auth;
    }
}

if (!function_exists('requireUser')) {
    /** Ambil sesi web user atau hentikan request dengan HTTP 401. */
    function requireUser(): array
    {
        $auth = getUserSession();
        if ($auth === null) {
            json_error('Anda belum login. Silakan masuk terlebih dahulu.', 401);
        }
        return $auth;
    }
}

if (!function_exists('getAdminSession')) {
    /** Sesi panel admin, atau null bila belum login sebagai admin. */
    function getAdminSession(): ?array
    {
        $auth = $_SESSION['admin_auth'] ?? null;
        if (!is_array($auth)) {
            return null;
        }
        if ((int) ($auth['id'] ?? 0) <= 0 || (string) ($auth['role'] ?? '') !== 'admin') {
            return null;
        }
        return $auth;
    }
}

if (!function_exists('requireAdmin')) {
    /** Ambil sesi admin atau hentikan request (401 belum login / 403 bukan admin). */
    function requireAdmin(): array
    {
        $auth = $_SESSION['admin_auth'] ?? null;
        if (!is_array($auth) || (int) ($auth['id'] ?? 0) <= 0) {
            json_error('Anda belum login. Silakan masuk terlebih dahulu.', 401);
        }
        if ((string) ($auth['role'] ?? '') !== 'admin') {
            json_error('Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.', 403);
        }
        return $auth;
    }
}


if (!function_exists('json_response')) {

    function json_response(mixed $data, int $statusCode = 200): never
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');

        echo json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
        );
        exit;
    }
}

if (!function_exists('json_success')) {
    /** Response sukses: {"success": true, "data": ...} */
    function json_success(mixed $data = null, string $message = 'OK', int $statusCode = 200): never
    {
        json_response([
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ], $statusCode);
    }
}

if (!function_exists('json_error')) {
    /** Response gagal: {"success": false, "error": ...} */
    function json_error(string $message = 'Terjadi kesalahan.', int $statusCode = 400, mixed $detail = null): never
    {
        $payload = [
            'success' => false,
            'error'   => $message,
        ];

        if ($detail !== null) {
            $payload['detail'] = $detail;
        }

        json_response($payload, $statusCode);
    }
}


$dbHost    = getenv('DB_HOST') ?: 'localhost';
$dbPort    = getenv('DB_PORT') ?: '3306';
$dbName    = getenv('DB_NAME') ?: 'indotrip';
$dbUser    = getenv('DB_USER') ?: 'root';
$dbPass    = getenv('DB_PASS');
$dbPass    = ($dbPass === false) ? '' : $dbPass;
$dbCharset = 'utf8mb4';

$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=%s',
    $dbHost,
    $dbPort,
    $dbName,
    $dbCharset
);

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::ATTR_STRINGIFY_FETCHES  => false,
];

try {
    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);
} catch (PDOException $e) {
    // Jangan tampilkan detail koneksi (user/password) ke klien.
    error_log('[IndoTrip] Koneksi database gagal: ' . $e->getMessage());
    json_error('Koneksi database gagal. Silakan coba lagi nanti.', 500);
}

/** Alias singkat jika suatu file ingin memakai $db alih-alih $pdo. */
$db = $pdo;
