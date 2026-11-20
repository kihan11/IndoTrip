<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';


requireAdmin();


/** Baca body request (JSON atau form encoded). */
if (!function_exists('admin_request_input')) {
    function admin_request_input(): array
    {
        static $input = null;
        if ($input !== null) {
            return $input;
        }

        $contentType = strtolower((string) (
            $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''
        ));
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

/** Daftar status pemesanan yang valid (sesuai ENUM di database.sql). */
if (!function_exists('admin_status_pemesanan')) {
    function admin_status_pemesanan(): array
    {
        return ['menunggu', 'menunggu_verifikasi', 'dibayar', 'ditolak', 'selesai', 'dibatalkan'];
    }
}

/** Daftar status pesan kontak yang valid (sesuai ENUM di database.sql). */
if (!function_exists('admin_status_kontak')) {
    function admin_status_kontak(): array
    {
        return ['baru', 'dibaca', 'dibalas'];
    }
}

/** Ambil satu baris pemesanan lengkap (dipakai setelah verifikasi). */
if (!function_exists('admin_fetch_pemesanan')) {
    function admin_fetch_pemesanan(PDO $pdo, int $id): array|false
    {
        $stmt = $pdo->prepare(
            'SELECT p.id, p.kode_booking, p.user_id, p.destinasi_id, p.penginapan_id,
                    p.tanggal_mulai, p.tanggal_selesai, p.jumlah_peserta, p.total_harga,
                    p.status, p.catatan, p.metode_pembayaran, p.bukti_pembayaran,
                    p.catatan_admin, p.dibayar_pada, p.dibuat_pada, p.diperbarui_pada,
                    u.nama AS user_nama, u.email AS user_email,
                    d.nama AS destinasi_nama, d.lokasi AS destinasi_lokasi, d.gambar AS destinasi_gambar,
                    pj.nama AS penginapan_nama, pj.lokasi AS penginapan_lokasi, pj.gambar AS penginapan_gambar
               FROM pemesanan p
               JOIN users u ON u.id = p.user_id
               LEFT JOIN destinasi d ON d.id = p.destinasi_id
               LEFT JOIN penginapan pj ON pj.id = p.penginapan_id
              WHERE p.id = :id
              LIMIT 1'
        );
        $stmt->execute([':id' => $id]);
        return $stmt->fetch();
    }
}

/** Format baris pemesanan untuk response JSON. */
if (!function_exists('admin_pemesanan_payload')) {
    function admin_pemesanan_payload(array $row): array
    {
        $isDestinasi = $row['destinasi_id'] !== null;

        return [
            'id'                => (int) $row['id'],
            'kode_booking'      => (string) $row['kode_booking'],
            'user_id'           => (int) $row['user_id'],
            'user_nama'         => (string) ($row['user_nama'] ?? ''),
            'user_email'        => (string) ($row['user_email'] ?? ''),
            'jenis'             => $isDestinasi ? 'destinasi' : 'penginapan',
            'item_id'           => (string) ($isDestinasi ? $row['destinasi_id'] : $row['penginapan_id']),
            'destinasi_id'      => $row['destinasi_id'] !== null ? (string) $row['destinasi_id'] : null,
            'penginapan_id'     => $row['penginapan_id'] !== null ? (string) $row['penginapan_id'] : null,
            'destinasi_nama'    => $row['destinasi_nama'] !== null ? (string) $row['destinasi_nama'] : null,
            'penginapan_nama'   => $row['penginapan_nama'] !== null ? (string) $row['penginapan_nama'] : null,
            'nama_item'         => (string) ($isDestinasi ? $row['destinasi_nama'] : $row['penginapan_nama']),
            'tanggal_mulai'     => (string) $row['tanggal_mulai'],
            'tanggal_selesai'   => $row['tanggal_selesai'] !== null ? (string) $row['tanggal_selesai'] : null,
            'jumlah_peserta'    => (int) $row['jumlah_peserta'],
            'total_harga'       => (float) $row['total_harga'],
            'status'            => (string) $row['status'],
            'catatan'           => $row['catatan'] !== null ? (string) $row['catatan'] : null,
            'metode_pembayaran' => $row['metode_pembayaran'] !== null ? (string) $row['metode_pembayaran'] : null,
            'bukti_pembayaran'  => $row['bukti_pembayaran'] !== null ? (string) $row['bukti_pembayaran'] : null,
            'catatan_admin'     => $row['catatan_admin'] !== null ? (string) $row['catatan_admin'] : null,
            'dibayar_pada'      => $row['dibayar_pada'] !== null ? (string) $row['dibayar_pada'] : null,
            'dibuat_pada'       => (string) $row['dibuat_pada'],
            'diperbarui_pada'   => (string) $row['diperbarui_pada'],
        ];
    }
}

/** Format baris pesan kontak untuk response JSON. */
if (!function_exists('admin_kontak_payload')) {
    function admin_kontak_payload(array $row): array
    {
        return [
            'id'          => (int) $row['id'],
            'user_id'     => $row['user_id'] !== null ? (int) $row['user_id'] : null,
            'nama'        => (string) $row['nama'],
            'email'       => (string) $row['email'],
            'subjek'      => (string) $row['subjek'],
            'pesan'       => (string) $row['pesan'],
            'status'      => (string) $row['status'],
            'dibuat_pada' => (string) $row['dibuat_pada'],
        ];
    }
}


/** Buat slug URL dari teks (nama) secara deterministik. */
if (!function_exists('admin_slugify')) {
    function admin_slugify(string $teks): string
    {
        $teks = strtolower(trim($teks));

        // Transliterasi karakter yang paling sering dipakai.
        $peta = [
            'à'=>'a','á'=>'a','â'=>'a','ã'=>'a','ä'=>'a','å'=>'a','æ'=>'ae',
            'ç'=>'c','è'=>'e','é'=>'e','ê'=>'e','ë'=>'e',
            'ì'=>'i','í'=>'i','î'=>'i','ï'=>'i','ð'=>'d','ñ'=>'n',
            'ò'=>'o','ó'=>'o','ô'=>'o','õ'=>'o','ö'=>'o','ø'=>'o',
            'ù'=>'u','ú'=>'u','û'=>'u','ü'=>'u','ý'=>'y','ÿ'=>'y',
            'ā'=>'a','ē'=>'e','ī'=>'i','ō'=>'o','ū'=>'u',
        ];
        $teks = strtr($teks, $peta);

        if (function_exists('iconv')) {
            $translit = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $teks);
            if ($translit !== false) {
                $teks = $translit;
            }
        }

        $teks = preg_replace('/[^a-z0-9]+/', '-', $teks) ?? '';
        return trim($teks, '-');
    }
}

/** Pastikan slug unik di tabel (id adalah PRIMARY KEY VARCHAR(100)). */
if (!function_exists('admin_unique_slug')) {
    function admin_unique_slug(PDO $pdo, string $tabel, string $slug): string
    {
        if (!in_array($tabel, ['destinasi', 'penginapan'], true)) {
            json_error('Tabel tidak dikenal.', 500);
        }
        if ($slug === '') {
            $slug = 'item-' . bin2hex(random_bytes(3));
        }

        $slug  = substr($slug, 0, 100);
        $basis = $slug;
        $nomor = 2;

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM {$tabel} WHERE id = :id");
        while (true) {
            $stmt->execute([':id' => $slug]);
            if ((int) $stmt->fetchColumn() === 0) {
                return $slug;
            }
            $suffix = '-' . $nomor++;
            $slug   = substr($basis, 0, 100 - strlen($suffix)) . $suffix;
        }
    }
}

/** Pecah input string (koma / baris baru) menjadi daftar nilai unik. */
if (!function_exists('admin_split_list')) {
    function admin_split_list(mixed $raw): array
    {
        $parts = is_array($raw) ? $raw : (preg_split('/[\r\n,]+/', (string) $raw) ?: []);
        $out   = [];

        foreach ($parts as $part) {
            $part = trim((string) $part);
            if ($part !== '' && !in_array($part, $out, true)) {
                $out[] = $part;
            }
        }

        return array_values($out);
    }
}

/** Terima array, string JSON, atau teks koma/baris baru -> array PHP. */
if (!function_exists('admin_json_list_input')) {
    function admin_json_list_input(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values($raw);
        }

        $teks = trim((string) $raw);
        if ($teks === '') {
            return [];
        }

        $decoded = json_decode($teks, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_values($decoded);
        }

        return admin_split_list($teks);
    }
}

