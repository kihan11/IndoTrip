<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';


/** Baca body request (JSON atau form encoded). */
if (!function_exists('auth_request_input')) {
    function auth_request_input(): array
    {
        static $input = null;
        if ($input !== null) {
            return $input;
        }

        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
        if (strpos($contentType, 'application/json') !== false) {
            $raw     = file_get_contents('php://input');
            $decoded = json_decode($raw === false ? '' : $raw, true);
            $input   = is_array($decoded) ? $decoded : [];
        } else {
            $input = $_POST;
        }

        return $input;
    }
}

/** Format baris users menjadi bentuk yang dipakai js/auth.js. */
if (!function_exists('auth_user_payload')) {
    function auth_user_payload(array $row): array
    {
        return [
            'id'    => (int) $row['id'],
            'name'  => (string) $row['nama'],
            'email' => (string) $row['email'],
            'phone' => $row['telepon'] ?? null,
            'city'  => $row['domisili'] ?? null,
            'role'  => $row['role'] ?? 'user',
        ];
    }
}

/** Ambil user berdasarkan id (prepared statement). */
if (!function_exists('auth_find_user')) {
    function auth_find_user(PDO $pdo, int $id): array|false
    {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }
}

/** Id web user yang sedang login (dari user_auth), atau 0. */
if (!function_exists('auth_current_user_id')) {
    function auth_current_user_id(): int
    {
        $auth = getUserSession();
        return $auth === null ? 0 : (int) $auth['id'];
    }
}

/** Tulis sesi web user — tidak menyentuh admin_auth. */
if (!function_exists('auth_set_user_session')) {
    function auth_set_user_session(int $id): void
    {
        $_SESSION['user_auth'] = [
            'id'   => $id,
            'role' => 'user',
        ];
    }
}

/** Tulis sesi panel admin — tidak menyentuh user_auth. */
if (!function_exists('auth_set_admin_session')) {
    function auth_set_admin_session(int $id): void
    {
        $_SESSION['admin_auth'] = [
            'id'   => $id,
            'role' => 'admin',
        ];
    }
}


$input  = auth_request_input();
$action = trim((string) ($_GET['action'] ?? ($input['action'] ?? '')));
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

$actions = [
    'register', 'login', 'logout', 'me', 'update_profile',
    'admin_login', 'admin_me', 'admin_logout',
];

if ($action === '') {
    json_error('Action tidak ditentukan.', 400);
}
if (!in_array($action, $actions, true)) {
    json_error('Action tidak dikenal.', 400);
}
if (
    $method !== 'POST' &&
    !($method === 'GET' && in_array($action, ['me', 'admin_me'], true))
) {
    json_error('Metode tidak diizinkan. Gunakan POST.', 405);
}


