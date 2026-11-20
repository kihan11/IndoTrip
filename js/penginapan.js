

(function () {
  "use strict";

  const grid = document.getElementById("inap-cards-grid");
  const countEl = document.getElementById("results-count");
  const refundBadge = document.getElementById("refund-badge");
  if (!grid || !countEl) return;

  const API_URL = "api/penginapan.php";

  const ICON = {
    pin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>`,
    bed: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18v-8m0 4h18v4M3 14V7a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v3m0 0V9a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v5M6 11h4M14 10h4"/></svg>`,
    send: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z"/><path d="M21 3 10.3 13.7"/></svg>`
  };

  const FASILITAS_ICON = {
    wifi: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M2 8.8a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16.2a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none"/></svg>`,
    ac: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 2v20M4.5 6.2l15 11.6M19.5 6.2l-15 11.6M9 4l3 3 3-3M9 20l3-3 3 3"/></svg>`,
    kolam: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 20c2 0 2-1.5 4-1.5S8 20 10 20s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M7 12V5a2 2 0 0 1 4 0v7M17 12V5a2 2 0 0 0-4 0"/></svg>`,
    sarapan: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3c-1.7 2-2.5 4.5-2.5 7.5S15.3 16 17 17v4"/></svg>`,
    kipas: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1.7"/><path d="M13.2 10.6c1.6-3 4-4.6 6-3.3 2 1.3.7 4.2-2 5.1M11 13.5c-3.3 1-5.9.1-5.8-2.1.1-2.2 3-3.4 5.3-1.9M12.4 14c.8 3.3.1 5.9-2.1 6-2.2.1-3.5-2.9-2.1-5.3"/></svg>`,
    sepeda: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="m5.5 17 4-8h5l4 8M9 9l3.5 8M12.5 9H9m8.5 8H14"/></svg>`,
    airPanas: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5s6 6.2 6 10.4a6 6 0 0 1-12 0C6 8.7 12 2.5 12 2.5Z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/></svg>`,
    selimut: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>`,
    tur: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M5 7l14 10M19 7 5 17"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/></svg>`
  };

  const numberID = new Intl.NumberFormat("id-ID");

  function detailUrl(penginapan) {
    return `detail-penginapan.html?id=${encodeURIComponent(penginapan.id)}`;
  }

  function cardTemplate(penginapan) {
    const href = detailUrl(penginapan);
    const fasilitas = (penginapan.fasilitas || [])
      .map(
        (item) => `
          <span class="inap-facility">
            ${FASILITAS_ICON[item.ikon] || FASILITAS_ICON.wifi}
            <span>${item.nama}</span>
          </span>`
      )
      .join("");

    return `
      <article class="inap-card" data-id="${penginapan.id}">
        <div class="inap-card-media">
          <a href="${href}" aria-label="Lihat detail ${penginapan.nama}">
            <img src="${penginapan.gambar || ""}" alt="${penginapan.alt || ""}" loading="lazy" decoding="async" />
          </a>
          <span class="inap-price">Rp ${numberID.format(penginapan.harga)}</span>
          <span class="inap-per-night">/malam</span>
        </div>
        <div class="inap-card-body">
          <div class="inap-card-top">
            <p class="inap-location">${ICON.pin}<span>${penginapan.lokasi || ""}</span></p>
            <span class="inap-type">${penginapan.tipe || ""}</span>
          </div>
          <h3 class="inap-card-title"><a href="${href}">${penginapan.nama}</a></h3>
          <div class="inap-rating">
            <span class="inap-rating-score">${ICON.star}${Number(penginapan.rating).toFixed(1)}</span>
            <span class="inap-reviews">&plusmn; ${numberID.format(penginapan.ulasan || 0)} ulasan</span>
          </div>
          <span class="inap-distance">${penginapan.jarak || ""}</span>
          <div class="inap-facilities">${fasilitas}</div>
          <div class="inap-card-actions">
            <a href="${href}" class="inap-detail">Lihat Detail</a>
            <button type="button" class="inap-send" aria-label="Simpan ${penginapan.nama}">${ICON.send}</button>
          </div>
        </div>
      </article>
    `;
  }

  function emptyTemplate() {
    return `
      <div class="inap-empty">
        ${ICON.bed}
        <h3>Tidak ada penginapan ditemukan</h3>
        <p>Coba ubah filter pencarian Anda untuk melihat lebih banyak hasil.</p>
        <button type="button" class="inap-reset-link" id="reset-filter">Hapus semua filter</button>
      </div>
    `;
  }

  function errorTemplate() {
    return `
      <div class="inap-empty">
        ${ICON.bed}
        <h3>Gagal memuat penginapan</h3>
        <p>Pastikan server PHP berjalan dan database sudah diimpor.</p>
        <button type="button" class="inap-reset-link" id="retry-load">Coba Lagi</button>
      </div>
    `;
  }

  const WISHLIST_API = "api/wishlist.php";
  const LOGIN_URL = "login.html";

  /* Data hasil fetch terakhir — dipakai tombol wishlist. */
  let currentData = [];

  /* id penginapan yang sudah disimpan user yang login. */
  let savedIds = new Set();

  function apiFetch(url, options, redirectOn401) {
    const shouldRedirect = redirectOn401 !== false;
    /* Cookie sesi harus selalu ikut terkirim ke api/wishlist.php. */
    const fetchOptions = Object.assign({}, options || {}, {
      credentials: "same-origin"
    });

    return fetch(url, fetchOptions)
      .then((response) =>
        response.json().catch(() => null).then((payload) => {
          if (!response.ok || !payload || payload.success !== true) {
            const error = new Error(
              (payload && (payload.error || payload.message)) || "Respons API tidak valid."
            );
            error.status = response.status;
            throw error;
          }
          return payload.data;
        })
      )
      .catch((error) => {
        if (error && error.status === 401 && shouldRedirect) {
          window.alert("Silakan masuk terlebih dahulu untuk menyimpan wishlist.");
          window.location.href = LOGIN_URL;
        }
        throw error;
      });
  }

  /** Muat state wishlist. Tanpa redirect: pengunjung boleh menjelajah tanpa login. */
  function loadWishlist() {
    return apiFetch(
      WISHLIST_API,
      { headers: { Accept: "application/json" } },
      false
    )
      .then((items) => {
        savedIds = new Set(
          (Array.isArray(items) ? items : [])
            .filter((item) => item && item.jenis === "penginapan")
            .map((item) => String(item.item_id))
        );
        applyWishlistStates();
      })
      .catch(() => {
        /* Biarkan tombol memakai state lokal bila wishlist tidak dapat dimuat. */
      });
  }

  function applyButtonState(button, saved, nama) {
    /* Warna hijau aktif diatur oleh CSS lewat class .is-saved. */
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", saved ? "true" : "false");
    button.setAttribute(
      "aria-label",
      saved ? `Hapus ${nama} dari wishlist` : `Simpan ${nama} ke wishlist`
    );
  }

  let wishToastTimer = null;

  function showWishlistToast(message) {
    const toast = document.getElementById("wishlistToast");
    const textEl = document.getElementById("wishlistToastText");
    if (!toast) return;

    if (textEl) textEl.textContent = message;
    toast.hidden = false;
    window.requestAnimationFrame(() => toast.classList.add("is-visible"));

    if (wishToastTimer) window.clearTimeout(wishToastTimer);
    wishToastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
      window.setTimeout(() => {
        toast.hidden = true;
      }, 250);
    }, 2200);
  }

  /** Perbarui tampilan semua tombol sesuai data wishlist terbaru. */
  function applyWishlistStates() {
    grid.querySelectorAll(".inap-send").forEach((button) => {
      const card = button.closest(".inap-card");
      const id = card ? card.getAttribute("data-id") : "";
      const penginapan = currentData.find((item) => item.id === id);
      if (penginapan) {
        applyButtonState(button, savedIds.has(String(id)), penginapan.nama);
      }
    });
  }

  function bindWishlistButtons() {
    grid.querySelectorAll(".inap-send").forEach((button) => {
      if (button.dataset.wishBound === "1") return;
      button.dataset.wishBound = "1";

      const card = button.closest(".inap-card");
      const id = card ? card.getAttribute("data-id") : "";
      const penginapan = currentData.find((item) => item.id === id);
      if (!penginapan) return;

      applyButtonState(button, savedIds.has(String(id)), penginapan.nama);

      button.addEventListener("click", () => {
        if (button.disabled) return;
        button.disabled = true;

        apiFetch(WISHLIST_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ jenis: "penginapan", item_id: String(id) })
        })
          .then((result) => {
            const saved = Boolean(result && result.saved);
            if (saved) savedIds.add(String(id));
            else savedIds.delete(String(id));
            applyButtonState(button, saved, penginapan.nama);
            showWishlistToast(
              saved ? "Disimpan ke Wishlist" : "Dihapus dari Wishlist"
            );
          })
          .catch(() => {
            /* 401 sudah ditangani apiFetch -> redirect ke login.html. */
          })
          .then(() => {
            button.disabled = false;
          });
      });
    });
  }

  const checkboxes = Array.from(
    document.querySelectorAll('.filter-card input[type="checkbox"]')
  );
  const selected = { pulau: new Set(), tipe: new Set() };

  function syncSelected() {
    selected.pulau.clear();
    selected.tipe.clear();

    checkboxes.forEach((checkbox) => {
      if (!checkbox.checked) return;
      if (selected[checkbox.name]) selected[checkbox.name].add(checkbox.value);
    });
  }

  function setStat(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
  }

  function nearestDistance(items) {
    let smallest = null;
    items.forEach((item) => {
      const match = String(item.jarak || "").match(/(\d+(?:[.,]\d+)?)/);
      if (!match) return;
      const value = parseFloat(match[1].replace(",", "."));
      if (Number.isFinite(value) && (smallest === null || value < smallest)) {
        smallest = value;
      }
    });
    return smallest === null ? "—" : `${smallest} km`;
  }

  function updateStats(items) {
    if (!items.length) return;
    const totalRating = items.reduce(
      (sum, item) => sum + Number(item.rating || 0),
      0
    );

    setStat("stat-akomodasi", String(items.length));
    setStat("stat-rating", (totalRating / items.length).toFixed(1));
    setStat("stat-terdekat", nearestDistance(items));
  }

  async function loadStats() {
    try {
      const response = await fetch(API_URL, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return;

      const payload = await response.json();
      if (payload && payload.success === true && Array.isArray(payload.data)) {
        updateStats(payload.data);
      }
    } catch (err) {
      /* Biarkan angka statis tetap tampil bila API tidak tersedia. */
    }
  }

  let requestId = 0;

  function buildApiUrl() {
    syncSelected();
    const query = new URLSearchParams();

    selected.pulau.forEach((value) => query.append("pulau", value));
    selected.tipe.forEach((value) => query.append("tipe", value));

    const qs = query.toString();
    return qs ? `${API_URL}?${qs}` : API_URL;
  }

  function paint(hasil) {
    grid.innerHTML = hasil.length > 0 ? hasil.map(cardTemplate).join("") : emptyTemplate();

    countEl.textContent = `${hasil.length} penginapan tersedia`;

    /* Badge "Bisa refund" tampil selama ada hasil. */
    if (refundBadge) refundBadge.hidden = hasil.length === 0;

    const resetButton = document.getElementById("reset-filter");
    if (resetButton) resetButton.addEventListener("click", resetFilter);

    bindWishlistButtons();
  }

  async function render() {
    const id = ++requestId;
    const url = buildApiUrl();

    grid.innerHTML = '<p class="loading-note">Memuat penginapan...</p>';

    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      if (!payload || payload.success !== true) {
        throw new Error((payload && payload.error) || "Respons API tidak valid");
      }

      if (id !== requestId) return; // abaikan respons lama

      currentData = Array.isArray(payload.data) ? payload.data : [];
      paint(currentData);
    } catch (err) {
      if (id !== requestId) return;
      countEl.textContent = "Gagal memuat data penginapan.";
      if (refundBadge) refundBadge.hidden = true;
      grid.innerHTML = errorTemplate();

      const retry = document.getElementById("retry-load");
      if (retry) retry.addEventListener("click", render);
    }
  }

  function resetFilter() {
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
    render();
  }

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", render);
  });

  loadWishlist();
  loadStats();
  render();
})();