/** Encode array menjadi JSON yang valid untuk kolom JSON. */
if (!function_exists('admin_json')) {
    function admin_json(array $data): string
    {
        $json = json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
        );
        return $json === false ? '[]' : $json;
    }
}

if (!function_exists('admin_text')) {
    function admin_text(mixed $value, string $default = ''): string
    {
        if ($value === null) {
            return $default;
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        if (is_array($value) || is_object($value)) {
            return $default;
        }
        $value = trim((string) $value);
        return $value === '' ? $default : $value;
    }
}

/** Decode kolom JSON menjadi array (aman bila NULL / rusak). */
if (!function_exists('admin_decode_json')) {
    function admin_decode_json(mixed $raw): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}

/** Format harga menjadi "Rp 50.000". */
if (!function_exists('admin_rupiah')) {
    function admin_rupiah(int $harga): string
    {
        return 'Rp ' . number_format(max(0, $harga), 0, ',', '.');
    }
}

/** Ambil entri $_FILES pertama dari beberapa nama field yang mungkin. */
if (!function_exists('admin_uploaded_file')) {
    function admin_uploaded_file(array $namaField): mixed
    {
        foreach ($namaField as $nama) {
            if (isset($_FILES[$nama])) {
                return $_FILES[$nama];
            }
        }
        return null;
    }
}

if (!function_exists('admin_upload_gambar')) {
    function admin_upload_gambar(mixed $file, string $slug, ?string $lama): ?string
    {
        if (!is_array($file)) {
            return $lama;
        }
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error === UPLOAD_ERR_NO_FILE) {
            return $lama;
        }
        if ($error !== UPLOAD_ERR_OK || !is_uploaded_file((string) ($file['tmp_name'] ?? ''))) {
            json_error('Gagal mengunggah gambar. Silakan coba lagi.', 422);
        }
        if (is_array($file['size'] ?? null)) {
            json_error('Upload gambar tidak valid.', 422);
        }

        $ukuran = (int) ($file['size'] ?? 0);
        if ($ukuran <= 0 || $ukuran > 2 * 1024 * 1024) {
            json_error('Ukuran gambar maksimal 2 MB.', 422);
        }

        $ekstensi      = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
        $mimeDiizinkan = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
        ];
        if (class_exists('finfo')) {
            $mime = (string) (new finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
        } else {
            $mime = function_exists('mime_content_type')
                ? (string) mime_content_type((string) $file['tmp_name'])
                : '';
        }
        if (!isset($mimeDiizinkan[$mime]) || !in_array($ekstensi, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            json_error('Format gambar harus JPG, PNG, atau WebP.', 422);
        }

        $dir = __DIR__ . '/../assets/img';
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            error_log('[IndoTrip] Gagal membuat folder assets/img');
            json_error('Gagal menyiapkan penyimpanan gambar.', 500);
        }

        $namaAman = $slug !== '' ? substr($slug, 0, 60) : 'gambar';
        $namaFile = sprintf('%s-%s.%s', $namaAman, bin2hex(random_bytes(6)), $mimeDiizinkan[$mime]);
        if (!move_uploaded_file((string) $file['tmp_name'], $dir . DIRECTORY_SEPARATOR . $namaFile)) {
            json_error('Gagal menyimpan gambar.', 500);
        }

        return 'assets/img/' . $namaFile;
    }
}

