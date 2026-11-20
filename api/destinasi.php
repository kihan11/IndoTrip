<?php

require_once __DIR__ . '/../config/db.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_error('Metode tidak diizinkan. Gunakan GET.', 405);
}


/** Ambil nilai param (bisa array / comma separated) menjadi daftar unik. */
if (!function_exists('api_param_values')) {
    function api_param_values(string $key): array
    {
        if (!isset($_GET[$key])) {
            return [];
        }

        $raw  = is_array($_GET[$key]) ? $_GET[$key] : [$_GET[$key]];
        $out  = [];

        foreach ($raw as $value) {
            foreach (explode(',', (string) $value) as $part) {
                $part = trim($part);
                if ($part !== '') {
                    $out[] = $part;
                }
            }
        }

        return array_values(array_unique($out));
    }
}

/** Encode nilai sebagai JSON string valid untuk JSON_CONTAINS(). */
if (!function_exists('api_json_scalar')) {
    function api_json_scalar(string $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $json === false ? '""' : $json;
    }
}

/** Decode kolom JSON MySQL menjadi array (aman bila NULL / rusak). */
if (!function_exists('api_json_array')) {
    function api_json_array(mixed $raw): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}

/** Ubah baris DB (snake_case) menjadi bentuk yang dipakai frontend. */
if (!function_exists('api_format_destinasi')) {
    function api_format_destinasi(array $row): array
    {
        return [
            'id'            => (string) $row['id'],
            'alias'         => api_json_array($row['alias'] ?? null),
            'nama'          => (string) $row['nama'],
            'lokasi'        => (string) $row['lokasi'],
            'lokasiLengkap' => $row['lokasi_lengkap'] ?? null,
            'pulau'         => $row['pulau'] ?? null,
            'tipe'          => api_json_array($row['tipe'] ?? null),
            'harga'         => (int) $row['harga'],
            'rating'        => (float) $row['rating'],
            'ulasan'        => (int) $row['ulasan'],
            'jam'           => $row['jam'] ?? null,
            'jamCatatan'    => $row['jam_catatan'] ?? null,
            'htm'           => $row['htm'] ?? null,
            'htmCatatan'    => $row['htm_catatan'] ?? null,
            'gambar'        => $row['gambar'] ?? null,
            'gambarHero'    => $row['gambar_hero'] ?? null,
            'alt'           => $row['alt'] ?? null,
            'deskripsi'     => $row['deskripsi'] ?? null,
            'fasilitas'     => api_json_array($row['fasilitas'] ?? null),
            'tips'          => api_json_array($row['tips'] ?? null),
        ];
    }
}


$id = trim((string) ($_GET['id'] ?? ''));
if ($id !== '') {
    $stmt = $pdo->prepare(
        'SELECT * FROM destinasi
         WHERE id = :id1
            OR LOWER(nama) = LOWER(:id2)
            OR LOWER(REPLACE(nama, \' \', \'-\')) = LOWER(:id3)
            OR JSON_CONTAINS(alias, :alias)
         LIMIT 1'
    );
    $stmt->execute([
        ':id1'   => $id,
        ':id2'   => $id,
        ':id3'   => $id,
        ':alias' => api_json_scalar($id),
    ]);

    $row = $stmt->fetch();
    if (!$row) {
        json_error('Destinasi tidak ditemukan.', 404);
    }

    json_success(api_format_destinasi($row), 'Destinasi ditemukan.');
}


$where  = [];
$params = [];

/* Pulau — IN (:p0, :p1, ...) */
$pulau = api_param_values('pulau');
if ($pulau !== []) {
    $placeholders = [];
    foreach ($pulau as $i => $value) {
        $key = ':pulau' . $i;
        $placeholders[] = $key;
        $params[$key] = $value;
    }
    $where[] = 'pulau IN (' . implode(', ', $placeholders) . ')';
}

/* Tipe — kolom JSON, cocokkan tiap nilai dengan JSON_CONTAINS */
$tipe = api_param_values('tipe');
if ($tipe !== []) {
    $conditions = [];
    foreach ($tipe as $i => $value) {
        $key = ':tipe' . $i;
        $conditions[] = 'JSON_CONTAINS(tipe, ' . $key . ')';
        $params[$key] = api_json_scalar($value);
    }
    $where[] = '(' . implode(' OR ', $conditions) . ')';
}

/* Pencarian teks bebas */
$q = trim((string) ($_GET['q'] ?? ''));
if ($q !== '') {
    $escaped = addcslashes($q, "%_\\");
    $where[] = "CONCAT_WS(' ', id, nama, lokasi, pulau, tipe, alias) LIKE :q";
    $params[':q'] = '%' . $escaped . '%';
}

$sql = 'SELECT * FROM destinasi';
if ($where !== []) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}

$populer = isset($_GET['populer'])
    && in_array(strtolower((string) $_GET['populer']), ['1', 'true', 'yes'], true);

$sql .= ' ORDER BY rating DESC, ulasan DESC, nama ASC';
if ($populer) {
    $sql .= ' LIMIT 4';
}

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = array_map('api_format_destinasi', $stmt->fetchAll());

json_success($data, 'Data destinasi berhasil dimuat.');
