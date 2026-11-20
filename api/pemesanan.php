<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method !== 'GET' && $method !== 'POST') {
    json_error('Metode tidak diizinkan. Gunakan GET atau POST.', 405);
}

/* Semua endpoint di file ini khusus web user (bukan admin). */
$user   = requireUser();
$userId = (int) $user['id'];


/** Baca body request (JSON, form encoded, atau multipart/form-data). */
if (!function_exists('pemesanan_request_input')) {
    function pemesanan_request_input(): array
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

/** Validasi dan normalisasi tanggal YYYY-MM-DD. */
if (!function_exists('pemesanan_parse_date')) {
    function pemesanan_parse_date(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $date   = DateTime::createFromFormat('!Y-m-d', $value);
        $errors = DateTime::getLastErrors();
        if (!$date || ($errors && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
            return null;
        }

        return $date->format('Y-m-d');
    }
}

if (!function_exists('pemesanan_normalisasi_metode')) {
    function pemesanan_normalisasi_metode(mixed $raw): ?string
    {
        $metode = strtolower(trim((string) $raw));
        $peta   = [
            'transfer_bca'  => 'transfer_bca',
            'bca'           => 'transfer_bca',
            'transfer_bank' => 'transfer_bca',
            'qris'          => 'qris',
            'gopay_ovo'     => 'gopay_ovo',
            'gopay'         => 'gopay_ovo',
            'ovo'           => 'gopay_ovo',
            'e_wallet'      => 'gopay_ovo',
        ];

        return $peta[$metode] ?? null;
    }
}

/** Cari field file bukti pertama yang tersedia di $_FILES. */
if (!function_exists('pemesanan_field_bukti')) {
    function pemesanan_field_bukti(): ?string
    {
        foreach (['bukti', 'bukti_pembayaran', 'file'] as $field) {
            if (isset($_FILES[$field])) {
                return $field;
            }
        }
        return null;
    }
}

if (!function_exists('pemesanan_simpan_bukti')) {
    function pemesanan_simpan_bukti(array $file, string $label): array
    {
        if (is_array($file['error'] ?? null)) {
            json_error('Upload bukti tidak valid.', 422);
        }
        $uploadError = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($uploadError === UPLOAD_ERR_NO_FILE) {
            json_error('Pilih file bukti pembayaran terlebih dahulu.', 422);
        }
        if ($uploadError !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($file['tmp_name'] ?? ''))) {
            json_error('Gagal mengunggah bukti. Silakan coba lagi.', 422);
        }

        $maxSize = 2 * 1024 * 1024; // 2 MB
        $ukuran  = (int) ($file['size'] ?? 0);
        if ($ukuran <= 0 || $ukuran > $maxSize) {
            json_error('Ukuran bukti pembayaran maksimal 2 MB.', 422);
        }

        $ekstensi      = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
        $mimeDiizinkan = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
        ];
        if (class_exists('finfo')) {
            $deteksi = new finfo(FILEINFO_MIME_TYPE);
            $mime    = (string) $deteksi->file((string) $file['tmp_name']);
        } else {
            $mime = function_exists('mime_content_type')
                ? (string) mime_content_type((string) $file['tmp_name'])
                : '';
        }
        if (!isset($mimeDiizinkan[$mime]) || !in_array($ekstensi, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            json_error('Format bukti harus JPG, PNG, atau WebP.', 422);
        }
        $ext = $mimeDiizinkan[$mime]; // jpeg -> jpg

        $uploadDir = __DIR__ . '/../uploads/bukti';
        if (!is_dir($uploadDir) && !@mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
            error_log('[IndoTrip] Gagal membuat folder uploads/bukti');
            json_error('Gagal menyiapkan penyimpanan bukti. Silakan coba lagi nanti.', 500);
        }

        /* Nama file unik + aman (tanpa nama asli / path traversal). */
        $labelAman = preg_replace('/[^A-Za-z0-9_-]/', '', $label) ?: 'order';
        $namaFile  = sprintf(
            'bukti-%s-%s.%s',
            $labelAman,
            bin2hex(random_bytes(6)),
            $ext
        );
        $pathAbsolut = $uploadDir . DIRECTORY_SEPARATOR . $namaFile;
        if (!move_uploaded_file((string) $file['tmp_name'], $pathAbsolut)) {
            json_error('Gagal menyimpan bukti pembayaran. Silakan coba lagi.', 500);
        }

        return [
            'public'   => 'uploads/bukti/' . $namaFile,
            'absolute' => $pathAbsolut,
        ];
    }
}


if ($method === 'GET') {
    $sql = <<<'SQL'
        SELECT p.id,
               p.kode_booking,
               p.destinasi_id,
               p.penginapan_id,
               p.tanggal_mulai,
               p.tanggal_selesai,
               p.jumlah_peserta,
               p.total_harga,
               p.status,
               p.catatan,
               p.metode_pembayaran,
               p.bukti_pembayaran,
               p.catatan_admin,
               p.dibayar_pada,
               p.dibuat_pada,
               d.nama AS destinasi_nama,
               d.lokasi AS destinasi_lokasi,
               d.gambar AS destinasi_gambar,
               pj.nama AS penginapan_nama,
               pj.lokasi AS penginapan_lokasi,
               pj.gambar AS penginapan_gambar
          FROM pemesanan p
          LEFT JOIN destinasi d ON d.id = p.destinasi_id
          LEFT JOIN penginapan pj ON pj.id = p.penginapan_id
         WHERE p.user_id = :user_id
         ORDER BY p.dibuat_pada DESC, p.id DESC
SQL;

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([':user_id' => $userId]);

        $data = [];
        foreach ($stmt->fetchAll() as $row) {
            $isDestinasi = $row['destinasi_id'] !== null;
            $data[] = [
                'id'                => (int) $row['id'],
                'kode_booking'      => (string) $row['kode_booking'],
                'jenis'             => $isDestinasi ? 'destinasi' : 'penginapan',
                'item_id'           => (string) ($isDestinasi ? $row['destinasi_id'] : $row['penginapan_id']),
                'nama'              => (string) ($isDestinasi ? $row['destinasi_nama'] : $row['penginapan_nama']),
                'lokasi'            => (string) ($isDestinasi ? $row['destinasi_lokasi'] : $row['penginapan_lokasi']),
                'gambar'            => $isDestinasi ? $row['destinasi_gambar'] : $row['penginapan_gambar'],
                'tanggal_kunjungan' => (string) $row['tanggal_mulai'],
                'tanggal_selesai'   => $row['tanggal_selesai'] !== null ? (string) $row['tanggal_selesai'] : null,
                'jumlah'            => (int) $row['jumlah_peserta'],
                'total_harga'       => (float) $row['total_harga'],
                'status'            => (string) $row['status'],
                'catatan'           => $row['catatan'] !== null ? (string) $row['catatan'] : null,
                'metode_pembayaran' => $row['metode_pembayaran'] !== null ? (string) $row['metode_pembayaran'] : null,
                'bukti_pembayaran'  => $row['bukti_pembayaran'] !== null ? (string) $row['bukti_pembayaran'] : null,
                'catatan_admin'     => $row['catatan_admin'] !== null ? (string) $row['catatan_admin'] : null,
                'dibayar_pada'      => $row['dibayar_pada'] !== null ? (string) $row['dibayar_pada'] : null,
                'dibuat_pada'       => (string) $row['dibuat_pada'],
            ];
        }

        json_success($data, 'Riwayat pemesanan berhasil dimuat.');
    } catch (PDOException $e) {
        error_log('[IndoTrip] Pemesanan GET error: ' . $e->getMessage());
        json_error('Gagal memuat riwayat pemesanan. Silakan coba lagi nanti.', 500);
    }
}


