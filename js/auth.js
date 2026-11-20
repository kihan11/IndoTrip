

(function () {
  "use strict";

  var API_URL = "api/auth.php";
  var LOGIN_URL = "login.html";
  var PROFILE_URL = "profile.html";
  var HOME_URL = "index.html";

  function apiRequest(action, payload) {
    var body = { action: action };
    if (payload) {
      Object.keys(payload).forEach(function (key) {
        body[key] = payload[key];
      });
    }

    return fetch(API_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (data) {
        if (!response.ok || !data || data.success !== true) {
          var message = (data && (data.error || data.message)) ||
            "Tidak dapat terhubung ke server. Silakan coba lagi.";
          var error = new Error(message);
          error.status = response.status;
          error.data = data;
          throw error;
        }
        return data.data;
      });
    }).catch(function (error) {
      if (error && error.name === "TypeError") {
        throw new Error("Tidak dapat terhubung ke server. Silakan coba lagi.");
      }
      throw error;
    });
  }

  function initials(name) {
    var parts = String(name || "Traveller IndoTrip")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "TI";
    var first = parts[0].charAt(0);
    var second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + second).toUpperCase();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = "auth-message auth-message--" + (type || "error");
    element.hidden = false;
  }

  function clearMessage(element) {
    if (!element) return;
    element.textContent = "";
    element.hidden = true;
  }

  function setBusy(button, busy) {
    if (button) button.disabled = busy;
  }

  function bindPasswordToggles() {
    var buttons = document.querySelectorAll(".js-toggle-password");
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        var wrapper = button.closest(".auth-input-icon");
        var input = wrapper ? wrapper.querySelector("input") : null;
        if (!input) return;

        var show = input.type === "password";
        input.type = show ? "text" : "password";
        button.setAttribute("aria-pressed", show ? "true" : "false");
        button.setAttribute("aria-label", show ? "Sembunyikan password" : "Tampilkan password");
        button.classList.toggle("is-visible", show);
      });
    });
  }

  function initLoginPage() {
    var form = document.getElementById("loginForm");
    if (!form) return;

    var emailInput = document.getElementById("loginEmail");
    var passwordInput = document.getElementById("loginPassword");
    var message = document.getElementById("loginMessage");
    var forgot = document.getElementById("forgotPassword");
    var submitBtn = form.querySelector('button[type="submit"]');

    if (forgot) {
      forgot.addEventListener("click", function (event) {
        event.preventDefault();
        showMessage(
          message,
          "Gunakan email dan password yang sudah kamu daftarkan. Belum punya akun? Daftar terlebih dahulu.",
          "info"
        );
        if (emailInput) emailInput.focus();
      });
    }

    [emailInput, passwordInput].forEach(function (input) {
      if (input) input.addEventListener("input", function () { clearMessage(message); });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearMessage(message);

      var email = emailInput ? emailInput.value.trim() : "";
      var password = passwordInput ? passwordInput.value : "";

      if (!email || !password) {
        showMessage(message, "Lengkapi email dan password terlebih dahulu.");
        return;
      }
      if (!isValidEmail(email)) {
        showMessage(message, "Format email tidak valid. Contoh: nama@email.com");
        return;
      }

      setBusy(submitBtn, true);
      apiRequest("login", { email: email, password: password })
        .then(function () {
          // Web user selalu ke profil. Panel admin punya alur login terpisah.
          window.location.href = PROFILE_URL;
        })
        .catch(function (error) {
          showMessage(message, error.message, "error");
          setBusy(submitBtn, false);
        });
    });
  }

  function initSignupPage() {
    var form = document.getElementById("signupForm");
    if (!form) return;

    var nameInput = document.getElementById("signupName");
    var emailInput = document.getElementById("signupEmail");
    var passwordInput = document.getElementById("signupPassword");
    var message = document.getElementById("signupMessage");
    var submitBtn = form.querySelector('button[type="submit"]');

    [nameInput, emailInput, passwordInput].forEach(function (input) {
      if (input) input.addEventListener("input", function () { clearMessage(message); });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearMessage(message);

      var name = nameInput ? nameInput.value.trim() : "";
      var email = emailInput ? emailInput.value.trim() : "";
      var password = passwordInput ? passwordInput.value : "";

      if (!name || !email || !password) {
        showMessage(message, "Lengkapi semua field terlebih dahulu.");
        return;
      }
      if (name.length < 2) {
        showMessage(message, "Nama lengkap minimal 2 karakter.");
        return;
      }
      if (!isValidEmail(email)) {
        showMessage(message, "Format email tidak valid. Contoh: nama@email.com");
        return;
      }
      if (password.length < 8) {
        showMessage(message, "Password minimal 8 karakter.");
        return;
      }

      setBusy(submitBtn, true);
      apiRequest("register", { name: name, email: email, password: password })
        .then(function () {
          window.location.href = PROFILE_URL;
        })
        .catch(function (error) {
          showMessage(message, error.message, "error");
          setBusy(submitBtn, false);
        });
    });
  }

  var WISHLIST_API = "api/wishlist.php";
  var PEMESANAN_API = "api/pemesanan.php";

  /** GET JSON API standar. 401 -> login.html. */
  function apiGet(url) {
    return fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (payload) {
        if (!response.ok || !payload || payload.success !== true) {
          var error = new Error((payload && (payload.error || payload.message)) || "Tidak dapat memuat data.");
          error.status = response.status;
          throw error;
        }
        return payload.data;
      });
    }).catch(function (error) {
      if (error && error.status === 401) window.location.replace(LOGIN_URL);
      throw error;
    });
  }

  /** POST JSON API standar. 401 -> login.html. */
  function apiPost(url, payload) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (data) {
        if (!response.ok || !data || data.success !== true) {
          var error = new Error((data && (data.error || data.message)) || "Tidak dapat memuat data.");
          error.status = response.status;
          throw error;
        }
        return data.data;
      });
    }).catch(function (error) {
      if (error && error.status === 401) window.location.replace(LOGIN_URL);
      throw error;
    });
  }

  /** POST multipart/form-data (upload file). 401 -> login.html. */
  function apiPostFormData(url, formData) {
    return fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Accept": "application/json" },
      body: formData
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (data) {
        if (!response.ok || !data || data.success !== true) {
          var error = new Error((data && (data.error || data.message)) || "Gagal mengirim data.");
          error.status = response.status;
          throw error;
        }
        return data.data;
      });
    }).catch(function (error) {
      if (error && error.status === 401) window.location.replace(LOGIN_URL);
      throw error;
    });
  }

  var WISH_PIN =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

  var WISH_HEART =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z"/></svg>';

  var WISH_TRASH =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7M10 11v6M14 11v6"/></svg>';

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var RIWAYAT_ICON =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2M4 12h16"/></svg>';

  function detailUrl(item) {
    var page = item.jenis === "penginapan" ? "detail-penginapan.html" : "detail-destinasi.html";
    return page + "?id=" + encodeURIComponent(item.item_id || item.id || "");
  }

  function formatRupiah(value) {
    return "Rp " + new Intl.NumberFormat("id-ID").format(Number(value) || 0);
  }

  function formatTanggal(value) {
    if (!value) return "—";
    var date = new Date(String(value).slice(0, 10) + "T00:00:00");
    if (isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric", month: "short", year: "numeric"
    }).format(date);
  }

  function emptyState(icon, title, text, href, label) {
    return '<div class="empty-state">' +
      '<div class="empty-icon">' + icon + '</div>' +
      '<h3>' + escapeHtml(title) + '</h3>' +
      '<p>' + escapeHtml(text) + '</p>' +
      '<a href="' + href + '" class="empty-cta">' + escapeHtml(label) + '</a>' +
    '</div>';
  }

  var riwayatItems = [];

  var ICON_BAYAR =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>';
  var ICON_STRUK =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-3.5-2-3.5 2-3.5-2L5 21V4a1 1 0 0 1 1-1Z"/><path d="M9 8h6M9 12h6"/></svg>';
  var ICON_UPLOAD =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';

  /** QRIS ilustratif (bukan kode asli) untuk keperluan tampilan instruksi. */
  function qrisSvg() {
    var n = 25, cell = 4, size = n * cell, rects = "";

    function finder(mx, my) {
      var ox = mx * cell, oy = my * cell;
      rects += '<rect x="' + ox + '" y="' + oy + '" width="' + (7 * cell) + '" height="' + (7 * cell) + '" rx="3" fill="#0F172B"/>';
      rects += '<rect x="' + (ox + cell) + '" y="' + (oy + cell) + '" width="' + (5 * cell) + '" height="' + (5 * cell) + '" rx="2" fill="#fff"/>';
      rects += '<rect x="' + (ox + 2 * cell) + '" y="' + (oy + 2 * cell) + '" width="' + (3 * cell) + '" height="' + (3 * cell) + '" rx="1" fill="#0F172B"/>';
    }
    finder(0, 0);
    finder(n - 7, 0);
    finder(0, n - 7);

    var seed = 20261120;
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue;
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        if (seed % 100 < 42) {
          rects += '<rect x="' + (x * cell) + '" y="' + (y * cell) + '" width="' + cell + '" height="' + cell + '" fill="#0F172B"/>';
        }
      }
    }
    return '<svg class="pay-qris-svg" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Kode QRIS">' +
      '<rect width="' + size + '" height="' + size + '" fill="#fff"/>' + rects + '</svg>';
  }

  var METODE_PEMBAYARAN = {
    transfer_bca: {
      label: "Transfer BCA",
      html:
        '<div class="pay-info-row"><span>Bank tujuan</span><strong>BCA</strong></div>' +
        '<div class="pay-info-row"><span>No. Rekening</span><strong class="pay-rek">123 456 7890</strong></div>' +
        '<div class="pay-info-row"><span>Atas nama</span><strong>PT IndoTrip Nusantara</strong></div>' +
        '<p class="pay-hint">Transfer sesuai total tagihan, lalu unggah bukti transfer di bawah ini.</p>'
    },
    qris: {
      label: "QRIS",
      html:
        '<div class="pay-qris-wrap">' + qrisSvg() + '</div>' +
        '<p class="pay-hint pay-hint--center">Scan QRIS menggunakan aplikasi pembayaran favoritmu, lalu unggah bukti pembayaran.</p>' +
        '<div class="pay-info-row"><span>Atas nama</span><strong>IndoTrip</strong></div>'
    },
    gopay_ovo: {
      label: "GoPay / OVO",
      html:
        '<div class="pay-info-row"><span>GoPay</span><strong>0812-0000-1234</strong></div>' +
        '<div class="pay-info-row"><span>OVO</span><strong>0855-0000-4567</strong></div>' +
        '<div class="pay-info-row"><span>Atas nama</span><strong>IndoTrip</strong></div>' +
        '<p class="pay-hint">Kirim dana sesuai total tagihan lewat aplikasi, lalu unggah bukti transaksi di bawah ini.</p>'
    }
  };

  /* Referensi elemen modal (diisi oleh initPaymentModals). */
  var bayarEl, strukEl, bayarForm, bayarPemesananId, bayarMetode, bayarInstruksi;
  var bayarSubtitle, bayarTotal, bayarBukti, bayarPreviewWrap, bayarPreview, bayarError, bayarSubmit;
  var strukContent, bayarModal = null, strukModal = null, payToastTimer = null;
  var bayarStatus = ""; // status pesanan saat modal pembayaran dibuka

  function findRiwayat(id) {
    for (var i = 0; i < riwayatItems.length; i++) {
      if (Number(riwayatItems[i].id) === Number(id)) return riwayatItems[i];
    }
    return null;
  }

  function showPayToast(text) {
    var toast = document.getElementById("payToast");
    var textEl = document.getElementById("payToastText");
    if (!toast) return;
    if (textEl) textEl.textContent = text;
    toast.hidden = false;
    window.requestAnimationFrame(function () { toast.classList.add("is-visible"); });
    if (payToastTimer) window.clearTimeout(payToastTimer);
    payToastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () { toast.hidden = true; }, 250);
    }, 3500);
  }

  function renderWishlist() {
    var container = document.getElementById("wishlistContent");
    if (!container) return;

    container.innerHTML = '<p class="loading-note">Memuat wishlist...</p>';

    apiGet(WISHLIST_API).then(function (items) {
      items = Array.isArray(items) ? items : [];

      if (!items.length) {
        container.innerHTML = emptyState(
          WISH_HEART,
          "Wishlist kamu masih kosong",
          "Simpan destinasi atau penginapan favoritmu, lalu temukan kembali di sini.",
          "destinasi.html",
          "Jelajahi Destinasi"
        );
        return;
      }

      container.innerHTML =
        '<div class="wishlist-grid">' +
          items.map(function (item) {
            var href = detailUrl(item);
            var nama = escapeHtml(item.nama || "Item wisata");
            var lokasi = escapeHtml(item.lokasi || "");
            var gambar = escapeHtml(item.gambar || "");
            var alt = escapeHtml(item.alt || item.nama || "");
            var label = item.jenis === "penginapan" ? "Penginapan" : "Destinasi";

            return (
              '<article class="wish-card" data-id="' + escapeHtml(item.item_id || item.id || "") +
                '" data-jenis="' + escapeHtml(item.jenis || "destinasi") + '">' +
                '<a href="' + href + '" class="wish-media"><img src="' + gambar +
                  '" alt="' + alt + '" loading="lazy" /></a>' +
                '<div class="wish-body">' +
                  '<span class="wish-label">' + label + '</span>' +
                  '<h3>' + nama + '</h3>' +
                  '<p class="wish-loc">' + WISH_PIN + '<span>' + lokasi + '</span></p>' +
                  '<div class="wish-actions">' +
                    '<a href="' + href + '" class="wish-detail">Lihat Detail</a>' +
                    '<button type="button" class="wish-remove" title="Hapus dari wishlist" aria-label="Hapus ' +
                      nama + ' dari wishlist">' + WISH_TRASH +
                    '</button>' +
                  '</div>' +
                '</div>' +
              '</article>'
            );
          }).join("") +
        '</div>';

      var removeButtons = container.querySelectorAll(".wish-remove");
      Array.prototype.forEach.call(removeButtons, function (button) {
        button.addEventListener("click", function () {
          var card = button.closest(".wish-card");
          var id = card ? card.getAttribute("data-id") : "";
          var jenis = card ? card.getAttribute("data-jenis") : "destinasi";
          if (button.disabled) return;

          button.disabled = true;
          apiPost(WISHLIST_API, { jenis: jenis, item_id: id })
            .then(function () { renderWishlist(); })
            .catch(function () { button.disabled = false; });
        });
      });
    }).catch(function (error) {
      if (error && error.status === 401) return; // sudah dialihkan ke login
      container.innerHTML = emptyState(
        WISH_HEART,
        "Gagal memuat wishlist",
        (error && error.message) || "Silakan coba lagi nanti.",
        "destinasi.html",
        "Jelajahi Destinasi"
      );
    });
  }

  function renderRiwayat() {
    var container = document.getElementById("riwayatContent");
    if (!container) return;

    container.innerHTML = '<p class="loading-note">Memuat riwayat pemesanan...</p>';

    apiGet(PEMESANAN_API).then(function (items) {
      items = Array.isArray(items) ? items : [];

      if (!items.length) {
        riwayatItems = [];
        container.innerHTML = emptyState(
          RIWAYAT_ICON,
          "Belum ada riwayat pemesanan",
          "Anda belum pernah memesan tiket wisata atau penginapan melalui IndoTrip.",
          "destinasi.html",
          "Cari Destinasi"
        );
        return;
      }

      riwayatItems = items;

      var statusLabel = {
        menunggu: "Menunggu pembayaran",
        menunggu_verifikasi: "Menunggu verifikasi",
        dibayar: "Dibayar",
        ditolak: "Ditolak",
        selesai: "Selesai",
        dibatalkan: "Dibatalkan"
      };
      var statusKeys = ["menunggu", "menunggu_verifikasi", "dibayar", "ditolak", "selesai", "dibatalkan"];

      container.innerHTML =
        '<div class="booking-list">' +
          items.map(function (item) {
            var statusKey = statusKeys.indexOf(item.status) !== -1 ? item.status : "menunggu";
            var status = statusLabel[statusKey];
            var satuan = item.jenis === "penginapan" ? "malam" : "orang";
            var tanggal = formatTanggal(item.tanggal_kunjungan);
            if (item.tanggal_selesai) {
              tanggal += " — " + formatTanggal(item.tanggal_selesai);
            }

            /* Catatan admin ditampilkan saat pemesanan ditolak. */
            var catatanAdmin = "";
            if (statusKey === "ditolak" && item.catatan_admin) {
              catatanAdmin =
                '<p class="booking-catatan"><strong>Catatan admin:</strong> ' +
                escapeHtml(item.catatan_admin) + '</p>';
            }

            var aksi = "";
            if (statusKey === "dibayar" || statusKey === "selesai") {
              aksi =
                '<button type="button" class="booking-action-btn booking-action-btn--struk js-struk" ' +
                  'data-id="' + escapeHtml(item.id) + '">' + ICON_STRUK + 'Lihat Struk / E-Tiket</button>';
            } else if (statusKey === "ditolak") {
              aksi =
                '<button type="button" class="booking-action-btn booking-action-btn--upload js-bayar" ' +
                  'data-id="' + escapeHtml(item.id) + '">' + ICON_UPLOAD + 'Upload Ulang Bukti</button>';
            } else if (statusKey === "menunggu") {
              aksi =
                '<button type="button" class="booking-action-btn booking-action-btn--pay js-bayar" ' +
                  'data-id="' + escapeHtml(item.id) + '">' + ICON_BAYAR + 'Bayar Sekarang</button>';
            } else if (statusKey === "menunggu_verifikasi") {
              aksi = '<span class="booking-action-note">Menunggu verifikasi admin</span>';
            }

            return (
              '<article class="booking-card">' +
                '<div class="booking-top">' +
                  '<span class="booking-jenis">' +
                    (item.jenis === "penginapan" ? "Penginapan" : "Destinasi") +
                  '</span>' +
                  '<span class="booking-status booking-status--' + statusKey + '">' +
                    escapeHtml(status) +
                  '</span>' +
                '</div>' +
                '<h3>' + escapeHtml(item.nama || "Pemesanan") + '</h3>' +
                '<p class="booking-loc">' + WISH_PIN + '<span>' + escapeHtml(item.lokasi || "") + '</span></p>' +
                '<div class="booking-meta">' +
                  '<span><strong>Kode</strong> ' + escapeHtml(item.kode_booking) + '</span>' +
                  '<span><strong>Tanggal</strong> ' + escapeHtml(tanggal) + '</span>' +
                  '<span><strong>Jumlah</strong> ' + (Number(item.jumlah) || 1) + ' ' + satuan + '</span>' +
                '</div>' +
                catatanAdmin +
                '<div class="booking-bottom">' +
                  '<strong class="booking-total">' + formatRupiah(item.total_harga) + '</strong>' +
                  '<a href="' + detailUrl(item) + '" class="wish-detail">Lihat Detail</a>' +
                '</div>' +
                (aksi ? '<div class="booking-actions">' + aksi + '</div>' : '') +
              '</article>'
            );
          }).join("") +
        '</div>';

      var bayarButtons = container.querySelectorAll(".js-bayar");
      Array.prototype.forEach.call(bayarButtons, function (button) {
        button.addEventListener("click", function () {
          var item = findRiwayat(button.getAttribute("data-id"));
          if (item) openBayar(item);
        });
      });

      var strukButtons = container.querySelectorAll(".js-struk");
      Array.prototype.forEach.call(strukButtons, function (button) {
        button.addEventListener("click", function () {
          var item = findRiwayat(button.getAttribute("data-id"));
          if (item) openStruk(item);
        });
      });
    }).catch(function (error) {
      if (error && error.status === 401) return; // sudah dialihkan ke login
      container.innerHTML = emptyState(
        RIWAYAT_ICON,
        "Gagal memuat riwayat",
        (error && error.message) || "Silakan coba lagi nanti.",
        "destinasi.html",
        "Cari Destinasi"
      );
    });
  }

  function renderInstruksi(metode) {
    if (!bayarInstruksi) return;
    var info = METODE_PEMBAYARAN[metode] || METODE_PEMBAYARAN.transfer_bca;
    bayarInstruksi.innerHTML = info.html;
  }

  function openBayar(item) {
    if (!bayarEl) return;
    bayarStatus = item.status || "";
    if (bayarForm) bayarForm.reset();
    if (bayarError) clearMessage(bayarError);

    if (bayarPemesananId) bayarPemesananId.value = String(item.id);
    if (bayarSubtitle) {
      bayarSubtitle.textContent =
        "Pemesanan " + (item.kode_booking || "") + " — " + (item.nama || "") +
        ". Selesaikan pembayaran untuk melanjutkan pemesananmu.";
    }
    if (bayarTotal) bayarTotal.textContent = formatRupiah(item.total_harga);

    /* Default: Transfer BCA. */
    var inputs = bayarEl.querySelectorAll('input[name="pay_method"]');
    Array.prototype.forEach.call(inputs, function (input) {
      input.checked = input.value === "transfer_bca";
      var label = input.closest(".pay-method");
      if (label) label.classList.toggle("is-active", input.checked);
    });
    if (bayarMetode) bayarMetode.value = "transfer_bca";
    renderInstruksi("transfer_bca");

    if (bayarBukti) bayarBukti.value = "";
    if (bayarPreview) {
      if (bayarPreview.src && bayarPreview.src.indexOf("blob:") === 0) {
        URL.revokeObjectURL(bayarPreview.src);
      }
      bayarPreview.removeAttribute("src");
    }
    if (bayarPreviewWrap) bayarPreviewWrap.hidden = true;

    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      bayarModal = bootstrap.Modal.getOrCreateInstance(bayarEl);
      bayarModal.show();
    } else {
      bayarEl.classList.add("show");
      bayarEl.style.display = "block";
    }
  }

  function closeBayar() {
    if (bayarModal) {
      bayarModal.hide();
    } else if (bayarEl) {
      bayarEl.classList.remove("show");
      bayarEl.style.display = "none";
    }
  }

  function openStruk(item) {
    if (!strukEl || !strukContent) return;

    var satuan = item.jenis === "penginapan" ? "malam" : "orang";
    var tanggal = formatTanggal(item.tanggal_kunjungan);
    if (item.tanggal_selesai) tanggal += " — " + formatTanggal(item.tanggal_selesai);
    var metode = Number(item.total_harga) === 0
      ? "Gratis"
      : ((METODE_PEMBAYARAN[item.metode_pembayaran] || {}).label || "Pembayaran online");

    function row(label, value) {
      return '<div class="struk-row"><span>' + escapeHtml(label) +
        '</span><strong>' + escapeHtml(value) + '</strong></div>';
    }

    strukContent.innerHTML =
      '<div class="struk-head">' +
        '<div class="struk-brand">' +
          '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
            '<circle cx="16" cy="16" r="12.4" stroke="currentColor" stroke-width="2.4"/>' +
            '<path d="M21.6 10.4 18.2 18.2 10.4 21.6 13.8 13.8 21.6 10.4Z" fill="currentColor"/>' +
          '</svg>' +
          '<span>Indo<span>Trip</span></span>' +
        '</div>' +
        '<span class="struk-lunas">LUNAS</span>' +
      '</div>' +
      '<h3 class="struk-judul">E-Tiket / Struk Pembayaran</h3>' +
      '<div class="struk-kode">Kode Booking<strong>' + escapeHtml(item.kode_booking) + '</strong></div>' +
      '<div class="struk-rows">' +
        row("Nama Item", item.nama || "-") +
        row("Jenis", item.jenis === "penginapan" ? "Penginapan" : "Destinasi / Kuliner") +
        row("Lokasi", item.lokasi || "-") +
        row("Tanggal", tanggal) +
        row("Jumlah", (Number(item.jumlah) || 1) + " " + satuan) +
        row("Metode Pembayaran", metode) +
        (item.dibayar_pada ? row("Dibayar Pada", formatTanggal(item.dibayar_pada)) : "") +
      '</div>' +
      '<div class="struk-total"><span>Total Dibayar</span><strong>' +
        formatRupiah(item.total_harga) + '</strong></div>' +
      '<p class="struk-footer">Tunjukkan kode booking ini kepada petugas saat pemeriksaan tiket.<br />' +
        'Terima kasih telah berwisata bersama IndoTrip.</p>';

    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      strukModal = bootstrap.Modal.getOrCreateInstance(strukEl);
      strukModal.show();
    } else {
      strukEl.classList.add("show");
      strukEl.style.display = "block";
    }
  }

  function initPaymentModals() {
    bayarEl = document.getElementById("bayarModal");
    strukEl = document.getElementById("strukModal");
    if (!bayarEl || !strukEl) return;

    bayarForm          = document.getElementById("bayarForm");
    bayarPemesananId   = document.getElementById("bayarPemesananId");
    bayarMetode        = document.getElementById("bayarMetode");
    bayarInstruksi     = document.getElementById("bayarInstruksi");
    bayarSubtitle      = document.getElementById("bayarSubtitle");
    bayarTotal         = document.getElementById("bayarTotal");
    bayarBukti         = document.getElementById("bayarBukti");
    bayarPreviewWrap   = document.getElementById("bayarPreviewWrap");
    bayarPreview       = document.getElementById("bayarPreview");
    bayarError         = document.getElementById("bayarError");
    bayarSubmit        = document.getElementById("bayarSubmit");
    strukContent       = document.getElementById("strukContent");

    /* Fallback penutup modal bila Bootstrap tidak tersedia. */
    [bayarEl, strukEl].forEach(function (el) {
      var dismissButtons = el.querySelectorAll('[data-bs-dismiss="modal"]');
      Array.prototype.forEach.call(dismissButtons, function (btn) {
        btn.addEventListener("click", function () {
          if (typeof bootstrap !== "undefined" && bootstrap.Modal) return;
          el.classList.remove("show");
          el.style.display = "none";
        });
      });
    });

    var methodInputs = bayarEl.querySelectorAll('input[name="pay_method"]');
    Array.prototype.forEach.call(methodInputs, function (input) {
      input.addEventListener("change", function () {
        Array.prototype.forEach.call(methodInputs, function (other) {
          var label = other.closest(".pay-method");
          if (label) label.classList.toggle("is-active", other.checked);
        });
        if (bayarMetode) bayarMetode.value = input.value;
        renderInstruksi(input.value);
      });
    });

    if (bayarBukti) {
      bayarBukti.addEventListener("change", function () {
        var file = bayarBukti.files && bayarBukti.files[0];
        clearMessage(bayarError);
        if (!file || !bayarPreview || !bayarPreviewWrap) return;
        if (bayarPreview.src && bayarPreview.src.indexOf("blob:") === 0) {
          URL.revokeObjectURL(bayarPreview.src);
        }
        bayarPreview.src = URL.createObjectURL(file);
        bayarPreviewWrap.hidden = false;
      });
    }

    if (bayarForm) {
      bayarForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearMessage(bayarError);

        var id = bayarPemesananId ? bayarPemesananId.value : "";
        var item = findRiwayat(id);
        var file = bayarBukti && bayarBukti.files ? bayarBukti.files[0] : null;

        if (!file) {
          showMessage(bayarError, "Pilih file bukti pembayaran terlebih dahulu.");
          return;
        }
        if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) === -1) {
          showMessage(bayarError, "Format bukti harus JPG, PNG, atau WebP.");
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          showMessage(bayarError, "Ukuran bukti pembayaran maksimal 2 MB.");
          return;
        }

        var data = new FormData();
        data.append("action", "upload_bukti");
        data.append("pemesanan_id", String(item ? item.id : id));
        data.append("metode_pembayaran", bayarMetode ? bayarMetode.value : "transfer_bca");
        data.append("bukti", file);

        setBusy(bayarSubmit, true);
        apiPostFormData(PEMESANAN_API, data)
          .then(function () {
            closeBayar();
            renderRiwayat();
            showPayToast(
              bayarStatus === "ditolak"
                ? "Bukti berhasil diunggah ulang. Menunggu verifikasi admin."
                : "Bukti pembayaran terkirim. Menunggu verifikasi admin."
            );
          })
          .catch(function (error) {
            if (error && error.status === 401) return; // sudah dialihkan ke login
            showMessage(bayarError, error.message, "error");
          })
          .then(function () {
            setBusy(bayarSubmit, false);
          });
      });
    }

    var printBtn = document.getElementById("strukPrint");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });
  }

  function initProfilePage() {
    var main = document.getElementById("profileMain");
    if (!main) return;

    var nameEl = document.getElementById("profileName");
    var emailEl = document.getElementById("profileEmail");
    var initialsEl = document.getElementById("profileInitials");

    var settingName = document.getElementById("settingName");
    var settingEmail = document.getElementById("settingEmail");
    var settingPhone = document.getElementById("settingPhone");
    var settingCity = document.getElementById("settingCity");
    var savedNote = document.getElementById("profileSaved");
    var profileError = document.getElementById("profileError");
    var settingsForm = document.getElementById("settingsForm");
    var saveBtn = settingsForm ? settingsForm.querySelector('button[type="submit"]') : null;

    var user = null;

    function applyUser(data) {
      user = data;
      if (nameEl) nameEl.textContent = data.name || "";
      if (emailEl) emailEl.textContent = data.email || "";
      if (initialsEl) initialsEl.textContent = initials(data.name);

      if (settingName) settingName.value = data.name || "";
      if (settingEmail) settingEmail.value = data.email || "";
      if (settingPhone) settingPhone.value = data.phone || "";
      if (settingCity) settingCity.value = data.city || "";
    }

    /* Tab menu */
    var tabs = document.querySelectorAll(".profile-tab");
    var panels = document.querySelectorAll(".profile-panel");

    function activateTab(name) {
      Array.prototype.forEach.call(tabs, function (item) {
        item.classList.toggle("is-active", item.getAttribute("data-tab") === name);
      });
      Array.prototype.forEach.call(panels, function (panel) {
        panel.hidden = panel.id !== "panel-" + name;
      });
    }

    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener("click", function () {
        activateTab(tab.getAttribute("data-tab"));
      });
    });

    /* Wishlist & riwayat pemesanan dari database */
    initPaymentModals();
    renderWishlist();
    renderRiwayat();

    /* Datang dari tautan profile.html#riwayat -> buka tab Riwayat otomatis. */
    function openTabFromHash() {
      if (window.location.hash === "#riwayat") {
        activateTab("riwayat");
        var panel = document.getElementById("panel-riwayat");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    openTabFromHash();
    window.addEventListener("hashchange", openTabFromHash);

    /* Hapus pesan error saat input diketik ulang. */
    [settingName, settingEmail, settingPhone, settingCity].forEach(function (input) {
      if (input) input.addEventListener("input", function () { clearMessage(profileError); });
    });

    /* Simpan perubahan profil ke database via API. */
    if (settingsForm) {
      settingsForm.addEventListener("submit", function (event) {
        event.preventDefault();
        clearMessage(profileError);
        if (savedNote) savedNote.hidden = true;

        var newName = settingName ? settingName.value.trim() : "";
        var newEmail = settingEmail ? settingEmail.value.trim() : "";
        if (!newName || !newEmail) {
          showMessage(profileError, "Lengkapi nama dan email terlebih dahulu.");
          if (!newName && settingName) settingName.focus();
          else if (settingEmail) settingEmail.focus();
          return;
        }
        if (!isValidEmail(newEmail)) {
          showMessage(profileError, "Format email tidak valid. Contoh: nama@email.com");
          if (settingEmail) settingEmail.focus();
          return;
        }

        setBusy(saveBtn, true);
        apiRequest("update_profile", {
          name: newName,
          email: newEmail,
          phone: settingPhone ? settingPhone.value.trim() : "",
          city: settingCity ? settingCity.value.trim() : ""
        }).then(function (data) {
          applyUser(data);
          if (savedNote) {
            savedNote.hidden = false;
            window.setTimeout(function () { savedNote.hidden = true; }, 4000);
          }
        }).catch(function (error) {
          showMessage(profileError, error.message, "error");
        }).then(function () {
          setBusy(saveBtn, false);
        });
      });
    }

    /* Modal konfirmasi logout */
    var logoutBtn = document.getElementById("logoutBtn");
    var cancelBtn = document.getElementById("cancelLogoutBtn");
    var confirmBtn = document.getElementById("confirmLogoutBtn");
    var loginAgainLink = document.getElementById("loginAgainLink");
    var redirectTimer = null;

    function openLogout() {
      main.setAttribute("data-modal", "logout");
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (confirmBtn) window.setTimeout(function () { confirmBtn.focus(); }, 0);
    }

    function closeLogout() {
      main.removeAttribute("data-modal");
      if (logoutBtn) logoutBtn.focus();
    }

    if (logoutBtn) logoutBtn.addEventListener("click", openLogout);
    if (cancelBtn) cancelBtn.addEventListener("click", closeLogout);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && main.getAttribute("data-modal") === "logout") {
        closeLogout();
      }
    });

    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        setBusy(confirmBtn, true);
        apiRequest("logout").catch(function () {
          /* Tetap lanjutkan alur UI Even jika server gagal merespons. */
        }).then(function () {
          setBusy(confirmBtn, false);
          main.setAttribute("data-modal", "success");
          window.scrollTo({ top: 0, behavior: "smooth" });
          redirectTimer = window.setTimeout(function () {
            window.location.href = HOME_URL;
          }, 2600);
        });
      });
    }

    if (loginAgainLink) {
      loginAgainLink.addEventListener("click", function () {
        if (redirectTimer) window.clearTimeout(redirectTimer);
      });
    }

    /* Ambil data user dari server. Jika belum login -> login.html. */
    apiRequest("me").then(function (data) {
      applyUser(data);
    }).catch(function (error) {
      if (error.status === 401) {
        window.location.replace(LOGIN_URL);
        return;
      }
      if (nameEl) nameEl.textContent = "Gagal memuat profil";
      if (emailEl) emailEl.textContent = error.message;
      showMessage(profileError, error.message, "error");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindPasswordToggles();
    initLoginPage();
    initSignupPage();
    initProfilePage();
  });
})();