try {
    switch ($action) {

        case 'register':
            $nama     = trim((string) ($input['name'] ?? $input['nama'] ?? ''));
            $email    = trim((string) ($input['email'] ?? ''));
            $password = (string) ($input['password'] ?? '');

            if (strlen($nama) < 2) {
                json_error('Nama lengkap minimal 2 karakter.', 422);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                json_error('Format email tidak valid. Contoh: nama@email.com', 422);
            }
            if (strlen($password) < 8) {
                json_error('Password minimal 8 karakter.', 422);
            }

            $email = strtolower($email);

            $stmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
            $stmt->execute([':email' => $email]);
            if ($stmt->fetch()) {
                json_error('Email sudah terdaftar. Silakan masuk.', 409);
            }

            $hash = password_hash($password, PASSWORD_DEFAULT, ['cost' => 12]);
            if ($hash === false) {
                json_error('Gagal mengamankan password. Silakan coba lagi.', 500);
            }

            $stmt = $pdo->prepare(
                'INSERT INTO users (nama, email, password) VALUES (:nama, :email, :password)'
            );
            $stmt->execute([
                ':nama'     => $nama,
                ':email'    => $email,
                ':password' => $hash,
            ]);

            $newId = (int) $pdo->lastInsertId();

            /* Sesuai alur lama: setelah daftar langsung masuk ke profil. */
            session_regenerate_id(true);
            auth_set_user_session($newId);

            $row = auth_find_user($pdo, $newId);
            json_success(auth_user_payload($row), 'Akun berhasil dibuat.', 201);

        case 'login':
            $email    = strtolower(trim((string) ($input['email'] ?? '')));
            $password = (string) ($input['password'] ?? '');

            if ($email === '' || $password === '') {
                json_error('Lengkapi email dan password terlebih dahulu.', 422);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                json_error('Format email tidak valid. Contoh: nama@email.com', 422);
            }

            $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
            $stmt->execute([':email' => $email]);
            $row = $stmt->fetch();

            if (!$row || !password_verify($password, (string) $row['password'])) {
                json_error('Email atau password salah. Coba lagi.', 401);
            }

            /* Gerbang user: akun admin wajib masuk lewat halaman login admin. */
            $role = strtolower(trim((string) ($row['role'] ?? '')));
            if ($role !== '' && $role !== 'user') {
                json_error('Akun admin harus masuk melalui halaman login admin.', 403);
            }

            session_regenerate_id(true);
            auth_set_user_session((int) $row['id']);

            json_success(auth_user_payload($row), 'Berhasil masuk.');

        case 'admin_login':
            $email    = strtolower(trim((string) ($input['email'] ?? '')));
            $password = (string) ($input['password'] ?? '');

            if ($email === '' || $password === '') {
                json_error('Lengkapi email dan password admin terlebih dahulu.', 422);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                json_error('Format email tidak valid. Contoh: nama@email.com', 422);
            }

            $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
            $stmt->execute([':email' => $email]);
            $row = $stmt->fetch();

            if (!$row || !password_verify($password, (string) $row['password'])) {
                json_error('Email atau password admin salah. Coba lagi.', 401);
            }

            /* Gerbang admin: kredensial benar pun ditolak bila bukan admin. */
            if (strtolower(trim((string) ($row['role'] ?? ''))) !== 'admin') {
                json_error('Akun ini tidak memiliki akses admin', 403);
            }

            session_regenerate_id(true);
            auth_set_admin_session((int) $row['id']);

            json_success(auth_user_payload($row), 'Berhasil masuk sebagai admin.');

        case 'logout':

            unset($_SESSION['user_auth']);

            json_success(null, 'Berhasil keluar.');

        case 'me':
            $user   = requireUser();
            $userId = (int) $user['id'];

            $row = auth_find_user($pdo, $userId);
            if (!$row) {
                unset($_SESSION['user_auth']);
                json_error('Akun tidak ditemukan. Silakan masuk lagi.', 401);
            }

            json_success(auth_user_payload($row), 'Data pengguna berhasil dimuat.');

        case 'admin_me':
            $admin = getAdminSession();
            if ($admin === null) {
                json_error('Anda belum login sebagai admin.', 401);
            }

            $row = auth_find_user($pdo, (int) $admin['id']);
            if (!$row) {
                unset($_SESSION['admin_auth']);
                json_error('Akun admin tidak ditemukan. Silakan masuk lagi.', 401);
            }
            if (strtolower(trim((string) ($row['role'] ?? ''))) !== 'admin') {
                unset($_SESSION['admin_auth']);
                json_error('Akun ini tidak memiliki akses admin.', 403);
            }

            json_success(auth_user_payload($row), 'Data admin berhasil dimuat.');

        case 'admin_logout':
            /* Cukup hapus namespace admin; sesi web user tidak disentuh. */
            unset($_SESSION['admin_auth']);

            json_success(null, 'Berhasil keluar.');

        case 'update_profile':
            $user   = requireUser();
            $userId = (int) $user['id'];

            $nama  = trim((string) ($input['name'] ?? $input['nama'] ?? ''));
            $email = trim((string) ($input['email'] ?? ''));
            $phone = trim((string) ($input['phone'] ?? $input['telepon'] ?? ''));
            $city  = trim((string) ($input['city'] ?? $input['domisili'] ?? ''));

            if (strlen($nama) < 2) {
                json_error('Nama lengkap minimal 2 karakter.', 422);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                json_error('Format email tidak valid. Contoh: nama@email.com', 422);
            }

            $email = strtolower($email);

            $stmt = $pdo->prepare(
                'SELECT id FROM users WHERE LOWER(email) = LOWER(:email) AND id <> :id LIMIT 1'
            );
            $stmt->execute([':email' => $email, ':id' => $userId]);
            if ($stmt->fetch()) {
                json_error('Email sudah digunakan akun lain.', 409);
            }

            $stmt = $pdo->prepare(
                'UPDATE users
                    SET nama = :nama,
                        email = :email,
                        telepon = :telepon,
                        domisili = :domisili
                  WHERE id = :id'
            );
            $stmt->execute([
                ':nama'     => $nama,
                ':email'    => $email,
                ':telepon'  => $phone  === '' ? null : $phone,
                ':domisili' => $city   === '' ? null : $city,
                ':id'       => $userId,
            ]);

            $row = auth_find_user($pdo, $userId);
            json_success(auth_user_payload($row), 'Profil berhasil diperbarui.');
    }
} catch (PDOException $e) {
    error_log('[IndoTrip] Auth DB error: ' . $e->getMessage());
    json_error('Terjadi kesalahan pada server. Silakan coba lagi nanti.', 500);
}

json_error('Action tidak dikenal.', 400);
