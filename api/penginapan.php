<?php

require_once __DIR__ . '/../config/db.php';

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_error('Metode tidak diizinkan. Gunakan GET.', 405);
}


if (!function_exists('api_param_values')) {
    function api_param_values(string $key): array
    {
        if (!isset($_GET[$key])) {
            return [];
        }

        $raw = is_array($_GET[$key]) ? $_GET[$key] : [$_GET[$key]];
        $out = [];

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

if (!function_exists('api_json_scalar')) {
    function api_json_scalar(string $value): string
    {
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        return $json === false ? '""' : $json;
    }
}

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

/** Ubah baris DB menjadi bentuk yang dipakai frontend. */
if (!function_exists('api_format_penginapan')) {
    function api_format_penginapan(array $row): array
    {
        return [
            'id'              => (string) $row['id'],
            'alias'           => api_json_array($row['alias'] ?? null),
            'nama'            => (string) $row['nama'],
            'lokasi'          => (string) $row['lokasi'],
            'pulau'           => $row['pulau'] ?? null,
            'tipe'            => $row['tipe'] ?? null,
            'harga'           => (int) $row['harga'],
            'rating'          => (float) $row['rating'],
            'ulasan'          => (int) $row['ulasan'],
            'jarak'           => $row['jarak'] ?? null,
            'alamatLengkap'   => $row['alamat_lengkap'] ?? null,
            'checkIn'         => $row['check_in'] ?? null,
            'checkOut'        => $row['check_out'] ?? null,
            'ratingLabel'     => $row['rating_label'] ?? null,
            'gambar'          => $row['gambar'] ?? null,
            'gambarHero'      => $row['gambar_hero'] ?? null,
            'alt'             => $row['alt'] ?? null,
            'tentangJudul'    => $row['tentang_judul'] ?? null,
            'deskripsi'       => $row['deskripsi'] ?? null,
            'fasilitas'       => api_json_array($row['fasilitas'] ?? null),
            'fasilitasDetail' => api_json_array($row['fasilitas_detail'] ?? null),
            'tips'            => api_json_array($row['tips'] ?? null),
            'kebijakan'       => api_json_array($row['kebijakan'] ?? null),
        ];
    }
}


$id = trim((string) ($_GET['id'] ?? ''));
if ($id !== '') {
    $stmt = $pdo->prepare(
        'SELECT * FROM penginapan
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
        json_error('Penginapan tidak ditemukan.', 404);
    }

    json_success(api_format_penginapan($row), 'Penginapan ditemukan.');
}


$where  = [];
$params = [];

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

$tipe = api_param_values('tipe');
if ($tipe !== []) {
    $placeholders = [];
    foreach ($tipe as $i => $value) {
        $key = ':tipe' . $i;
        $placeholders[] = $key;
        $params[$key] = $value;
    }
    $where[] = 'tipe IN (' . implode(', ', $placeholders) . ')';
}

$sql = 'SELECT * FROM penginapan';
if ($where !== []) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
}
$sql .= ' ORDER BY rating DESC, ulasan DESC, nama ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$data = array_map('api_format_penginapan', $stmt->fetchAll());

json_success($data, 'Data penginapan berhasil dimuat.');
