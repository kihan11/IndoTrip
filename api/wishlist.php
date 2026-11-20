<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method !== 'GET' && $method !== 'POST') {
    json_error('Metode tidak diizinkan. Gunakan GET atau POST.', 405);
}

/* Sesi user (user_auth) -> 401 otomatis bila belum login. */
$user   = requireUser();
$userId = (int) $user['id'];


/** Baca body request (JSON atau form encoded). */
if (!function_exists('wishlist_request_input')) {
    function wishlist_request_input(): array
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

/** Normalisasi baris hasil query ke bentuk yang dipakai js/auth.js. */
if (!function_exists('wishlist_format_row')) {
    function wishlist_format_row(array $row): array
    {
        return [
            'wishlist_id' => (int) $row['wishlist_id'],
            'jenis'       => (string) $row['jenis'],
            'item_id'     => (string) $row['item_id'],
            'id'          => (string) $row['item_id'], // alias untuk helper lama
            'nama'        => (string) $row['nama'],
            'lokasi'      => (string) ($row['lokasi'] ?? ''),
            'gambar'      => $row['gambar'] ?? null,
            'alt'         => $row['alt'] ?? null,
            'harga'       => (int) ($row['harga'] ?? 0),
            'dibuat_pada' => $row['dibuat_pada'] ?? null,
        ];
    }
}


if ($method === 'GET') {

    $sql = <<<'SQL'
        SELECT w.id AS wishlist_id,
               'destinasi' AS jenis,
               d.id AS item_id,
               d.nama,
               d.lokasi,
               d.gambar,
               d.alt,
               d.harga,
               w.dibuat_pada
          FROM wishlists w
          INNER JOIN destinasi d ON d.id = w.destinasi_id
         WHERE w.user_id = :user_id

        UNION ALL

        SELECT w.id AS wishlist_id,
               'penginapan' AS jenis,
               p.id AS item_id,
               p.nama,
               p.lokasi,
               p.gambar,
               p.alt,
               p.harga,
               w.dibuat_pada
          FROM wishlists w
          INNER JOIN penginapan p ON p.id = w.penginapan_id
         WHERE w.user_id = :user_id2

         ORDER BY dibuat_pada DESC, wishlist_id DESC
SQL;

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':user_id'  => $userId,
            ':user_id2' => $userId,
        ]);

        $data = array_map('wishlist_format_row', $stmt->fetchAll());
        json_success($data, 'Data wishlist berhasil dimuat.');
    } catch (PDOException $e) {
        error_log('[IndoTrip] Wishlist GET error: ' . $e->getMessage());
        json_error('Gagal memuat wishlist. Silakan coba lagi nanti.', 500);
    }
}


$input   = wishlist_request_input();
$jenis   = strtolower(trim((string) ($input['jenis'] ?? '')));
$itemId  = trim((string) ($input['item_id'] ?? $input['id'] ?? ''));

if (!in_array($jenis, ['destinasi', 'penginapan'], true)) {
    json_error('Jenis item tidak valid.', 422);
}
if ($itemId === '' || strlen($itemId) > 100) {
    json_error('Item tidak valid.', 422);
}

$table  = $jenis === 'destinasi' ? 'destinasi' : 'penginapan';
$column = $jenis === 'destinasi' ? 'destinasi_id' : 'penginapan_id';

try {
    $stmt = $pdo->prepare("SELECT id, nama, lokasi, gambar, alt, harga FROM {$table} WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $itemId]);
    $item = $stmt->fetch();
    if (!$item) {
        json_error('Item tidak ditemukan.', 404);
    }

    $stmt = $pdo->prepare(
        "SELECT id FROM wishlists WHERE user_id = :user_id AND {$column} = :item_id LIMIT 1"
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':item_id' => $itemId,
    ]);
    $existing = $stmt->fetch();

    if ($existing) {
        $stmt = $pdo->prepare('DELETE FROM wishlists WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => (int) $existing['id']]);

        json_success([
            'saved'   => false,
            'jenis'   => $jenis,
            'item_id' => $itemId,
        ], 'Item dihapus dari wishlist.');
    }

    $stmt = $pdo->prepare(
        "INSERT INTO wishlists (user_id, {$column}) VALUES (:user_id, :item_id)"
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':item_id' => $itemId,
    ]);

    json_success([
        'saved'      => true,
        'jenis'      => $jenis,
        'item_id'    => $itemId,
        'wishlist_id' => (int) $pdo->lastInsertId(),
    ], 'Item disimpan ke wishlist.', 201);
} catch (PDOException $e) {
    error_log('[IndoTrip] Wishlist POST error: ' . $e->getMessage());
    json_error('Gagal memperbarui wishlist. Silakan coba lagi nanti.', 500);
}
