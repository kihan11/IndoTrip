-- ============================================================================
-- IndoTrip — Skema database + data awal (seed)
-- ----------------------------------------------------------------------------
-- Data awal   : 6 destinasi, 4 penginapan
-- Sumber form : signup.html / profile.html (users), kontak.html (pesan_kontak)
-- Akun demo   : traveller@indotrip.id  /  password123 (bcrypt, cost 12)
-- Akun admin  : admin@indotrip.id      /  admin123    (bcrypt, cost 12)
--
-- CATATAN: script ini akan MENGHAPUS tabel yang sudah ada lalu membuat ulang.
-- Jalankan dari root proyek:
--   mysql -u root -p < database.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `indotrip`
  CHARACTER SET utf8mb4

USE `indotrip`;

-- Amankan penghapusan agar urutan foreign key tidak bermasalah.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `pesan_kontak`;
DROP TABLE IF EXISTS `pemesanan`;
DROP TABLE IF EXISTS `wishlists`;
DROP TABLE IF EXISTS `penginapan`;
DROP TABLE IF EXISTS `destinasi`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. users — akun pengguna (signup.html + Pengaturan Akun di profile.html)
-- ----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id`               INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `nama`             VARCHAR(150)    NOT NULL                COMMENT 'Nama Lengkap',
  `email`            VARCHAR(191)    NOT NULL                COMMENT 'Email (unik, dipakai untuk login)',
  `password`         VARCHAR(255)    NOT NULL                COMMENT 'Hash bcrypt dari password',
  `telepon`          VARCHAR(30)     DEFAULT NULL            COMMENT 'Nomor Telepon',
  `domisili`         VARCHAR(150)    DEFAULT NULL            COMMENT 'Kota domisili',
  `role`             ENUM('user','admin') NOT NULL DEFAULT 'user',
  `dibuat_pada`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `diperbarui_pada`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Akun demo. password123 -> $2y$12$Pmj892KiQ7phUT8444tQX.ZOudI9CzmHrd7g5wmrvoQPstWzcmB3y
INSERT INTO `users` (`id`, `nama`, `email`, `password`, `telepon`, `domisili`, `role`)
VALUES (
  1,
  'Traveller IndoTrip',
  'traveller@indotrip.id',
  '$2y$12$Pmj892KiQ7phUT8444tQX.ZOudI9CzmHrd7g5wmrvoQPstWzcmB3y',
  '08123456789',
  'Jakarta',
  'user'
);

-- Akun admin. admin123 -> $2y$12$3v5Wny.ZXvozb1JouDVq4.YwT5sw0HQFLqyIIcB0auZ8ioUTz8l/K
INSERT INTO `users` (`id`, `nama`, `email`, `password`, `telepon`, `domisili`, `role`)
VALUES (
  2,
  'Admin IndoTrip',
  'admin@indotrip.id',
  '$2y$12$3v5Wny.ZXvozb1JouDVq4.YwT5sw0HQFLqyIIcB0auZ8ioUTz8l/K',
  NULL,
  NULL,
  'admin'
);

-- ----------------------------------------------------------------------------
-- 2. destinasi
--    Kolom array (alias, tipe, fasilitas, tips) disimpan sebagai JSON.
-- ----------------------------------------------------------------------------
CREATE TABLE `destinasi` (
  `id`              VARCHAR(100)    NOT NULL                COMMENT 'Slug, contoh: pantai-kuta (dipakai ?id=)',
  `alias`           JSON            DEFAULT NULL,
  `nama`            VARCHAR(200)    NOT NULL,
  `lokasi`          VARCHAR(200)    NOT NULL,
  `lokasi_lengkap`  VARCHAR(250)    DEFAULT NULL,
  `pulau`           VARCHAR(100)    DEFAULT NULL,
  `tipe`            JSON            DEFAULT NULL            COMMENT 'Array: ["Alam", "Pantai"]',
  `harga`           INT UNSIGNED    NOT NULL DEFAULT 0,
  `rating`          DECIMAL(2,1)    NOT NULL DEFAULT 0.0,
  `ulasan`          INT UNSIGNED    NOT NULL DEFAULT 0,
  `jam`             VARCHAR(100)    DEFAULT NULL,
  `jam_catatan`     VARCHAR(100)    DEFAULT NULL,
  `htm`             VARCHAR(100)    DEFAULT NULL,
  `htm_catatan`     VARCHAR(100)    DEFAULT NULL,
  `gambar`          VARCHAR(255)    DEFAULT NULL,
  `gambar_hero`     VARCHAR(255)    DEFAULT NULL,
  `alt`             TEXT            DEFAULT NULL,
  `deskripsi`       TEXT            DEFAULT NULL,
  `fasilitas`       JSON            DEFAULT NULL            COMMENT 'Array of string',
  `tips`            JSON            DEFAULT NULL            COMMENT 'Array of string',
  `dibuat_pada`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_destinasi_pulau` (`pulau`),
  KEY `idx_destinasi_nama` (`nama`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `destinasi`
  (`id`, `alias`, `nama`, `lokasi`, `lokasi_lengkap`, `pulau`, `tipe`, `harga`,
   `rating`, `ulasan`, `jam`, `jam_catatan`, `htm`, `htm_catatan`, `gambar`,
   `gambar_hero`, `alt`, `deskripsi`, `fasilitas`, `tips`)
VALUES
  (
    'pantai-kuta',
    '["kuta"]',
    'Pantai Kuta',
    'Badung, Bali',
    'Badung, Bali, Indonesia',
    'Bali',
    '["Alam", "Pantai"]',
    0,
    4.5, 20945,
    'Buka 24 Jam', 'Buka Setiap Hari',
    'Gratis', '/ orang',
    'assets/img/pantai-kuta-card.jpg',
    'assets/img/pantai-kuta-card.jpg',
    'Pantai Kuta dengan tebing karang dan air laut biru di Badung, Bali',
    'Pantai Kuta adalah destinasi pantai ikonik di Bali yang terkenal dengan pasir putih, ombak yang cocok untuk berselancar, dan pemandangan matahari terbenam yang memukau. Kawasan ini dipenuhi hotel, kafe, serta spot hangout yang ramai sepanjang hari.',
    '["Area Parkir", "Toilet Umum", "Penyewaan Papan Selancar", "Kafe & Restoran", "Payung Pantai"]',
    '["Datang saat senja untuk menikmati sunset yang terkenal di Kuta.", "Gunakan tabir surya karena matahari cukup terik di siang hari.", "Berhati-hatilah dengan ombak jika berenang dan ikuti petunjuk penjaga pantai."]'
  ),
  (
    'candi-borobudur',
    '["borobudur"]',
    'Candi Borobudur',
    'Magelang, Jawa',
    'Magelang, Jawa, Indonesia',
    'Jawa',
    '["Budaya"]',
    50000,
    4.7, 102525,
    '09:00 - 17:00', 'Buka Sekarang',
    'Rp 50.000', '/ orang',
    'assets/img/candi-borobudur-card.jpg',
    'assets/img/candi-borobudur-card.jpg',
    'Candi Borobudur dengan stupa dan patung Buddha di Magelang, Jawa Tengah',
    'Candi Buddha terbesar di dunia yang dibangun pada abad ke-9. Monumen ini terdiri dari sembilan teras bertingkat dan sebuah kubah utama di tengahnya. Menawarkan pemandangan relief yang luar biasa detail menceritakan ajaran Buddha.',
    '["Area Parkir Luas", "Pusat Informasi", "Toilet Bersih", "Toko Souvenir", "Penyewaan Payung"]',
    '["Gunakan pakaian yang sopan (tersedia kain penutup di pintu masuk).", "Waktu terbaik adalah pagi hari saat masih sejuk.", "Sewa pemandu lokal untuk penjelasan sejarah yang lebih mendalam."]'
  ),
  (
    'taman-nasional-komodo',
    '["komodo"]',
    'Taman Nasional Komodo',
    'Manggarai Barat, Nusa Tenggara',
    'Manggarai Barat, Nusa Tenggara, Indonesia',
    'Nusa Tenggara',
    '["Alam", "Pantai"]',
    150000,
    4.6, 7131,
    '07:00 - 16:00', 'Buka Sekarang',
    'Rp 150.000', '/ orang',
    'assets/img/komodo-card.jpg',
    'assets/img/komodo-card.jpg',
    'Komodo di antara bebatuan Taman Nasional Komodo, Flores',
    'Taman Nasional Komodo menyimpan satwa legendaris Komodo serta lanskap pulau yang menakjubkan. Selain trekking bersama pemandu, pengunjung bisa menikmati pantai pink, snorkeling, dan pemandangan dari puncak Bukit Padar.',
    '["Pemandu Lokal", "Dermaga Kapal", "Toilet", "Pusat Informasi", "Area Camping"]',
    '["Pesan tiket dan kapal jauh-jauh hari, terutama saat musim liburan.", "Ikuti instruksi pemandu dan jangan mendekati Komodo tanpa pengawasan.", "Bawa air minum dan alas kaki yang nyaman untuk trekking."]'
  ),
  (
    'gunung-bromo',
    '["bromo"]',
    'Gunung Bromo',
    'Probolinggo, Jawa',
    'Probolinggo, Jawa, Indonesia',
    'Jawa',
    '["Alam"]',
    60000,
    4.7, 13399,
    '00:00 - 17:00', 'Buka Sekarang',
    'Rp 60.000 - 70.000', '/ orang',
    'assets/img/bromo-card.jpg',
    'assets/img/hero-bromo.jpg',
    'Pemandangan Gunung Bromo dan lautan pasir di Probolinggo, Jawa Timur',
    'Gunung berapi aktif dengan pemandangan sunrise yang spektakuler. Dikelilingi oleh lautan pasir luas dan kawah yang terus mengepulkan asap. Tempat magis yang tak terlupakan.',
    '["Penyewaan Jeep", "Toilet", "Warung Kopi", "Sewa Kuda", "Area Kemah"]',
    '["Sewa Jeep jauh-jauh hari terutama saat musim liburan.", "Gunakan jaket tebal karena suhu sangat dingin di pagi hari.", "Mulai mendaki Penanjakan jam 3 pagi untuk spot sunrise terbaik."]'
  ),
  (
    'piaynemo',
    '["raja-ampat"]',
    'Piaynemo',
    'Raja Ampat Regency, Papua Barat',
    'Raja Ampat Regency, Papua Barat, Indonesia',
    'Papua',
    '["Alam", "Pantai"]',
    500000,
    4.9, 2261,
    '10:00 - 17:00 WIT', 'Buka Sekarang',
    'Rp 500.000', '/ orang',
    'assets/img/raja-ampat-card.jpg',
    'assets/img/raja-ampat-card.jpg',
    'Lanskap pulau karang Piaynemo di Raja Ampat, Papua Barat',
    'Piaynemo adalah surga tersembunyi di Raja Ampat yang terkenal dengan gugusan pulau karang, air laut jernih berwarna turquoise, dan panorama dari titik pandang di puncak bukit. Tempat ini menjadi favorit untuk snorkeling dan fotografi.',
    '["Dermaga Kapal", "Pemandu Lokal", "Area Snorkeling", "Toilet", "Spot Foto"]',
    '["Datang pagi agar cuaca lebih cerah dan air lebih jernih.", "Sewa kapal dari Waisai lebih awal karena harga bisa dinegosiasi.", "Jaga kebersihan dan jangan menyentuh terumbu karang saat snorkeling."]'
  ),
  (
    'gudeg-wijilan',
    '["gudeg"]',
    'Gudeg Wijilan Bu Hj. Rini',
    'Yogyakarta, Jawa',
    'Yogyakarta, Jawa, Indonesia',
    'Jawa',
    '["Kuliner"]',
    25000,
    4.6, 18400,
    'Buka 24 Jam', 'Buka Setiap Hari',
    'Rp 25.000', '/ porsi',
    'assets/img/gudeg-wijilan-card.jpg',
    'assets/img/gudeg-wijilan-card.jpg',
    'Sepiring gudeg dengan nasi, ayam, dan sambal krecek khas Yogyakarta',
    'Gudeg Wijilan Bu Hj. Rini menyajikan gudeg khas Yogyakarta yang dimasak perlahan dengan daun jati sehingga manis dan empuk. Disajikan bersama nasi, ayam opor, telur, dan sambal krecek yang menggoda selera.',
    '["Area Makan", "Take Away", "Toilet", "Parkir Motor", "Menu Vegetarian"]',
    '["Datang sebelum jam 10 pagi untuk menghindari antrean.", "Tambahkan sambal krecek agar cita rasa lebih autentik.", "Porsi gudeg bisa dibawa pulang sebagai oleh-oleh."]'
  );

-- ----------------------------------------------------------------------------
-- 3. penginapan
--    (Resort/Hotel/Homestay), sedangkan `tipe` destinasi berupa array.
--    `fasilitas` di sini adalah array of objects {nama, ikon} -> JSON.
-- ----------------------------------------------------------------------------
CREATE TABLE `penginapan` (
  `id`               VARCHAR(100)    NOT NULL,
  `alias`            JSON            DEFAULT NULL,
  `nama`             VARCHAR(200)    NOT NULL,
  `lokasi`           VARCHAR(200)    NOT NULL,
  `pulau`            VARCHAR(100)    DEFAULT NULL,
  `tipe`             VARCHAR(50)     DEFAULT NULL            COMMENT 'Resort / Hotel / Homestay',
  `harga`            INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT 'Harga per malam (Rp)',
  `rating`           DECIMAL(2,1)    NOT NULL DEFAULT 0.0,
  `ulasan`           INT UNSIGNED    NOT NULL DEFAULT 0,
  `jarak`            VARCHAR(150)    DEFAULT NULL,
  `alamat_lengkap`   VARCHAR(300)    DEFAULT NULL,
  `check_in`         VARCHAR(10)     DEFAULT NULL,
  `check_out`        VARCHAR(10)     DEFAULT NULL,
  `rating_label`     VARCHAR(50)     DEFAULT NULL,
  `gambar`           VARCHAR(255)    DEFAULT NULL,
  `gambar_hero`      VARCHAR(255)    DEFAULT NULL,
  `alt`              TEXT            DEFAULT NULL,
  `tentang_judul`    VARCHAR(200)    DEFAULT NULL,
  `deskripsi`        TEXT            DEFAULT NULL,
  `fasilitas`        JSON            DEFAULT NULL            COMMENT 'Array of objects berisi nama + ikon',
  `fasilitas_detail` JSON            DEFAULT NULL            COMMENT 'Array of string',
  `tips`             JSON            DEFAULT NULL,
  `kebijakan`        JSON            DEFAULT NULL,
  `dibuat_pada`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_penginapan_pulau` (`pulau`),
  KEY `idx_penginapan_tipe` (`tipe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `penginapan`
  (`id`, `alias`, `nama`, `lokasi`, `pulau`, `tipe`, `harga`, `rating`, `ulasan`,
   `jarak`, `alamat_lengkap`, `check_in`, `check_out`, `rating_label`, `gambar`,
   `gambar_hero`, `alt`, `tentang_judul`, `deskripsi`, `fasilitas`,
   `fasilitas_detail`, `tips`, `kebijakan`)
VALUES
  (
    'kuta-beach-garden-resort',
    '["resort", "resort-kuta", "kuta-resort"]',
    'Kuta Beach Garden Resort',
    'Badung, Bali', 'Bali', 'Resort', 1200000, 4.4, 1921,
    '0.5 km dari Pantai Kuta',
    'Jl. Dewi Sartika, Kuta, Kec. Kuta, Kabupaten Badung, Bali 80361',
    '15:00', '10:00', '4.4 / 5.0',
    'assets/img/resort-kuta-card.jpg',
    'assets/img/resort-kuta-card.jpg',
    'Kolam renang dan area lounge Kuta Beach Garden Resort di Badung, Bali',
    'Tentang Kuta Beach Garden Resort',
    'Nikmati pengalaman menginap mewah di tengah resort tropis yang indah, hanya 500 meter berjalan kaki dari bibir Pantai Kuta yang ikonik. Kuta Beach Garden Resort menawarkan kolam renang infinity bergaya Bali, restoran open-air dengan pemandangan taman hijau, serta layanan spa tradisional Bali untuk memulihkan energi perjalananmu. Kamar-kamar dirancang dengan sentuhan budaya lokal yang hangat — anyaman bambu, patung kayu alami, dan aroma frangipani menyambut setiap tamu.',
    '[{"nama":"WiFi","ikon":"wifi"}, {"nama":"AC","ikon":"ac"}, {"nama":"Kolam Renang","ikon":"kolam"}, {"nama":"Sarapan","ikon":"sarapan"}]',
    '["WiFi", "AC", "Kolam Renang", "Sarapan", "Spa", "Parkir Gratis", "Bar & Resto", "Layanan 24 Jam", "Antar Jemput Bandara", "Kamar Bebas Rokok"]',
    '["Pesan kamar Superior Pool View untuk pemandangan kolam renang langsung dari balkon.", "Minta layanan antar-jemput bandara saat booking untuk menghemat waktu.", "Spa Bali paling ramai sore hari — book treatment pagi hari untuk suasana lebih tenang.", "Sarapan prasmanan tersedia mulai pukul 07:00 — jangan dilewatkan, pilihan makanan lokal sangat beragam."]',
    '["Check-in mulai pukul 15:00, check-out maksimal pukul 10:00", "Pembatalan gratis hingga 48 jam sebelum kedatangan", "Hewan peliharaan tidak diperbolehkan", "Dilarang merokok di dalam kamar", "Deposit kamar Rp 500.000 (dikembalikan saat check-out)"]'
  ),
  (
    'boedi-borobudur-boutique-hotel',
    '["hotel-borobudur", "borobudur-hotel"]',
    'Boedi Borobudur Boutique Hotel',
    'Magelang, Jawa', 'Jawa', 'Hotel', 400000, 4.6, 485,
    '4 km dari Candi Borobudur',
    'Tinggal Wetan, Dusun 1, Wanurejo, Kec. Borobudur, Kabupaten Magelang, Jawa Tengah 56553',
    '14:00', '12:00', '4.6 / 5.0',
    'assets/img/hotel-borobudur-card.jpg',
    'assets/img/hotel-borobudur-card.jpg',
    'Lobi hangat Boedi Borobudur Boutique Hotel di Magelang, Jawa',
    'Tentang Boedi Borobudur Boutique Hotel',
    'Boedi Borobudur Boutique Hotel adalah hotel butik yang menyatu dengan lingkungan desa tradisional di kaki Candi Borobudur. Dikelola oleh keluarga lokal, hotel ini memberikan pengalaman autentik kehidupan desa Jawa — sarapan dengan nasi gudeg hangat, sepeda untuk mengelilingi sawah, dan suasana sunyi yang jauh dari keramaian. Bangunan kayu jati dan bambu dengan sentuhan modern yang hangat menjadikannya pilihan ideal untuk menginap dekat Candi Borobudur.',
    '[{"nama":"WiFi","ikon":"wifi"}, {"nama":"Kipas Angin","ikon":"kipas"}, {"nama":"Sarapan Lokal","ikon":"sarapan"}, {"nama":"Penyewaan Sepeda","ikon":"sepeda"}]',
    '["WiFi", "Kipas Angin", "Sarapan Lokal", "Penyewaan Sepeda", "Area Bersama", "Dapur Bersama", "Taman", "Laundry", "Parkir Motor"]',
    '["Sewa sepeda hotel untuk sunrise ride ke Candi Borobudur — hanya 15 menit bersepeda.", "Pesan sarapan lokal dari malam sebelumnya agar tersedia tepat waktu pagi hari.", "Bawa obat nyamuk dan jaket tipis karena malam di Magelang bisa cukup dingin.", "Tanya pemilik hotel untuk rekomendasi warung makan warga lokal di sekitar area."]',
    '["Check-in mulai pukul 14:00, check-out maksimal pukul 12:00", "Pembatalan gratis hingga 24 jam sebelum kedatangan", "Hewan peliharaan tidak diperbolehkan", "Harap jaga ketenangan setelah pukul 22:00", "Dilarang membawa minuman beralkohol"]'
  ),
  (
    'bromo-view-hotel',
    '["hotel-bromo", "bromo-hotel"]',
    'Bromo View Hotel',
    'Probolinggo, Jawa', 'Jawa', 'Hotel', 400000, 4.1, 1718,
    '40 km dari Gunung Bromo',
    'Jl. Raya Bromo No.Km, RW.05, Triwing Lor, Kec. Kademangan, Kota Probolinggo, Jawa Timur 67223',
    '14:00', '12:00', '4.1 / 5.0',
    'assets/img/hotel-bromo-card.jpg',
    'assets/img/hotel-bromo-card.jpg',
    'Tampak depan Bromo View Hotel yang menyala di malam hari di Probolinggo, Jawa',
    'Tentang Bromo View Hotel',
    'Bromo View Hotel adalah hotel sederhana namun hangat di tepian lautan pasir Bromo, menawarkan pemandangan kawah langsung dari beranda kamar. Hotel ini menjadi favorit pendaki yang ingin mengejar sunrise tanpa harus bangun dini di tempat lain. Kamar dilengkapi air panas, selimut tebal, dan ruang perapian bersama untuk menghangatkan diri setelah trekking. Paket jeep sunrise dan pemandu lokal tersedia langsung melalui pihak hotel.',
    '[{"nama":"Air Panas","ikon":"airPanas"}, {"nama":"Selimut Ekstra","ikon":"selimut"}, {"nama":"Sarapan","ikon":"sarapan"}, {"nama":"Layanan Tur","ikon":"tur"}]',
    '["Air Panas", "Selimut Ekstra", "Sarapan", "Layanan Tur", "Parkir Jeep", "Ruang Perapian", "Pemandu Lokal", "Penyewaan Jaket"]',
    '["Pesan paket jeep sunrise saat booking — slot sangat terbatas terutama musim liburan.", "Bawa baju berlapis karena suhu Bromo bisa turun hingga 5°C di malam hari.", "Hotel menyediakan sewa jaket gunung dan syal tebal dengan harga terjangkau.", "Minta bangun jam 03:00 untuk bersiap ke Penanjakan — sunrise terbaik sekitar pukul 05:30."]',
    '["Check-in mulai pukul 14:00, check-out maksimal pukul 12:00", "Pembatalan gratis hingga 72 jam sebelum kedatangan", "Hewan peliharaan tidak diperbolehkan", "Anak di bawah 12 tahun gratis (berbagi tempat tidur dengan orang tua)", "Pembayaran tunai atau transfer bank (belum menerima kartu kredit)"]'
  ),
  (
    'piaynemo-homestay',
    '["homestay-piaynemo", "homestay-raja-ampat", "raja-ampat-homestay"]',
    'Piaynemo Homestay',
    'Raja Ampat Regency, Papua Barat', 'Papua', 'Homestay', 650000, 4.7, 312,
    '1.2 km dari Piaynemo',
    'Kampung Yembuba, Distrik Waisai, Raja Ampat Regency, Papua Barat 98492',
    '14:00', '11:00', '4.7 / 5.0',
    'assets/img/raja-ampat-card.jpg',
    'assets/img/raja-ampat-card.jpg',
    'Homestay tepi laut dengan pemandangan pulau karang dekat Piaynemo di Raja Ampat, Papua Barat',
    'Tentang Piaynemo Homestay',
    'Piaynemo Homestay adalah akomodasi dikelola keluarga lokal yang berdiri di tepi kampung nelayan, hanya beberapa menit perjalanan dari titik pandang Piaynemo. Dari teras kayu, kamu bisa menyaksikan gugusan pulau karang dan air laut turquoise khas Raja Ampat. Suasana tenang, sarapan ikan bakar dan sagu, serta pemandu lokal siap menemani snorkeling menjadikan tempat ini pilihan nyaman untuk menjelajah Papua Barat.',
    '[{"nama":"WiFi","ikon":"wifi"}, {"nama":"Kipas Angin","ikon":"kipas"}, {"nama":"Sarapan Lokal","ikon":"sarapan"}, {"nama":"Pemandu Snorkeling","ikon":"tur"}]',
    '["WiFi", "Kipas Angin", "Sarapan Lokal", "Pemandu Snorkeling", "Teras Pemandangan", "Dapur Bersama", "Parkir Perahu", "Air Minum Isi Ulang"]',
    '["Pesan homestay jauh-jauh hari karena jumlah kamar sangat terbatas.", "Tanyakan jadwal kapal ke Piaynemo kepada pemilik homestay agar tidak kehabisan slot.", "Bawa alas kaki air dan jaket pelampung sendiri untuk kenyamanan snorkeling.", "Nikmati sarapan lokal — ikan bakar dan sagu adalah menu andalan keluarga pemilik."]',
    '["Check-in mulai pukul 14:00, check-out maksimal pukul 11:00", "Pembatalan gratis hingga 48 jam sebelum kedatangan", "Hewan peliharaan tidak diperbolehkan", "Harap jaga ketenangan setelah pukul 22:00", "Pembayaran tunai atau transfer bank (belum menerima kartu kredit)"]'
  );

-- ----------------------------------------------------------------------------
-- 4. wishlists — Wishlist Saya (profile.html)
--    Polymorphic: tepat salah satu dari destinasi_id / penginapan_id diisi.
-- ----------------------------------------------------------------------------
CREATE TABLE `wishlists` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED  NOT NULL,
  `destinasi_id`   VARCHAR(100)  DEFAULT NULL,
  `penginapan_id`  VARCHAR(100)  DEFAULT NULL,
  `dibuat_pada`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlist_destinasi` (`user_id`, `destinasi_id`),
  UNIQUE KEY `uq_wishlist_penginapan` (`user_id`, `penginapan_id`),
  CONSTRAINT `fk_wishlist_user`      FOREIGN KEY (`user_id`)       REFERENCES `users`(`id`)       ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_destinasi` FOREIGN KEY (`destinasi_id`)  REFERENCES `destinasi`(`id`)  ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_penginapan` FOREIGN KEY (`penginapan_id`) REFERENCES `penginapan`(`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_wishlist_item` CHECK (
    (`destinasi_id` IS NOT NULL AND `penginapan_id` IS NULL)
    OR (`destinasi_id` IS NULL AND `penginapan_id` IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. pemesanan — Riwayat Pemesanan (profile.html)
-- ----------------------------------------------------------------------------
CREATE TABLE `pemesanan` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `kode_booking`      VARCHAR(30)   NOT NULL                COMMENT 'Contoh: IT-20261120-0001',
  `user_id`           INT UNSIGNED  NOT NULL,
  `destinasi_id`      VARCHAR(100)  DEFAULT NULL,
  `penginapan_id`     VARCHAR(100)  DEFAULT NULL,
  `tanggal_mulai`     DATE          NOT NULL,
  `tanggal_selesai`   DATE          DEFAULT NULL,
  `jumlah_peserta`    TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `total_harga`       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status`            ENUM('menunggu','menunggu_verifikasi','dibayar','ditolak','selesai','dibatalkan') NOT NULL DEFAULT 'menunggu',
  `catatan`           TEXT          DEFAULT NULL,
  `metode_pembayaran` VARCHAR(50)   DEFAULT NULL           COMMENT 'Contoh: transfer_bank, e_wallet, tunai',
  `bukti_pembayaran`  VARCHAR(255)  DEFAULT NULL           COMMENT 'Path file bukti transfer',
  `catatan_admin`     TEXT          DEFAULT NULL,
  `dibayar_pada`      TIMESTAMP     NULL DEFAULT NULL,
  `dibuat_pada`       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `diperbarui_pada`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pemesanan_kode` (`kode_booking`),
  KEY `idx_pemesanan_user` (`user_id`),
  CONSTRAINT `fk_pemesanan_user`       FOREIGN KEY (`user_id`)       REFERENCES `users`(`id`)       ON DELETE CASCADE,
  CONSTRAINT `fk_pemesanan_destinasi`  FOREIGN KEY (`destinasi_id`)  REFERENCES `destinasi`(`id`)  ON DELETE SET NULL,
  CONSTRAINT `fk_pemesanan_penginapan` FOREIGN KEY (`penginapan_id`) REFERENCES `penginapan`(`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_pemesanan_item` CHECK (
    (`destinasi_id` IS NOT NULL AND `penginapan_id` IS NULL)
    OR (`destinasi_id` IS NULL AND `penginapan_id` IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. pesan_kontak — Formulir "Kirim Pesan" (kontak.html)
--    Field wajib form: nama, email, subjek, pesan.
-- ----------------------------------------------------------------------------
CREATE TABLE `pesan_kontak` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED  DEFAULT NULL              COMMENT 'NULL jika pengirim bukan member',
  `nama`         VARCHAR(150)  NOT NULL,
  `email`        VARCHAR(191)  NOT NULL,
  `subjek`       VARCHAR(200)  NOT NULL,
  `pesan`        TEXT          NOT NULL,
  `status`       ENUM('baru','dibaca','dibalas') NOT NULL DEFAULT 'baru',
  `dibuat_pada`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pesan_kontak_status` (`status`),
  KEY `idx_pesan_kontak_email` (`email`),
  CONSTRAINT `fk_pesan_kontak_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Selesai. Total seed: 6 destinasi, 4 penginapan, 1 akun demo, 1 akun admin.
-- ============================================================================
