# IndoTrip

IndoTrip adalah platform panduan wisata Nusantara berbasis web. Pengguna dapat menjelajahi destinasi dan penginapan, menyimpan wishlist, memesan tiket, serta mengunggah bukti pembayaran. Panel admin digunakan untuk memverifikasi pembayaran dan mengelola konten serta pesan masuk.

## Fitur Utama

### User
- Menjelajahi dan mencari destinasi serta penginapan berdasarkan kata kunci, tipe, dan pulau
- Melihat detail destinasi/penginapan, fasilitas, harga, dan lokasi
- Mendaftar, masuk, dan mengelola profil
- Menyimpan dan menghapus wishlist
- Memesan tiket atau penginapan, mengunggah bukti pembayaran, dan melihat riwayat serta struk
- Mengirim pesan melalui halaman kontak

### Admin
- Memverifikasi pembayaran (menyetujui atau menolak dengan catatan)
- Mengelola destinasi, kuliner, dan penginapan (tambah, ubah, hapus)
- Mengelola pesan kontak (dibaca, dibalas)
- Melihat ringkasan statistik pada dashboard

## Stack Teknologi

- PHP Native dengan PDO
- MySQL
- Bootstrap 5
- Vanilla JavaScript
- HTML5 dan CSS3

## Instalasi Lokal di Laragon

1. Pastikan Laragon terinstal dengan PHP 8 dan MySQL/MariaDB, lalu jalankan **Start All**.
2. Letakkan folder proyek di direktori `www` Laragon, misalnya `C:\laragon\www\travel`.
3. Buat database `indotrip` melalui phpMyAdmin di `http://localhost/phpmyadmin`, lalu import `database.sql`.
4. Sesuaikan kredensial database di `config/db.php` bila berbeda dari pengaturan default Laragon. Nilai dapat diatur lewat variabel lingkungan `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, dan `DB_PASS`. Secara default aplikasi memakai `localhost`, `3306`, `indotrip`, `root`, dan password kosong.
5. Pastikan folder `uploads/bukti/` dapat ditulis oleh web server agar bukti pembayaran bisa diunggah.
6. Buka situs di `http://travel.test` (atau host virtual sesuai nama folder Anda).

Akun demo tersedia di `database.sql`:

- User: `traveller@indotrip.id` / `password123`
- Admin: `admin@indotrip.id` / `admin123`

Halaman admin dapat diakses melalui `admin-login.html`.
