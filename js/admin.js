

(function () {
  "use strict";

  var AUTH_API = "api/auth.php";
  var ADMIN_API = "api/admin.php";
  var LOGIN_URL = "admin-login.html";
  var HOME_URL = "index.html";

  var STATUS_PEMESANAN = {
    menunggu: "Menunggu pembayaran",
    menunggu_verifikasi: "Menunggu verifikasi",
    dibayar: "Dibayar",
    ditolak: "Ditolak",
    selesai: "Selesai",
    dibatalkan: "Dibatalkan"
  };

  var STATUS_KONTAK = {
    baru: "Baru",
    dibaca: "Dibaca",
    dibalas: "Dibalas"
  };

  var METODE = {
    transfer_bca: "Transfer BCA",
    qris: "QRIS",
    gopay_ovo: "GoPay / OVO"
  };

  var TIPE_DESTINASI = {
    Alam: "tipe-alam",
    Budaya: "tipe-budaya",
    Pantai: "tipe-pantai",
    Kuliner: "tipe-kuliner"
  };

  var TIPE_PENGINAPAN = {
    Hotel: "tipe-hotel",
    Resort: "tipe-resort",
    Homestay: "tipe-homestay"
  };

  var FOTO_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />' +
    '</svg>';

  var state = {
    user: null,
    pemesanan: [],
    kontak: [],
    destinasi: [],
    penginapan: [],
    selectedPemesanan: null,
    selectedDelete: null,
    toastTimer: null
  };

  var el = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function formatWaktu(value) {
    if (!value) return "—";
    var date = new Date(String(value).replace(" ", "T"));
    if (isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    }).format(date);
  }

  function setBusy(button, busy) {
    if (button) button.disabled = busy;
  }

  function redirectToLogin() {
    window.location.replace(LOGIN_URL);
  }

  function fotoThumbnail(foto, nama) {
    var src = typeof foto === "string" ? foto.trim() : "";
    if (!src) {
      return '<span class="admin-thumb admin-thumb--empty" aria-hidden="true">' + FOTO_ICON + '</span>';
    }
    return '<img class="admin-thumb" src="' + escapeHtml(src) + '" alt="' +
      escapeHtml(nama || "Foto") + '" loading="lazy" />';
  }

  function setPhotoPreview(wrap, img, path) {
    if (!wrap || !img) return;
    if (path) {
      img.src = String(path);
      wrap.hidden = false;
    } else {
      img.removeAttribute("src");
      wrap.hidden = true;
    }
  }

  function apiFetch(url, options) {
    var opts = options || {};
    opts.credentials = "same-origin";
    opts.headers = Object.assign({ "Accept": "application/json" }, opts.headers || {});

    /* Pengecekan login menangani redirect sendiri SETELAH respons diterima. */
    var isAuthCheck = opts.authCheck === true;
    delete opts.authCheck;

    return fetch(url, opts)
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (payload) {
          if (!response.ok || !payload || payload.success !== true) {
            if (!isAuthCheck && (response.status === 401 || response.status === 403)) {
              redirectToLogin();
            }
            var message = (payload && (payload.error || payload.message)) ||
              "Tidak dapat memuat data. Silakan coba lagi.";
            /* Sertakan detail dari server (mis. pesan driver database). */
            if (payload && payload.detail &&
                String(message).indexOf(String(payload.detail)) === -1) {
              message = String(message) + " — " + String(payload.detail);
            }
            var error = new Error(message);
            error.status = response.status;
            error.payload = payload;
            throw error;
          }
          return payload.data;
        });
      })
      .catch(function (error) {
        if (error && error.name === "TypeError") {
          throw new Error("Tidak dapat terhubung ke server. Silakan coba lagi.");
        }
        throw error;
      });
  }

  function apiGet(action, params) {
    var url = ADMIN_API + "?action=" + encodeURIComponent(action);
    if (params && params.status) {
      url += "&status=" + encodeURIComponent(params.status);
    }
    return apiFetch(url, { method: "GET" });
  }

  function apiPost(payload) {
    return apiFetch(ADMIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {})
    });
  }

  /** POST multipart/form-data (untuk form yang menyertakan upload foto). */
  function apiPostForm(formData) {
    return apiFetch(ADMIN_API, {
      method: "POST",
      body: formData
    });
  }

  /** Gerbang akses — dijalankan paling awal, memakai sesi admin_auth. */
  function checkAccess() {
    return apiFetch(AUTH_API + "?action=admin_me", {
      method: "GET",
      authCheck: true
    }).then(function (admin) {
      if (!admin || String(admin.role || "").toLowerCase() !== "admin") {
        redirectToLogin();
        throw new Error("Akses ditolak. Hanya admin yang dapat membuka halaman ini.");
      }
      state.user = admin;
      return admin;
    }).catch(function (error) {

      if (
        (error.status === 401 || error.status === 403) &&
        error.payload && error.payload.success === false
      ) {
        redirectToLogin();
      }
      throw error;
    });
  }

  function showModal(node) {
    if (!node) return;
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(node).show();
    } else {
      node.classList.add("show");
      node.style.display = "block";
      document.body.classList.add("modal-open");
    }
  }

  function hideModal(node) {
    if (!node) return;
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(node).hide();
    } else {
      node.classList.remove("show");
      node.style.display = "none";
      document.body.classList.remove("modal-open");
    }
  }

  function showToast(text, type) {
    var toast = el.toast;
    if (!toast) return;
    if (el.toastText) el.toastText.textContent = text;
    toast.className = "admin-toast" + (type === "error" ? " admin-toast--error" : "");
    toast.hidden = false;
    window.requestAnimationFrame(function () { toast.classList.add("is-visible"); });

    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
      window.setTimeout(function () { toast.hidden = true; }, 250);
    }, 3600);
  }

  /** Tampilkan pesan error server di dalam form modal. */
  function showFormError(node, message) {
    if (!node) return;
    node.textContent = message || "Terjadi kesalahan. Silakan coba lagi.";
    node.hidden = false;
  }

  /** Bersihkan pesan error form modal. */
  function clearFormError(node) {
    if (!node) return;
    node.textContent = "";
    node.hidden = true;
  }

  var HALAMAN = {
    "tab-dashboard-tab": {
      title: "Dashboard / Ringkasan",
      subtitle: "Ringkasan aktivitas IndoTrip hari ini."
    },
    "tab-verifikasi-tab": {
      title: "Verifikasi Pembayaran",
      subtitle: "Periksa bukti transfer dan setujui pembayaran traveller."
    },
    "tab-destinasi-tab": {
      title: "Destinasi & Kuliner",
      subtitle: "Kelola data destinasi dan kuliner IndoTrip."
    },
    "tab-penginapan-tab": {
      title: "Hotel & Penginapan",
      subtitle: "Kelola data hotel, resort, dan homestay."
    },
    "tab-kontak-tab": {
      title: "Pesan Kontak",
      subtitle: "Tandai pesan masuk sebagai dibaca atau dibalas."
    }
  };

  function inisial(nama) {
    var bagian = String(nama || "").trim().split(/\s+/).filter(Boolean);
    if (!bagian.length) return "A";
    return (bagian[0].charAt(0) + (bagian.length > 1 ? bagian[bagian.length - 1].charAt(0) : ""))
      .toUpperCase();
  }

  function applyAdminIdentity() {
    var admin = state.user || {};
    var nama = String(admin.nama || admin.name || "Admin").trim() || "Admin";
    if (el.adminUserName) el.adminUserName.textContent = nama;
    if (el.adminUserRole) {
      el.adminUserRole.textContent = String(admin.role || "admin").toLowerCase() === "admin"
        ? "Administrator" : "Admin";
    }
    if (el.adminAvatar) el.adminAvatar.textContent = inisial(nama);
  }

  function setActiveSection(tabId) {
    var meta = HALAMAN[tabId] || HALAMAN["tab-dashboard-tab"];
    if (el.adminPageTitle) el.adminPageTitle.textContent = meta.title;
    if (el.adminPageSubtitle) el.adminPageSubtitle.textContent = meta.subtitle;

    Array.prototype.forEach.call(document.querySelectorAll(".admin-nav-link[data-target]"), function (link) {
      link.classList.toggle("is-active", link.getAttribute("data-target") === tabId);
    });

    /* Tutup sidebar saat dipakai di layar kecil. */
    if (el.layout) el.layout.classList.remove("sidebar-open");
  }

  /** Fallback pergantian tab bila Bootstrap JS tidak tersedia. */
  function activateTabManually(tabId) {
    var tab = byId(tabId);
    if (!tab) return;
    var target = tab.getAttribute("data-bs-target") || "";

    Array.prototype.forEach.call(document.querySelectorAll('button[data-bs-toggle="tab"]'), function (button) {
      var aktif = button === tab;
      button.classList.toggle("active", aktif);
      button.setAttribute("aria-selected", aktif ? "true" : "false");
    });

    Array.prototype.forEach.call(document.querySelectorAll(".tab-content > .tab-pane"), function (pane) {
      var aktif = target !== "" && ("#" + pane.id) === target;
      pane.classList.toggle("active", aktif);
      pane.classList.toggle("show", aktif);
    });
  }

  function gotoSection(tabId) {
    var tab = byId(tabId);
    if (!tab) return;
    if (typeof bootstrap !== "undefined" && bootstrap.Tab) {
      bootstrap.Tab.getOrCreateInstance(tab).show();
    } else {
      activateTabManually(tabId);
    }
    setActiveSection(tabId);
  }

  function setupNavigation() {
    Array.prototype.forEach.call(document.querySelectorAll(".admin-nav-link[data-target]"), function (link) {
      link.addEventListener("click", function () {
        gotoSection(link.getAttribute("data-target"));
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll("[data-goto]"), function (button) {
      button.addEventListener("click", function () {
        gotoSection(button.getAttribute("data-goto"));
      });
    });

    /* Jika tab diganti lewat Bootstrap, sinkronkan judul & sidebar. */
    Array.prototype.forEach.call(document.querySelectorAll('button[data-bs-toggle="tab"]'), function (tab) {
      tab.addEventListener("shown.bs.tab", function () {
        setActiveSection(tab.id);
      });
    });

    if (el.menuToggle) {
      el.menuToggle.addEventListener("click", function () {
        if (el.layout) el.layout.classList.toggle("sidebar-open");
      });
    }
  }

  function renderStats(stats) {
    if (el.statTotal) el.statTotal.textContent = String(Number(stats.total_pemesanan) || 0);
    if (el.statVerifikasi) el.statVerifikasi.textContent = String(Number(stats.pemesanan_menunggu_verifikasi) || 0);
    if (el.statPendapatan) el.statPendapatan.textContent = formatRupiah(stats.total_pendapatan);
    if (el.statPesan) el.statPesan.textContent = String(Number(stats.pesan_kontak_baru) || 0);

    var menunggu = Number(stats.pemesanan_menunggu_verifikasi) || 0;
    if (el.navVerifikasi) el.navVerifikasi.textContent = String(menunggu);
    if (el.navKontak) el.navKontak.textContent = String(Number(stats.pesan_kontak_baru) || 0);
  }

  function loadStats() {
    return apiGet("stats")
      .then(renderStats)
      .catch(function (error) { showToast(error.message, "error"); });
  }

  function findPemesanan(id) {
    for (var i = 0; i < state.pemesanan.length; i++) {
      if (Number(state.pemesanan[i].id) === Number(id)) return state.pemesanan[i];
    }
    return null;
  }

  function statusBadge(status) {
    var key = STATUS_PEMESANAN[status] ? status : "menunggu";
    return '<span class="admin-badge admin-badge--' + key + '">' +
      escapeHtml(STATUS_PEMESANAN[key]) + '</span>';
  }

  function renderPemesanan(items) {
    state.pemesanan = Array.isArray(items) ? items : [];
    var body = el.pemesananBody;
    if (!body) return;

    if (!state.pemesanan.length) {
      body.innerHTML = '<tr><td colspan="8" class="admin-empty">Belum ada pemesanan untuk status ini.</td></tr>';
      return;
    }

    body.innerHTML = state.pemesanan.map(function (item) {
      var statusKey = STATUS_PEMESANAN[item.status] ? item.status : "menunggu";
      var bisaDiverifikasi = statusKey === "menunggu_verifikasi" || statusKey === "menunggu";
      var tanggal = formatTanggal(item.tanggal_mulai);
      if (item.tanggal_selesai) tanggal += " — " + formatTanggal(item.tanggal_selesai);
      var satuan = item.jenis === "penginapan" ? "malam" : "orang";
      var jenis = item.jenis === "penginapan" ? "Penginapan" : "Destinasi";
      var metode = METODE[item.metode_pembayaran] ||
        (item.metode_pembayaran ? String(item.metode_pembayaran).replace(/_/g, " ") : "—");
      var id = escapeHtml(item.id);
      var kode = escapeHtml(item.kode_booking);

      var aksi =
        '<button type="button" class="admin-btn admin-btn--ghost js-bukti" data-id="' + id + '">' +
          'Lihat Bukti</button>' +
        '<button type="button" class="admin-btn admin-btn--acc js-acc" data-id="' + id + '"' +
          (bisaDiverifikasi ? '' : ' disabled title="Pemesanan ini sudah diproses"') + '>ACC</button>' +
        '<button type="button" class="admin-btn admin-btn--tolak js-tolak" data-id="' + id + '"' +
          (bisaDiverifikasi ? '' : ' disabled title="Pemesanan ini sudah diproses"') + '>Tolak</button>';

      return '<tr>' +
        '<td><span class="admin-code">' + kode + '</span>' +
          '<div class="admin-sub">' + escapeHtml(formatWaktu(item.dibuat_pada)) + '</div></td>' +
        '<td><span class="admin-nama">' + escapeHtml(item.user_nama || "-") + '</span>' +
          '<div class="admin-sub">' + escapeHtml(item.user_email || "") + '</div></td>' +
        '<td><span class="admin-nama">' + escapeHtml(item.nama_item || "-") + '</span>' +
          '<div class="admin-sub">' + jenis + '</div></td>' +
        '<td>' + escapeHtml(tanggal) +
          '<div class="admin-sub">' + (Number(item.jumlah_peserta) || 0) + ' ' + satuan + '</div></td>' +
        '<td><strong class="admin-total">' + formatRupiah(item.total_harga) + '</strong></td>' +
        '<td>' + escapeHtml(metode) + '</td>' +
        '<td>' + statusBadge(item.status) + '</td>' +
        '<td><div class="admin-actions">' + aksi + '</div></td>' +
      '</tr>';
    }).join("");

    bindPemesananActions();
  }

  function loadPemesanan() {
    var status = el.statusFilter ? el.statusFilter.value : "";
    return apiGet("pemesanan", { status: status })
      .then(renderPemesanan)
      .catch(function (error) { showToast(error.message, "error"); });
  }

  function bindPemesananActions() {
    var rows = el.pemesananBody.querySelectorAll("button[data-id]");
    Array.prototype.forEach.call(rows, function (button) {
      button.addEventListener("click", function () {
        var item = findPemesanan(button.getAttribute("data-id"));
        if (!item) return;
        if (button.classList.contains("js-bukti")) openBukti(item);
        else if (button.classList.contains("js-acc")) openAcc(item);
        else if (button.classList.contains("js-tolak")) openTolak(item);
      });
    });
  }

  function openBukti(item) {
    state.selectedPemesanan = item;
    if (el.buktiSubtitle) {
      el.buktiSubtitle.textContent = "Pemesanan " + item.kode_booking + " — " +
        (item.nama_item || "-") + " oleh " + (item.user_nama || "-") + ".";
    }

    var bukti = item.bukti_pembayaran;
    if (el.buktiImage && el.buktiEmpty) {
      if (bukti) {
        el.buktiImage.src = String(bukti);
        el.buktiImage.alt = "Bukti pembayaran " + item.kode_booking;
        el.buktiImage.hidden = false;
        el.buktiEmpty.hidden = true;
      } else {
        el.buktiImage.removeAttribute("src");
        el.buktiImage.hidden = true;
        el.buktiEmpty.hidden = false;
      }
    }
    showModal(el.buktiModal);
  }

  function openAcc(item) {
    state.selectedPemesanan = item;
    if (el.accSubtitle) {
      el.accSubtitle.textContent = item.kode_booking + " — " +
        (item.nama_item || "-") + " • " + formatRupiah(item.total_harga);
    }
    showModal(el.accModal);
  }

  function submitVerifikasi(keputusan, catatan, button) {
    var item = state.selectedPemesanan;
    if (!item) return;

    setBusy(button, true);
    apiPost({
      action: "verifikasi",
      pemesanan_id: item.id,
      keputusan: keputusan,
      catatan_admin: catatan || ""
    }).then(function () {
      if (keputusan === "acc") hideModal(el.accModal);
      else hideModal(el.tolakModal);
      showToast(keputusan === "acc"
        ? "Pembayaran disetujui. Pemesanan ditandai dibayar."
        : "Pembayaran ditolak. Catatan telah disimpan.");
      return Promise.all([loadPemesanan(), loadStats()]);
    }).catch(function (error) {
      showToast(error.message, "error");
    }).then(function () {
      setBusy(button, false);
    });
  }

  function openTolak(item) {
    state.selectedPemesanan = item;
    if (el.tolakSubtitle) {
      el.tolakSubtitle.textContent = item.kode_booking + " — " +
        (item.nama_item || "-") + " oleh " + (item.user_nama || "-") + ".";
    }
    if (el.alasanPenolakan) el.alasanPenolakan.value = "";
    if (el.tolakError) el.tolakError.hidden = true;
    showModal(el.tolakModal);
    if (el.alasanPenolakan) window.setTimeout(function () { el.alasanPenolakan.focus(); }, 50);
  }

  function submitTolak(event) {
    event.preventDefault();
    var alasan = el.alasanPenolakan ? el.alasanPenolakan.value.trim() : "";
    if (!alasan) {
      if (el.tolakError) {
        el.tolakError.textContent = "Alasan penolakan wajib diisi.";
        el.tolakError.hidden = false;
      }
      if (el.alasanPenolakan) el.alasanPenolakan.focus();
      return;
    }
    submitVerifikasi("tolak", alasan, el.tolakConfirm);
  }

  function findKontak(id) {
    for (var i = 0; i < state.kontak.length; i++) {
      if (Number(state.kontak[i].id) === Number(id)) return state.kontak[i];
    }
    return null;
  }

  function kontakBadge(status) {
    var key = STATUS_KONTAK[status] ? status : "baru";
    return '<span class="admin-badge admin-badge--kontak-' + key + '">' +
      escapeHtml(STATUS_KONTAK[key]) + '</span>';
  }

  function renderKontak(items) {
    state.kontak = Array.isArray(items) ? items : [];
    var body = el.kontakBody;
    if (!body) return;

    if (!state.kontak.length) {
      body.innerHTML = '<tr><td colspan="7" class="admin-empty">Belum ada pesan kontak untuk status ini.</td></tr>';
      return;
    }

    body.innerHTML = state.kontak.map(function (item) {
      var status = STATUS_KONTAK[item.status] ? item.status : "baru";
      var pesan = String(item.pesan || "");
      var ringkas = pesan.length > 120 ? pesan.slice(0, 120) + "…" : pesan;
      var aksi =
        '<button type="button" class="admin-btn admin-btn--ghost js-kontak" data-id="' +
          escapeHtml(item.id) + '" data-status="dibaca"' +
          (status === "dibaca" || status === "dibalas" ? ' disabled' : '') + '>Dibaca</button>' +
        '<button type="button" class="admin-btn admin-btn--reply js-kontak" data-id="' +
          escapeHtml(item.id) + '" data-status="dibalas"' +
          (status === "dibalas" ? ' disabled' : '') + '>Dibalas</button>';

      return '<tr>' +
        '<td><span class="admin-nama">' + escapeHtml(item.nama || "-") + '</span></td>' +
        '<td>' + escapeHtml(item.email || "-") + '</td>' +
        '<td>' + escapeHtml(item.subjek || "-") + '</td>' +
        '<td><span class="admin-pesan" title="' + escapeHtml(pesan) + '">' +
          escapeHtml(ringkas) + '</span></td>' +
        '<td><span class="admin-sub">' + escapeHtml(formatWaktu(item.dibuat_pada)) + '</span></td>' +
        '<td>' + kontakBadge(item.status) + '</td>' +
        '<td><div class="admin-actions">' + aksi + '</div></td>' +
      '</tr>';
    }).join("");

    var buttons = body.querySelectorAll("button.js-kontak");
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        var item = findKontak(button.getAttribute("data-id"));
        var statusBaru = button.getAttribute("data-status");
        if (!item) return;

        setBusy(button, true);
        apiPost({ action: "update_kontak", id: item.id, status: statusBaru })
          .then(function () {
            showToast(statusBaru === "dibaca"
              ? "Pesan ditandai sudah dibaca."
              : "Pesan ditandai sudah dibalas.");
            return Promise.all([loadKontak(), loadStats()]);
          })
          .catch(function (error) { showToast(error.message, "error"); })
          .then(function () { setBusy(button, false); });
      });
    });
  }

  function loadKontak() {
    var status = el.kontakFilter ? el.kontakFilter.value : "";
    return apiGet("kontak", { status: status })
      .then(renderKontak)
      .catch(function (error) { showToast(error.message, "error"); });
  }

  function findDestinasi(id) {
    for (var i = 0; i < state.destinasi.length; i++) {
      if (String(state.destinasi[i].id) === String(id)) return state.destinasi[i];
    }
    return null;
  }

  function tipeBadges(tipe, peta) {
    var list = Array.isArray(tipe) ? tipe : [];
    if (!list.length) return '<span class="admin-badge admin-badge--tipe-default">—</span>';
    return list.map(function (t) {
      var key = peta[t] || "tipe-default";
      return '<span class="admin-badge admin-badge--' + key + '">' + escapeHtml(t) + '</span>';
    }).join(" ");
  }

  function renderDestinasi(items) {
    state.destinasi = Array.isArray(items) ? items : [];
    var body = el.destinasiBody;
    if (!body) return;

    if (!state.destinasi.length) {
      body.innerHTML = '<tr><td colspan="7" class="admin-empty">Belum ada destinasi atau kuliner.</td></tr>';
      return;
    }

    body.innerHTML = state.destinasi.map(function (item) {
      var id = escapeHtml(item.id);
      var aksi =
        '<button type="button" class="admin-btn admin-btn--ghost js-edit-destinasi" data-id="' + id + '">Edit</button>' +
        '<button type="button" class="admin-btn admin-btn--tolak js-hapus-destinasi" data-id="' + id + '">Hapus</button>';

      return '<tr>' +
        '<td>' + fotoThumbnail(item.gambar, item.nama) + '</td>' +
        '<td><span class="admin-nama">' + escapeHtml(item.nama || "-") + '</span>' +
          (item.jam ? '<div class="admin-sub">' + escapeHtml(item.jam) + '</div>' : '') + '</td>' +
        '<td>' + escapeHtml(item.lokasi || "-") + '</td>' +
        '<td>' + escapeHtml(item.pulau || "-") + '</td>' +
        '<td><div class="admin-badge-group">' + tipeBadges(item.tipe, TIPE_DESTINASI) + '</div></td>' +
        '<td><strong class="admin-total">' + formatRupiah(item.harga) + '</strong></td>' +
        '<td><div class="admin-actions">' + aksi + '</div></td>' +
      '</tr>';
    }).join("");

    var buttons = body.querySelectorAll("button[data-id]");
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        var item = findDestinasi(button.getAttribute("data-id"));
        if (!item) return;
        if (button.classList.contains("js-edit-destinasi")) openDestinasiForm(item);
        else if (button.classList.contains("js-hapus-destinasi")) openDelete(item, "destinasi");
      });
    });
  }

  function loadDestinasi() {
    return apiGet("list_destinasi")
      .then(renderDestinasi)
      .catch(function (error) { showToast(error.message, "error"); });
  }

  function openDestinasiForm(item) {
    var form = el.destinasiForm;
    if (!form) return;
    form.reset();
    clearFormError(el.destinasiError);

    var edit = !!item;
    if (el.destinasiEditId) el.destinasiEditId.value = edit ? String(item.id) : "";
    if (el.destinasiModalLabel) {
      el.destinasiModalLabel.textContent = edit ? "Edit Destinasi / Kuliner" : "Tambah Destinasi / Kuliner";
    }
    if (el.destinasiSubmit) el.destinasiSubmit.textContent = edit ? "Simpan Perubahan" : "Simpan Destinasi";

    if (edit) {
      if (el.destinasiNama) el.destinasiNama.value = item.nama || "";
      if (el.destinasiPulau) el.destinasiPulau.value = item.pulau || "";
      if (el.destinasiLokasi) el.destinasiLokasi.value = item.lokasi || "";
      if (el.destinasiHarga) el.destinasiHarga.value = Number(item.harga) || 0;
      if (el.destinasiJam) el.destinasiJam.value = item.jam || "";
      if (el.destinasiDeskripsi) el.destinasiDeskripsi.value = item.deskripsi || "";
      if (el.destinasiFasilitas) {
        el.destinasiFasilitas.value = Array.isArray(item.fasilitas) ? item.fasilitas.join("\n") : "";
      }
      if (el.destinasiTips) {
        el.destinasiTips.value = Array.isArray(item.tips) ? item.tips.join("\n") : "";
      }
      var pilihan = Array.isArray(item.tipe) ? item.tipe : [];
      Array.prototype.forEach.call(form.querySelectorAll('input[name="tipe"]'), function (cb) {
        cb.checked = pilihan.indexOf(cb.value) !== -1;
      });
    } else {
      Array.prototype.forEach.call(form.querySelectorAll('input[name="tipe"]'), function (cb) {
        cb.checked = false;
      });
    }

    var gambarLama = edit ? (item.gambar || "") : "";
    var heroLama = edit ? (item.gambar_hero || "") : "";
    if (el.destinasiGambarLama) el.destinasiGambarLama.value = gambarLama;
    if (el.destinasiHeroLama) el.destinasiHeroLama.value = heroLama;
    setPhotoPreview(el.destinasiFotoPreview, el.destinasiFotoPreviewImg, gambarLama);

    showModal(el.destinasiModal);
  }

  function submitDestinasi(event) {
    event.preventDefault();
    var form = event.target;
    clearFormError(el.destinasiError);
    if (form && form.checkValidity && !form.checkValidity()) {
      if (form.reportValidity) form.reportValidity();
      return;
    }

    var tipe = [];
    Array.prototype.forEach.call(form.querySelectorAll('input[name="tipe"]:checked'), function (cb) {
      tipe.push(cb.value);
    });

    var formData = new FormData(form);
    formData.delete("tipe");
    formData.append("tipe", JSON.stringify(tipe));
    formData.append("action", "save_destinasi");

    var button = el.destinasiSubmit;
    setBusy(button, true);
    apiPostForm(formData).then(function () {
      hideModal(el.destinasiModal);
      showToast(formData.get("edit_id")
        ? "Destinasi berhasil diperbarui."
        : "Destinasi berhasil ditambahkan.");
      /* Segera refresh tabel setelah perubahan tersimpan. */
      return loadDestinasi();
    }).catch(function (error) {
      var detail = (error && error.message) || "Gagal menyimpan destinasi.";
      showFormError(el.destinasiError, detail);
      showToast(detail, "error");
    }).then(function () {
      setBusy(button, false);
    });
  }

  function findPenginapan(id) {
    for (var i = 0; i < state.penginapan.length; i++) {
      if (String(state.penginapan[i].id) === String(id)) return state.penginapan[i];
    }
    return null;
  }

  function renderPenginapan(items) {
    state.penginapan = Array.isArray(items) ? items : [];
    var body = el.penginapanBody;
    if (!body) return;

    if (!state.penginapan.length) {
      body.innerHTML = '<tr><td colspan="7" class="admin-empty">Belum ada penginapan.</td></tr>';
      return;
    }

    body.innerHTML = state.penginapan.map(function (item) {
      var id = escapeHtml(item.id);
      var aksi =
        '<button type="button" class="admin-btn admin-btn--ghost js-edit-penginapan" data-id="' + id + '">Edit</button>' +
        '<button type="button" class="admin-btn admin-btn--tolak js-hapus-penginapan" data-id="' + id + '">Hapus</button>';

      return '<tr>' +
        '<td>' + fotoThumbnail(item.gambar, item.nama) + '</td>' +
        '<td><span class="admin-nama">' + escapeHtml(item.nama || "-") + '</span>' +
          (item.lokasi ? '<div class="admin-sub">' + escapeHtml(item.lokasi) + '</div>' : '') + '</td>' +
        '<td>' + escapeHtml(item.pulau || "-") + '</td>' +
        '<td><div class="admin-badge-group">' + tipeBadges(item.tipe ? [item.tipe] : [], TIPE_PENGINAPAN) + '</div></td>' +
        '<td><strong class="admin-total">' + formatRupiah(item.harga) + '</strong></td>' +
        '<td>' + escapeHtml(item.jarak || "-") + '</td>' +
        '<td><div class="admin-actions">' + aksi + '</div></td>' +
      '</tr>';
    }).join("");

    var buttons = body.querySelectorAll("button[data-id]");
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        var item = findPenginapan(button.getAttribute("data-id"));
        if (!item) return;
        if (button.classList.contains("js-edit-penginapan")) openPenginapanForm(item);
        else if (button.classList.contains("js-hapus-penginapan")) openDelete(item, "penginapan");
      });
    });
  }

  function loadPenginapan() {
    return apiGet("list_penginapan")
      .then(renderPenginapan)
      .catch(function (error) { showToast(error.message, "error"); });
  }

  function openPenginapanForm(item) {
    var form = el.penginapanForm;
    if (!form) return;
    form.reset();
    clearFormError(el.penginapanError);

    var edit = !!item;
    if (el.penginapanEditId) el.penginapanEditId.value = edit ? String(item.id) : "";
    if (el.penginapanModalLabel) {
      el.penginapanModalLabel.textContent = edit ? "Edit Penginapan" : "Tambah Penginapan";
    }
    if (el.penginapanSubmit) el.penginapanSubmit.textContent = edit ? "Simpan Perubahan" : "Simpan Penginapan";

    if (edit) {
      if (el.penginapanNama) el.penginapanNama.value = item.nama || "";
      if (el.penginapanPulau) el.penginapanPulau.value = item.pulau || "";
      if (el.penginapanTipe) el.penginapanTipe.value = item.tipe || "Hotel";
      if (el.penginapanLokasi) el.penginapanLokasi.value = item.lokasi || "";
      if (el.penginapanAlamat) el.penginapanAlamat.value = item.alamat_lengkap || "";
      if (el.penginapanJarak) el.penginapanJarak.value = item.jarak || "";
      if (el.penginapanHarga) el.penginapanHarga.value = Number(item.harga) || 0;
      if (el.penginapanCheckIn) el.penginapanCheckIn.value = item.check_in || "";
      if (el.penginapanCheckOut) el.penginapanCheckOut.value = item.check_out || "";
      if (el.penginapanDeskripsi) el.penginapanDeskripsi.value = item.deskripsi || "";
      if (el.penginapanFasilitas) {
        el.penginapanFasilitas.value = daftarFasilitas(item.fasilitas);
      }
      if (el.penginapanTips) {
        el.penginapanTips.value = Array.isArray(item.tips) ? item.tips.join("\n") : "";
      }
      if (el.penginapanKebijakan) {
        el.penginapanKebijakan.value = Array.isArray(item.kebijakan) ? item.kebijakan.join("\n") : "";
      }
    }

    var gambarLama = edit ? (item.gambar || "") : "";
    var heroLama = edit ? (item.gambar_hero || "") : "";
    if (el.penginapanGambarLama) el.penginapanGambarLama.value = gambarLama;
    if (el.penginapanHeroLama) el.penginapanHeroLama.value = heroLama;
    setPhotoPreview(el.penginapanFotoPreview, el.penginapanFotoPreviewImg, gambarLama);

    showModal(el.penginapanModal);
  }

  /** Fasilitas penginapan bisa berupa string atau objek {nama, ikon}. */
  function daftarFasilitas(fasilitas) {
    if (!Array.isArray(fasilitas)) return "";
    return fasilitas.map(function (item) {
      if (item && typeof item === "object") return String(item.nama || "");
      return String(item || "");
    }).filter(function (nama) { return nama !== ""; }).join("\n");
  }

  function submitPenginapan(event) {
    event.preventDefault();
    var form = event.target;
    clearFormError(el.penginapanError);
    if (form && form.checkValidity && !form.checkValidity()) {
      if (form.reportValidity) form.reportValidity();
      return;
    }

    var formData = new FormData(form);
    formData.append("action", "save_penginapan");

    var button = el.penginapanSubmit;
    setBusy(button, true);
    apiPostForm(formData).then(function () {
      hideModal(el.penginapanModal);
      showToast(formData.get("edit_id")
        ? "Penginapan berhasil diperbarui."
        : "Penginapan berhasil ditambahkan.");
      /* Segera refresh tabel setelah perubahan tersimpan. */
      return loadPenginapan();
    }).catch(function (error) {
      var detail = (error && error.message) || "Gagal menyimpan penginapan.";
      showFormError(el.penginapanError, detail);
      showToast(detail, "error");
    }).then(function () {
      setBusy(button, false);
    });
  }

  function openDelete(item, jenis) {
    clearFormError(el.deleteError);
    state.selectedDelete = { id: item.id, nama: item.nama || "", jenis: jenis };
    if (el.deleteSubtitle) {
      el.deleteSubtitle.textContent = "Yakin ingin menghapus " +
        (jenis === "destinasi" ? "destinasi" : "penginapan") + " “" +
        (item.nama || "-") + "”?";
    }
    showModal(el.deleteModal);
  }

  function submitDelete() {
    var target = state.selectedDelete;
    if (!target) return;

    var button = el.deleteConfirm;
    setBusy(button, true);
    apiPost({
      action: target.jenis === "destinasi" ? "delete_destinasi" : "delete_penginapan",
      id: target.id
    }).then(function () {
      hideModal(el.deleteModal);
      showToast(target.jenis === "destinasi"
        ? "Destinasi berhasil dihapus."
        : "Penginapan berhasil dihapus.");
      state.selectedDelete = null;
      /* Segera refresh tabel setelah data dihapus. */
      return target.jenis === "destinasi" ? loadDestinasi() : loadPenginapan();
    }).catch(function (error) {
      var detail = (error && error.message) || "Gagal menghapus data.";
      showFormError(el.deleteError, detail);
      showToast(detail, "error");
    }).then(function () {
      setBusy(button, false);
    });
  }

  function logout() {
    setBusy(el.adminLogout, true);
    apiFetch(AUTH_API, {
      method: "POST",
      authCheck: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "admin_logout" })
    }).catch(function () {
      /* Tetap lanjutkan alur UI walaupun server gagal merespons. */
    }).then(function () {
      window.location.href = LOGIN_URL;
    });
  }

  function cacheElements() {
    el.gate = byId("adminGate");
    el.app = byId("adminApp");
    el.layout = byId("adminLayout");
    el.menuToggle = byId("adminMenuToggle");
    el.adminPageTitle = byId("adminPageTitle");
    el.adminPageSubtitle = byId("adminPageSubtitle");
    el.adminUserName = byId("adminUserName");
    el.adminUserRole = byId("adminUserRole");
    el.adminAvatar = byId("adminAvatar");
    el.navVerifikasi = byId("navVerifikasi");
    el.navKontak = byId("navKontak");

    el.statTotal = byId("statTotal");
    el.statVerifikasi = byId("statVerifikasi");
    el.statPendapatan = byId("statPendapatan");
    el.statPesan = byId("statPesan");

    el.statusFilter = byId("statusFilter");
    el.kontakFilter = byId("kontakFilter");
    el.pemesananBody = byId("pemesananBody");
    el.kontakBody = byId("kontakBody");
    el.destinasiBody = byId("destinasiBody");
    el.penginapanBody = byId("penginapanBody");

    el.buktiModal = byId("buktiModal");
    el.buktiSubtitle = byId("buktiSubtitle");
    el.buktiImage = byId("buktiImage");
    el.buktiEmpty = byId("buktiEmpty");

    el.accModal = byId("accModal");
    el.accSubtitle = byId("accSubtitle");
    el.accConfirm = byId("accConfirm");

    el.tolakModal = byId("tolakModal");
    el.tolakForm = byId("tolakForm");
    el.tolakSubtitle = byId("tolakSubtitle");
    el.tolakError = byId("tolakError");
    el.alasanPenolakan = byId("alasanPenolakan");
    el.tolakConfirm = byId("tolakConfirm");

    el.destinasiModal = byId("destinasiModal");
    el.destinasiModalLabel = byId("destinasiModalLabel");
    el.destinasiForm = byId("destinasiForm");
    el.destinasiEditId = byId("destinasiEditId");
    el.destinasiGambarLama = byId("destinasiGambarLama");
    el.destinasiHeroLama = byId("destinasiHeroLama");
    el.destinasiNama = byId("destinasiNama");
    el.destinasiPulau = byId("destinasiPulau");
    el.destinasiLokasi = byId("destinasiLokasi");
    el.destinasiHarga = byId("destinasiHarga");
    el.destinasiJam = byId("destinasiJam");
    el.destinasiDeskripsi = byId("destinasiDeskripsi");
    el.destinasiFasilitas = byId("destinasiFasilitas");
    el.destinasiTips = byId("destinasiTips");
    el.destinasiFotoPreview = byId("destinasiFotoPreview");
    el.destinasiFotoPreviewImg = byId("destinasiFotoPreviewImg");
    el.destinasiError = byId("destinasiError");
    el.destinasiSubmit = byId("destinasiSubmit");

    el.penginapanModal = byId("penginapanModal");
    el.penginapanModalLabel = byId("penginapanModalLabel");
    el.penginapanForm = byId("penginapanForm");
    el.penginapanEditId = byId("penginapanEditId");
    el.penginapanGambarLama = byId("penginapanGambarLama");
    el.penginapanHeroLama = byId("penginapanHeroLama");
    el.penginapanNama = byId("penginapanNama");
    el.penginapanPulau = byId("penginapanPulau");
    el.penginapanTipe = byId("penginapanTipe");
    el.penginapanLokasi = byId("penginapanLokasi");
    el.penginapanAlamat = byId("penginapanAlamat");
    el.penginapanJarak = byId("penginapanJarak");
    el.penginapanHarga = byId("penginapanHarga");
    el.penginapanCheckIn = byId("penginapanCheckIn");
    el.penginapanCheckOut = byId("penginapanCheckOut");
    el.penginapanDeskripsi = byId("penginapanDeskripsi");
    el.penginapanFasilitas = byId("penginapanFasilitas");
    el.penginapanTips = byId("penginapanTips");
    el.penginapanKebijakan = byId("penginapanKebijakan");
    el.penginapanFotoPreview = byId("penginapanFotoPreview");
    el.penginapanFotoPreviewImg = byId("penginapanFotoPreviewImg");
    el.penginapanError = byId("penginapanError");
    el.penginapanSubmit = byId("penginapanSubmit");

    el.deleteModal = byId("deleteModal");
    el.deleteSubtitle = byId("deleteSubtitle");
    el.deleteError = byId("deleteError");
    el.deleteConfirm = byId("deleteConfirm");

    el.adminLogout = byId("adminLogout");
    el.toast = byId("adminToast");
    el.toastText = byId("adminToastText");
  }

  function bindStatic() {
    if (el.statusFilter) el.statusFilter.addEventListener("change", loadPemesanan);
    if (el.kontakFilter) el.kontakFilter.addEventListener("change", loadKontak);
    if (byId("refreshPemesanan")) byId("refreshPemesanan").addEventListener("click", loadPemesanan);
    if (byId("refreshKontak")) byId("refreshKontak").addEventListener("click", loadKontak);

    if (byId("refreshDestinasi")) byId("refreshDestinasi").addEventListener("click", loadDestinasi);
    if (byId("tambahDestinasi")) {
      byId("tambahDestinasi").addEventListener("click", function () { openDestinasiForm(null); });
    }
    if (el.destinasiForm) el.destinasiForm.addEventListener("submit", submitDestinasi);

    if (byId("refreshPenginapan")) byId("refreshPenginapan").addEventListener("click", loadPenginapan);
    if (byId("tambahPenginapan")) {
      byId("tambahPenginapan").addEventListener("click", function () { openPenginapanForm(null); });
    }
    if (el.penginapanForm) el.penginapanForm.addEventListener("submit", submitPenginapan);

    if (el.deleteConfirm) el.deleteConfirm.addEventListener("click", submitDelete);

    if (el.accConfirm) el.accConfirm.addEventListener("click", function () {
      submitVerifikasi("acc", "", el.accConfirm);
    });
    if (el.tolakForm) el.tolakForm.addEventListener("submit", submitTolak);
    if (el.alasanPenolakan) {
      el.alasanPenolakan.addEventListener("input", function () {
        if (el.tolakError) el.tolakError.hidden = true;
      });
    }
    if (el.adminLogout) el.adminLogout.addEventListener("click", logout);

    /* Fallback penutup modal bila Bootstrap tidak tersedia. */
    [
      el.buktiModal, el.accModal, el.tolakModal,
      el.destinasiModal, el.penginapanModal, el.deleteModal
    ].forEach(function (modal) {
      if (!modal) return;
      var dismiss = modal.querySelectorAll('[data-bs-dismiss="modal"]');
      Array.prototype.forEach.call(dismiss, function (button) {
        button.addEventListener("click", function () {
          if (typeof bootstrap !== "undefined" && bootstrap.Modal) return;
          hideModal(modal);
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindStatic();
    setupNavigation();

    /* Deep link: admin.html?tab=destinasi dll. */
    var tabMap = {
      dashboard: "tab-dashboard-tab",
      verifikasi: "tab-verifikasi-tab",
      destinasi: "tab-destinasi-tab",
      penginapan: "tab-penginapan-tab",
      kontak: "tab-kontak-tab"
    };
    var param = new URLSearchParams(window.location.search).get("tab");
    gotoSection(tabMap[param] || "tab-dashboard-tab");

    checkAccess().then(function () {
      if (el.gate) el.gate.hidden = true;
      if (el.app) el.app.hidden = false;

      applyAdminIdentity();
      loadStats();
      loadPemesanan();
      loadDestinasi();
      loadPenginapan();
      loadKontak();
    }).catch(function (error) {
      if (el.gate) {
        el.gate.innerHTML = '<p class="admin-gate-error">' +
          escapeHtml((error && error.message) || "Gagal memverifikasi akses.") + '</p>';
      }
    });
  });
})();