$action      = strtolower(trim((string) ($_POST['action'] ?? '')));
$uploadField = pemesanan_field_bukti();

if ($action === 'upload_bukti' || ($uploadField !== null && isset($_POST['pemesanan_id']))) {
    $pemesananId = filter_var($_POST['pemesanan_id'] ?? null, FILTER_VALIDATE_INT);
    if ($pemesananId === false || $pemesananId <= 0) {
        json_error('ID pemesanan tidak valid.', 422);
    }

    $metode = pemesanan_normalisasi_metode($_POST['metode_pembayaran'] ?? '');
    if ($metode === null) {
        json_error('Metode pembayaran tidak valid.', 422);
    }

    /* Kepemilikan: pemesanan harus milik user yang sedang login. */
    $stmt = $pdo->prepare(
        'SELECT id, kode_booking, status FROM pemesanan WHERE id = :id AND user_id = :user_id LIMIT 1'
    );
    $stmt->execute([':id' => $pemesananId, ':user_id' => $userId]);
    $pemesanan = $stmt->fetch();
    if (!$pemesanan) {
        json_error('Pemesanan tidak ditemukan.', 404);
    }
    if (!in_array($pemesanan['status'], ['menunggu', 'ditolak', 'menunggu_verifikasi'], true)) {
        json_error('Pemesanan ini tidak dapat dibayar.', 422);
    }

    if ($uploadField === null) {
        json_error('File bukti pembayaran wajib diunggah.', 422);
    }

    $kodeAman = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $pemesanan['kode_booking']) ?: 'order';
    $tersimpan = pemesanan_simpan_bukti(
        $_FILES[$uploadField],
        $pemesananId . '-' . $kodeAman
    );

    try {
        $stmt = $pdo->prepare(
            "UPDATE pemesanan
                SET metode_pembayaran = :metode,
                    bukti_pembayaran  = :bukti,
                    catatan_admin     = NULL,
                    dibayar_pada      = NOW(),
                    status            = 'menunggu_verifikasi'
              WHERE id = :id AND user_id = :user_id"
        );
        $stmt->execute([
            ':metode'  => $metode,
            ':bukti'   => $tersimpan['public'],
            ':id'      => $pemesananId,
            ':user_id' => $userId,
        ]);
    } catch (PDOException $e) {
        @unlink($tersimpan['absolute']); // jangan simpan file yatim bila DB gagal
        error_log('[IndoTrip] Upload bukti UPDATE error: ' . $e->getMessage());
        json_error('Gagal menyimpan data pembayaran. Silakan coba lagi nanti.', 500);
    }

    json_success([
        'id'                => $pemesananId,
        'kode_booking'      => (string) $pemesanan['kode_booking'],
        'metode_pembayaran' => $metode,
        'bukti_pembayaran'  => $tersimpan['public'],
        'status'            => 'menunggu_verifikasi',
    ], 'Bukti pembayaran berhasil diunggah. Menunggu verifikasi admin.', 201);
}