/** Format baris destinasi (kolom JSON didecode) untuk response admin. */
if (!function_exists('admin_destinasi_payload')) {
    function admin_destinasi_payload(array $row): array
    {
        return [
            'id'             => (string) $row['id'],
            'alias'          => admin_decode_json($row['alias'] ?? null),
            'nama'           => (string) $row['nama'],
            'lokasi'         => (string) $row['lokasi'],
            'lokasi_lengkap' => $row['lokasi_lengkap'] ?? null,
            'pulau'          => $row['pulau'] ?? null,
            'tipe'           => admin_decode_json($row['tipe'] ?? null),
            'harga'          => (int) $row['harga'],
            'rating'         => (float) $row['rating'],
            'ulasan'         => (int) $row['ulasan'],
            'jam'            => $row['jam'] ?? null,
            'jam_catatan'    => $row['jam_catatan'] ?? null,
            'htm'            => $row['htm'] ?? null,
            'htm_catatan'    => $row['htm_catatan'] ?? null,
            'gambar'         => $row['gambar'] ?? null,
            'gambar_hero'    => $row['gambar_hero'] ?? null,
            'alt'            => $row['alt'] ?? null,
            'deskripsi'      => $row['deskripsi'] ?? null,
            'fasilitas'      => admin_decode_json($row['fasilitas'] ?? null),
            'tips'           => admin_decode_json($row['tips'] ?? null),
            'dibuat_pada'    => $row['dibuat_pada'] ?? null,
        ];
    }
}

/** Format baris penginapan (kolom JSON didecode) untuk response admin. */
if (!function_exists('admin_penginapan_payload')) {
    function admin_penginapan_payload(array $row): array
    {
        return [
            'id'               => (string) $row['id'],
            'alias'            => admin_decode_json($row['alias'] ?? null),
            'nama'             => (string) $row['nama'],
            'lokasi'           => (string) $row['lokasi'],
            'pulau'            => $row['pulau'] ?? null,
            'tipe'             => $row['tipe'] ?? null,
            'harga'            => (int) $row['harga'],
            'rating'           => (float) $row['rating'],
            'ulasan'           => (int) $row['ulasan'],
            'jarak'            => $row['jarak'] ?? null,
            'alamat_lengkap'   => $row['alamat_lengkap'] ?? null,
            'check_in'         => $row['check_in'] ?? null,
            'check_out'        => $row['check_out'] ?? null,
            'rating_label'     => $row['rating_label'] ?? null,
            'gambar'           => $row['gambar'] ?? null,
            'gambar_hero'      => $row['gambar_hero'] ?? null,
            'alt'              => $row['alt'] ?? null,
            'tentang_judul'    => $row['tentang_judul'] ?? null,
            'deskripsi'        => $row['deskripsi'] ?? null,
            'fasilitas'        => admin_decode_json($row['fasilitas'] ?? null),
            'fasilitas_detail' => admin_decode_json($row['fasilitas_detail'] ?? null),
            'tips'             => admin_decode_json($row['tips'] ?? null),
            'kebijakan'        => admin_decode_json($row['kebijakan'] ?? null),
            'dibuat_pada'      => $row['dibuat_pada'] ?? null,
        ];
    }
}


