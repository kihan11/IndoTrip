<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method !== 'POST') {
    json_error('Metode tidak diizinkan. Gunakan POST.', 405);
}


/** Baca body request (JSON atau form encoded). */
if (!function_exists('kontak_request_input')) {
    function kontak_request_input(): array
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

if (!function_exists('kontak_validate')) {
    function kontak_validate(array $input): array
    {
        $nama   = trim((string) ($input['nama'] ?? ''));
        $email  = trim((string) ($input['email'] ?? ''));
        $subjek = trim((string) ($input['subjek'] ?? ''));
        $pesan  = trim((string) ($input['pesan'] ?? ''));

        $errors = [];

        if ($nama === '') {
            $errors['nama'] = 'Nama lengkap wajib diisi.';
        } elseif (strlen($nama) < 2) {
            $errors['nama'] = 'Nama lengkap minimal 2 karakter.';
        } elseif (strlen($nama) > 150) {
            $errors['nama'] = 'Nama lengkap terlalu panjang (maksimal 150 karakter).';
        }

        if ($email === '') {
            $errors['email'] = 'Alamat email wajib diisi.';
        } elseif (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'Masukkan alamat email yang valid.';
        } elseif (strlen($email) > 191) {
            $errors['email'] = 'Alamat email terlalu panjang (maksimal 191 karakter).';
        }

        if ($subjek === '') {
            $errors['subjek'] = 'Subjek pesan wajib diisi.';
        } elseif (strlen($subjek) > 200) {
            $errors['subjek'] = 'Subjek pesan terlalu panjang (maksimal 200 karakter).';
        }

        if ($pesan === '') {
            $errors['pesan'] = 'Pesan wajib diisi.';
        } elseif (strlen($pesan) < 10) {
            $errors['pesan'] = 'Pesan minimal 10 karakter.';
        } elseif (strlen($pesan) > 5000) {
            $errors['pesan'] = 'Pesan terlalu panjang (maksimal 5000 karakter).';
        }

        return [
            [
                'nama'   => $nama,
                'email'  => $email,
                'subjek' => $subjek,
                'pesan'  => $pesan,
            ],
            $errors,
        ];
    }
}


[$data, $errors] = kontak_validate(kontak_request_input());

if ($errors !== []) {
    json_error('Mohon periksa kembali formulir Anda.', 422, $errors);
}

// NULL jika pengirim bukan member. user_id tidak dipercaya dari client.
$userId = (int) ($_SESSION['user_id'] ?? 0);
$userId = $userId > 0 ? $userId : null;

try {
    $stmt = $pdo->prepare(
        'INSERT INTO pesan_kontak (user_id, nama, email, subjek, pesan)
         VALUES (:user_id, :nama, :email, :subjek, :pesan)'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':nama'    => $data['nama'],
        ':email'   => $data['email'],
        ':subjek'  => $data['subjek'],
        ':pesan'   => $data['pesan'],
    ]);

    json_success(
        ['id' => (int) $pdo->lastInsertId()],
        'Pesan berhasil dikirim.',
        201
    );
} catch (PDOException $e) {
    error_log('[IndoTrip] Kontak POST error: ' . $e->getMessage());
    json_error('Gagal mengirim pesan. Silakan coba lagi nanti.', 500);
}