$input  = pemesanan_request_input();
$jenis  = strtolower(trim((string) ($input['jenis'] ?? '')));
$itemId = trim((string) ($input['item_id'] ?? $input['id'] ?? ''));

$tanggalKunjungan = pemesanan_parse_date((string) ($input['tanggal_kunjungan'] ?? $input['tanggal_mulai'] ?? ''));

$jumlahRaw = $input['jumlah'] ?? $input['jumlah_peserta'] ?? 1;
$jumlah    = filter_var($jumlahRaw, FILTER_VALIDATE_INT);
$catatan   = trim((string) ($input['catatan'] ?? ''));
$metode    = pemesanan_normalisasi_metode($input['metode_pembayaran'] ?? '');

if (!in_array($jenis, ['destinasi', 'penginapan'], true)) {
    json_error('Jenis item tidak valid.', 422);
}
if ($itemId === '' || strlen($itemId) > 100) {
    json_error('Item tidak valid.', 422);
}
if ($tanggalKunjungan === null) {
    json_error('Tanggal kunjungan tidak valid. Gunakan format YYYY-MM-DD.', 422);
}
if ($jumlah === false || $jumlah < 1 || $jumlah > 50) {
    json_error('Jumlah orang/malam harus antara 1 sampai 50.', 422);
}

/* Tabel dan kolom berasal dari whitelist — aman disisipkan ke SQL. */
$table  = $jenis === 'destinasi' ? 'destinasi' : 'penginapan';
$column = $jenis === 'destinasi' ? 'destinasi_id' : 'penginapan_id';

$tersimpan = null;