$input = admin_request_input();

$json   = (strpos(strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? '')), 'application/json') !== false)
    ? $input
    : [];
$action = strtolower(trim((string) (
    $_POST['action'] ?? $_GET['action'] ?? ($json['action'] ?? '')
)));
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

$actionsGet  = ['stats', 'pemesanan', 'kontak', 'list_destinasi', 'list_penginapan'];
$actionsPost = [
    'verifikasi', 'update_kontak',
    'save_destinasi', 'delete_destinasi',
    'save_penginapan', 'delete_penginapan',
];

if ($action === '') {
    json_error('Action tidak ditentukan.', 400);
}
if (!in_array($action, array_merge($actionsGet, $actionsPost), true)) {
    json_error('Action tidak dikenal.', 400);
}
if (in_array($action, $actionsGet, true) && $method !== 'GET') {
    json_error('Metode tidak diizinkan. Gunakan GET.', 405);
}
if (in_array($action, $actionsPost, true) && $method !== 'POST') {
    json_error('Metode tidak diizinkan. Gunakan POST.', 405);
}


try {
    switch ($action) {

        case 'stats':
            $stmt = $pdo->prepare('SELECT COUNT(*) AS total FROM pemesanan');
            $stmt->execute();
            $totalPemesanan = (int) $stmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT COUNT(*) AS total FROM pemesanan WHERE status = 'menunggu_verifikasi'");
            $stmt->execute();
            $menungguVerifikasi = (int) $stmt->fetchColumn();

            $stmt = $pdo->prepare(
                "SELECT COALESCE(SUM(total_harga), 0) AS total
                   FROM pemesanan
                  WHERE status IN ('dibayar', 'selesai')"
            );
            $stmt->execute();
            $totalPendapatan = (float) $stmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT COUNT(*) AS total FROM pesan_kontak WHERE status = 'baru'");
            $stmt->execute();
            $pesanBaru = (int) $stmt->fetchColumn();

            json_success([
                'total_pemesanan'              => $totalPemesanan,
                'pemesanan_menunggu_verifikasi' => $menungguVerifikasi,
                'total_pendapatan'             => $totalPendapatan,
                'pesan_kontak_baru'            => $pesanBaru,
            ], 'Statistik berhasil dimuat.');
            break;

        case 'pemesanan':
            $status = strtolower(trim((string) ($_GET['status'] ?? '')));

            if ($status !== '' && !in_array($status, admin_status_pemesanan(), true)) {
                json_error('Filter status tidak valid.', 422);
            }

            $sql = <<<'SQL'
                SELECT p.id, p.kode_booking, p.user_id, p.destinasi_id, p.penginapan_id,
                       p.tanggal_mulai, p.tanggal_selesai, p.jumlah_peserta, p.total_harga,
                       p.status, p.catatan, p.metode_pembayaran, p.bukti_pembayaran,
                       p.catatan_admin, p.dibayar_pada, p.dibuat_pada, p.diperbarui_pada,
                       u.nama AS user_nama, u.email AS user_email,
                       d.nama AS destinasi_nama, d.lokasi AS destinasi_lokasi, d.gambar AS destinasi_gambar,
                       pj.nama AS penginapan_nama, pj.lokasi AS penginapan_lokasi, pj.gambar AS penginapan_gambar
                  FROM pemesanan p
                  JOIN users u ON u.id = p.user_id
                  LEFT JOIN destinasi d ON d.id = p.destinasi_id
                  LEFT JOIN penginapan pj ON pj.id = p.penginapan_id
            SQL;

            $params = [];
            if ($status !== '') {
                $sql .= " WHERE p.status = :status";
                $params[':status'] = $status;
            }
            $sql .= " ORDER BY p.dibuat_pada DESC, p.id DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $data = [];
            foreach ($stmt->fetchAll() as $row) {
                $data[] = admin_pemesanan_payload($row);
            }

            json_success($data, 'Daftar pemesanan berhasil dimuat.');
            break;

        case 'verifikasi':
            $pemesananId = filter_var($input['pemesanan_id'] ?? null, FILTER_VALIDATE_INT);
            $keputusan   = strtolower(trim((string) ($input['keputusan'] ?? '')));
            $catatan     = trim((string) ($input['catatan_admin'] ?? ''));

            if ($pemesananId === false || $pemesananId <= 0) {
                json_error('ID pemesanan tidak valid.', 422);
            }
            if (!in_array($keputusan, ['acc', 'tolak'], true)) {
                json_error('Keputusan tidak valid. Gunakan acc atau tolak.', 422);
            }

            $statusBaru = $keputusan === 'acc' ? 'dibayar' : 'ditolak';

            if (!admin_fetch_pemesanan($pdo, $pemesananId)) {
                json_error('Pemesanan tidak ditemukan.', 404);
            }

            $stmt = $pdo->prepare(
                'UPDATE pemesanan
                    SET status = :status,
                        catatan_admin = :catatan_admin
                  WHERE id = :id'
            );
            $stmt->execute([
                ':status'        => $statusBaru,
                ':catatan_admin' => $catatan === '' ? null : $catatan,
                ':id'            => $pemesananId,
            ]);

            $updated = admin_fetch_pemesanan($pdo, $pemesananId);

            json_success(
                admin_pemesanan_payload($updated),
                $keputusan === 'acc'
                    ? 'Pemesanan berhasil diverifikasi dan ditandai dibayar.'
                    : 'Pemesanan berhasil ditolak.'
            );
            break;

        case 'kontak':
            $status = strtolower(trim((string) ($_GET['status'] ?? '')));

            if ($status !== '' && !in_array($status, admin_status_kontak(), true)) {
                json_error('Filter status tidak valid.', 422);
            }

            $sql    = 'SELECT * FROM pesan_kontak';
            $params = [];
            if ($status !== '') {
                $sql .= ' WHERE status = :status';
                $params[':status'] = $status;
            }
            $sql .= ' ORDER BY dibuat_pada DESC, id DESC';

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $data = [];
            foreach ($stmt->fetchAll() as $row) {
                $data[] = admin_kontak_payload($row);
            }

            json_success($data, 'Daftar pesan kontak berhasil dimuat.');
            break;

        case 'update_kontak':
            $kontakId = filter_var($input['id'] ?? $input['kontak_id'] ?? $input['pesan_id'] ?? null, FILTER_VALIDATE_INT);
            $status   = strtolower(trim((string) ($input['status'] ?? '')));

            if ($kontakId === false || $kontakId <= 0) {
                json_error('ID pesan kontak tidak valid.', 422);
            }
            if (!in_array($status, ['dibaca', 'dibalas'], true)) {
                json_error('Status tidak valid. Gunakan dibaca atau dibalas.', 422);
            }

            $stmt = $pdo->prepare('SELECT id FROM pesan_kontak WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $kontakId]);
            if (!$stmt->fetch()) {
                json_error('Pesan kontak tidak ditemukan.', 404);
            }

            $stmt = $pdo->prepare('UPDATE pesan_kontak SET status = :status WHERE id = :id');
            $stmt->execute([
                ':status' => $status,
                ':id'     => $kontakId,
            ]);

            $stmt = $pdo->prepare('SELECT * FROM pesan_kontak WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $kontakId]);
            $updated = $stmt->fetch();

            json_success(
                admin_kontak_payload($updated),
                'Status pesan kontak berhasil diperbarui.'
            );
            break;

        case 'list_destinasi':
            $stmt = $pdo->prepare('SELECT * FROM destinasi ORDER BY nama ASC');
            $stmt->execute();
            $data = array_map('admin_destinasi_payload', $stmt->fetchAll());
            json_success($data, 'Daftar destinasi berhasil dimuat.');
            break;

        case 'save_destinasi':
            $editId = trim((string) ($input['edit_id'] ?? $input['id'] ?? ''));

            $existing = [];
            if ($editId !== '') {
                $stmt = $pdo->prepare('SELECT * FROM destinasi WHERE id = :id LIMIT 1');
                $stmt->execute([':id' => $editId]);
                $existing = $stmt->fetch() ?: [];
                if ($existing === []) {
                    json_error('Destinasi tidak ditemukan.', 404);
                }
            }

            // Field yang dikirim mengalahkan data lama (update sebagian tetap aman).
            $field = static function (string $key, mixed $default = '') use ($input, $existing): mixed {
                if (array_key_exists($key, $input)) {
                    return $input[$key];
                }
                return array_key_exists($key, $existing) ? $existing[$key] : $default;
            };
            $nama   = trim((string) $field('nama'));
            $lokasi = trim((string) $field('lokasi'));
            if ($nama === '') {
                json_error('Nama destinasi wajib diisi.', 422);
            }
            if ($lokasi === '') {
                json_error('Lokasi destinasi wajib diisi.', 422);
            }

            $harga = filter_var(
                $field('harga', 0),
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 0]]
            );
            if ($harga === false) {
                json_error('Harga destinasi tidak valid.', 422);
            }
            $rating = filter_var($field('rating', 0), FILTER_VALIDATE_FLOAT);
            if ($rating === false || $rating < 0 || $rating > 5) {
                json_error('Rating tidak valid.', 422);
            }
            $ulasan = filter_var(
                $field('ulasan', 0),
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 0]]
            );
            if ($ulasan === false) {
                json_error('Jumlah ulasan tidak valid.', 422);
            }

            // Tipe hanya boleh Alam / Budaya / Pantai / Kuliner.
            $tipeDiizinkan = ['Alam', 'Budaya', 'Pantai', 'Kuliner'];
            $tipe          = [];
            foreach (admin_json_list_input($field('tipe', [])) as $item) {
                $item = trim((string) $item);
                if (in_array($item, $tipeDiizinkan, true) && !in_array($item, $tipe, true)) {
                    $tipe[] = $item;
                }
            }

            $fasilitas = admin_json_list_input($field('fasilitas', []));
            $tips      = admin_json_list_input($field('tips', []));
            $alias     = admin_json_list_input($field('alias', []));

            $slugDasar = $editId !== '' ? $editId : admin_slugify($nama);
            $id        = $editId !== ''
                ? $editId
                : admin_unique_slug($pdo, 'destinasi', $slugDasar);

            $gambar = admin_upload_gambar(
                admin_uploaded_file(['gambar', 'foto', 'image']),
                $slugDasar,
                admin_text($field('gambar'))
            );
            $gambarHero = admin_upload_gambar(
                admin_uploaded_file(['gambar_hero', 'hero']),
                $slugDasar,
                admin_text($field('gambar_hero'))
            );
            if ($gambarHero === '' && $editId === '' && $gambar !== '') {
                $gambarHero = $gambar;
            }

            /* Nilai default valid untuk kolom wajib / kolom teks. */
            $lokasiLengkap = admin_text($field('lokasi_lengkap'), $lokasi);
            $pulau         = admin_text($field('pulau'));
            $jam           = admin_text($field('jam'));
            $jamCatatan    = admin_text($field('jam_catatan'));
            $htm           = admin_rupiah((int) $harga); // otomatis dari harga
            $htmCatatan    = admin_text($field('htm_catatan'), $editId === '' ? '/ orang' : '');
            $alt           = admin_text($field('alt'));
            $deskripsi     = admin_text($field('deskripsi'));

            $params = [
                ':id'             => $id,
                ':alias'          => admin_json($alias),
                ':nama'           => $nama,
                ':lokasi'         => $lokasi,
                ':lokasi_lengkap' => $lokasiLengkap,
                ':pulau'          => $pulau,
                ':tipe'           => admin_json($tipe),
                ':harga'          => $harga,
                ':rating'         => $rating,
                ':ulasan'         => $ulasan,
                ':jam'            => $jam,
                ':jam_catatan'    => $jamCatatan,
                ':htm'            => $htm,
                ':htm_catatan'    => $htmCatatan,
                ':gambar'         => $gambar,
                ':gambar_hero'    => $gambarHero,
                ':alt'            => $alt,
                ':deskripsi'      => $deskripsi,
                ':fasilitas'      => admin_json($fasilitas),
                ':tips'           => admin_json($tips),
            ];

            if ($editId === '') {
                $sql = 'INSERT INTO destinasi
                    (id, alias, nama, lokasi, lokasi_lengkap, pulau, tipe, harga, rating, ulasan,
                     jam, jam_catatan, htm, htm_catatan, gambar, gambar_hero, alt, deskripsi, fasilitas, tips)
                    VALUES
                    (:id, :alias, :nama, :lokasi, :lokasi_lengkap, :pulau, :tipe, :harga, :rating, :ulasan,
                     :jam, :jam_catatan, :htm, :htm_catatan, :gambar, :gambar_hero, :alt, :deskripsi, :fasilitas, :tips)';
            } else {
                $sql = 'UPDATE destinasi SET
                    alias = :alias, nama = :nama, lokasi = :lokasi, lokasi_lengkap = :lokasi_lengkap,
                    pulau = :pulau, tipe = :tipe, harga = :harga, rating = :rating, ulasan = :ulasan,
                    jam = :jam, jam_catatan = :jam_catatan, htm = :htm, htm_catatan = :htm_catatan,
                    gambar = :gambar, gambar_hero = :gambar_hero, alt = :alt, deskripsi = :deskripsi,
                    fasilitas = :fasilitas, tips = :tips
                    WHERE id = :id';
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $stmt = $pdo->prepare('SELECT * FROM destinasi WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $id]);
            json_success(
                admin_destinasi_payload($stmt->fetch()),
                $editId === '' ? 'Destinasi berhasil ditambahkan.' : 'Destinasi berhasil diperbarui.'
            );
            break;

        case 'delete_destinasi':
            $id = trim((string) ($input['id'] ?? $input['destinasi_id'] ?? $input['edit_id'] ?? ''));
            if ($id === '') {
                json_error('ID destinasi tidak valid.', 422);
            }

            $stmt = $pdo->prepare('SELECT id FROM destinasi WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $id]);
            if (!$stmt->fetch()) {
                json_error('Destinasi tidak ditemukan.', 404);
            }

            $stmt = $pdo->prepare('DELETE FROM destinasi WHERE id = :id');
            $stmt->execute([':id' => $id]);

            json_success(['id' => $id], 'Destinasi berhasil dihapus.');
            break;

        case 'list_penginapan':
            $stmt = $pdo->prepare('SELECT * FROM penginapan ORDER BY nama ASC');
            $stmt->execute();
            $data = array_map('admin_penginapan_payload', $stmt->fetchAll());
            json_success($data, 'Daftar penginapan berhasil dimuat.');
            break;

        case 'save_penginapan':
            $editId = trim((string) ($input['edit_id'] ?? $input['id'] ?? ''));

            $existing = [];
            if ($editId !== '') {
                $stmt = $pdo->prepare('SELECT * FROM penginapan WHERE id = :id LIMIT 1');
                $stmt->execute([':id' => $editId]);
                $existing = $stmt->fetch() ?: [];
                if ($existing === []) {
                    json_error('Penginapan tidak ditemukan.', 404);
                }
            }

            $field = static function (string $key, mixed $default = '') use ($input, $existing): mixed {
                if (array_key_exists($key, $input)) {
                    return $input[$key];
                }
                return array_key_exists($key, $existing) ? $existing[$key] : $default;
            };
            $nama   = trim((string) $field('nama'));
            $lokasi = trim((string) $field('lokasi'));
            if ($nama === '') {
                json_error('Nama penginapan wajib diisi.', 422);
            }
            if ($lokasi === '') {
                json_error('Lokasi penginapan wajib diisi.', 422);
            }

            $tipe = ucfirst(strtolower(trim((string) $field('tipe', 'Hotel'))));
            if (!in_array($tipe, ['Hotel', 'Resort', 'Homestay'], true)) {
                json_error('Tipe penginapan harus Hotel, Resort, atau Homestay.', 422);
            }

            $harga = filter_var(
                $field('harga', 0),
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 0]]
            );
            if ($harga === false) {
                json_error('Harga penginapan tidak valid.', 422);
            }
            $rating = filter_var($field('rating', 0), FILTER_VALIDATE_FLOAT);
            if ($rating === false || $rating < 0 || $rating > 5) {
                json_error('Rating tidak valid.', 422);
            }
            $ulasan = filter_var(
                $field('ulasan', 0),
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 0]]
            );
            if ($ulasan === false) {
                json_error('Jumlah ulasan tidak valid.', 422);
            }

            // fasilitas: array of objects {nama, ikon} sesuai skema/detail page.
            $fasilitas = [];
            foreach (admin_json_list_input($field('fasilitas', [])) as $item) {
                if (is_array($item)) {
                    $namaFas = trim((string) ($item['nama'] ?? ''));
                    $ikon    = trim((string) ($item['ikon'] ?? ''));
                    if ($namaFas === '') {
                        continue;
                    }
                    $fasilitas[] = [
                        'nama' => $namaFas,
                        'ikon' => $ikon !== '' ? $ikon : admin_slugify($namaFas),
                    ];
                } else {
                    $namaFas = trim((string) $item);
                    if ($namaFas !== '') {
                        $fasilitas[] = [
                            'nama' => $namaFas,
                            'ikon' => admin_slugify($namaFas),
                        ];
                    }
                }
            }

            $fasilitasDetail = admin_json_list_input($field('fasilitas_detail', []));
            $tips            = admin_json_list_input($field('tips', []));
            $kebijakan       = admin_json_list_input($field('kebijakan', []));
            $alias           = admin_json_list_input($field('alias', []));

            $slugDasar = $editId !== '' ? $editId : admin_slugify($nama);
            $id        = $editId !== ''
                ? $editId
                : admin_unique_slug($pdo, 'penginapan', $slugDasar);

            $gambar = admin_upload_gambar(
                admin_uploaded_file(['gambar', 'foto', 'image']),
                $slugDasar,
                admin_text($field('gambar'))
            );
            $gambarHero = admin_upload_gambar(
                admin_uploaded_file(['gambar_hero', 'hero']),
                $slugDasar,
                admin_text($field('gambar_hero'))
            );
            if ($gambarHero === '' && $editId === '' && $gambar !== '') {
                $gambarHero = $gambar;
            }

            /* Nilai default valid untuk kolom VARCHAR/TEXT dan kolom JSON. */
            $pulau         = admin_text($field('pulau'));
            $jarak         = admin_text($field('jarak'));
            $alamatLengkap = admin_text($field('alamat_lengkap'));
            $checkIn       = admin_text($field('check_in'));
            $checkOut      = admin_text($field('check_out'));
            $ratingLabel   = admin_text(
                $field('rating_label'),
                number_format($rating, 1, '.', '') . ' / 5.0'
            );
            $alt           = admin_text($field('alt'));
            $tentangJudul  = admin_text($field('tentang_judul'), 'Tentang ' . $nama);
            $deskripsi     = admin_text($field('deskripsi'));

            $params = [
                ':id'               => $id,
                ':alias'            => admin_json($alias),
                ':nama'             => $nama,
                ':lokasi'           => $lokasi,
                ':pulau'            => $pulau,
                ':tipe'             => $tipe,
                ':harga'            => $harga,
                ':rating'           => $rating,
                ':ulasan'           => $ulasan,
                ':jarak'            => $jarak,
                ':alamat_lengkap'   => $alamatLengkap,
                ':check_in'         => $checkIn,
                ':check_out'        => $checkOut,
                ':rating_label'     => $ratingLabel,
                ':gambar'           => $gambar,
                ':gambar_hero'      => $gambarHero,
                ':alt'              => $alt,
                ':tentang_judul'    => $tentangJudul,
                ':deskripsi'        => $deskripsi,
                ':fasilitas'        => admin_json($fasilitas),
                ':fasilitas_detail' => admin_json($fasilitasDetail),
                ':tips'             => admin_json($tips),
                ':kebijakan'        => admin_json($kebijakan),
            ];

            if ($editId === '') {
                $sql = 'INSERT INTO penginapan
                    (id, alias, nama, lokasi, pulau, tipe, harga, rating, ulasan, jarak,
                     alamat_lengkap, check_in, check_out, rating_label, gambar, gambar_hero,
                     alt, tentang_judul, deskripsi, fasilitas, fasilitas_detail, tips, kebijakan)
                    VALUES
                    (:id, :alias, :nama, :lokasi, :pulau, :tipe, :harga, :rating, :ulasan, :jarak,
                     :alamat_lengkap, :check_in, :check_out, :rating_label, :gambar, :gambar_hero,
                     :alt, :tentang_judul, :deskripsi, :fasilitas, :fasilitas_detail, :tips, :kebijakan)';
            } else {
                $sql = 'UPDATE penginapan SET
                    alias = :alias, nama = :nama, lokasi = :lokasi, pulau = :pulau, tipe = :tipe,
                    harga = :harga, rating = :rating, ulasan = :ulasan, jarak = :jarak,
                    alamat_lengkap = :alamat_lengkap, check_in = :check_in, check_out = :check_out,
                    rating_label = :rating_label, gambar = :gambar, gambar_hero = :gambar_hero,
                    alt = :alt, tentang_judul = :tentang_judul, deskripsi = :deskripsi,
                    fasilitas = :fasilitas, fasilitas_detail = :fasilitas_detail,
                    tips = :tips, kebijakan = :kebijakan
                    WHERE id = :id';
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            $stmt = $pdo->prepare('SELECT * FROM penginapan WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $id]);
            json_success(
                admin_penginapan_payload($stmt->fetch()),
                $editId === '' ? 'Penginapan berhasil ditambahkan.' : 'Penginapan berhasil diperbarui.'
            );
            break;

        case 'delete_penginapan':
            $id = trim((string) ($input['id'] ?? $input['penginapan_id'] ?? $input['edit_id'] ?? ''));
            if ($id === '') {
                json_error('ID penginapan tidak valid.', 422);
            }

            $stmt = $pdo->prepare('SELECT id FROM penginapan WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $id]);
            if (!$stmt->fetch()) {
                json_error('Penginapan tidak ditemukan.', 404);
            }

            $stmt = $pdo->prepare('DELETE FROM penginapan WHERE id = :id');
            $stmt->execute([':id' => $id]);

            json_success(['id' => $id], 'Penginapan berhasil dihapus.');
            break;
    }
} catch (PDOException $e) {
    error_log('[IndoTrip] Admin DB error: ' . $e->getMessage());
    // Detail driver disertakan agar panel admin dapat menampilkan pesan error
    // yang spesifik (mis. kolom yang gagal disimpan), bukan hanya pesan umum.
    $detail = (string) ($e->errorInfo()[2] ?? $e->getMessage());
    json_error('Gagal memproses data pada database.', 500, $detail);
}

json_error('Action tidak dikenal.', 400);