try {
    $stmt = $pdo->prepare("SELECT id, nama, harga FROM {$table} WHERE id = :id LIMIT 1");
    $stmt->execute([':id' => $itemId]);
    $item = $stmt->fetch();
    if (!$item) {
        json_error('Item tidak ditemukan.', 404);
    }

    /* Hitung total harga di sisi server dari tabel, bukan dari request. */
    $hargaSatuan = (int) $item['harga'];
    $totalHarga  = $hargaSatuan * $jumlah;

    $mulai = new DateTime($tanggalKunjungan . ' 00:00:00');

    $tanggalSelesai = null;
    if ($jenis === 'penginapan') {
        $selesai = clone $mulai;
        $selesai->modify('+' . $jumlah . ' day');
        $tanggalSelesai = $selesai->format('Y-m-d');
    }

    /* Buat kode booking unik, mis. IT-20261120-0042. */
    do {
        $kodeBooking = 'IT-' . $mulai->format('Ymd') . '-' . str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
        $stmt = $pdo->prepare('SELECT id FROM pemesanan WHERE kode_booking = :kode LIMIT 1');
        $stmt->execute([':kode' => $kodeBooking]);
        $kodeDipakai = (bool) $stmt->fetch();
    } while ($kodeDipakai);

    $kodeAman = preg_replace('/[^A-Za-z0-9_-]/', '', $kodeBooking) ?: 'order';

    if ($totalHarga > 0) {
        /* Berbayar: metode + bukti wajib, langsung menunggu verifikasi. */
        if ($metode === null) {
            json_error('Pilih metode pembayaran terlebih dahulu.', 422);
        }
        if ($uploadField === null) {
            json_error('File bukti pembayaran wajib diunggah.', 422);
        }
        $tersimpan = pemesanan_simpan_bukti($_FILES[$uploadField], $kodeAman);
        $status    = 'menunggu_verifikasi';
        $metodeSimpan = $metode;
        $buktiSimpan  = $tersimpan['public'];
    } else {
        /* Gratis: langsung dibayar, tanpa wajib bukti. */
        $status       = 'dibayar';
        $metodeSimpan = $metode; // boleh null
        $buktiSimpan  = null;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO pemesanan
            (kode_booking, user_id, {$column}, tanggal_mulai, tanggal_selesai,
             jumlah_peserta, total_harga, status, catatan,
             metode_pembayaran, bukti_pembayaran, dibayar_pada)
         VALUES
            (:kode, :user_id, :item_id, :tanggal_mulai, :tanggal_selesai,
             :jumlah, :total_harga, :status, :catatan,
             :metode, :bukti, NOW())"
    );
    $stmt->execute([
        ':kode'            => $kodeBooking,
        ':user_id'         => $userId,
        ':item_id'         => $itemId,
        ':tanggal_mulai'   => $tanggalKunjungan,
        ':tanggal_selesai' => $tanggalSelesai,
        ':jumlah'          => $jumlah,
        ':total_harga'     => $totalHarga,
        ':status'          => $status,
        ':catatan'         => $catatan === '' ? null : $catatan,
        ':metode'          => $metodeSimpan,
        ':bukti'           => $buktiSimpan,
    ]);

    json_success([
        'id'                => (int) $pdo->lastInsertId(),
        'kode_booking'      => $kodeBooking,
        'jenis'             => $jenis,
        'item_id'           => $itemId,
        'nama'              => (string) $item['nama'],
        'tanggal_kunjungan' => $tanggalKunjungan,
        'tanggal_selesai'   => $tanggalSelesai,
        'jumlah'            => $jumlah,
        'total_harga'       => $totalHarga,
        'status'            => $status,
        'metode_pembayaran' => $metodeSimpan,
        'bukti_pembayaran'  => $buktiSimpan,
    ], $status === 'dibayar'
        ? 'Pemesanan berhasil. Tiket kamu langsung aktif.'
        : 'Pemesanan & pembayaran berhasil dikirim. Menunggu verifikasi admin.', 201);
} catch (PDOException $e) {
    if ($tersimpan !== null) {
        @unlink($tersimpan['absolute']); // jangan simpan file yatim bila DB gagal
    }
    error_log('[IndoTrip] Pemesanan POST error: ' . $e->getMessage());
    json_error('Gagal menyimpan pemesanan. Silakan coba lagi nanti.', 500);
}
