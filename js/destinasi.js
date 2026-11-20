

(function () {
  "use strict";

  const grid = document.getElementById("cards-grid");
  const countEl = document.getElementById("results-count");
  if (!grid || !countEl) return;

  const API_URL = "api/destinasi.php";

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  const params = new URLSearchParams(window.location.search);
  let rawQuery = params.get("q") || "";
  let searchQuery = normalizeText(rawQuery);

  const tipeParams = [];
  params.getAll("tipe").forEach((value) => {
    String(value).split(",").forEach((part) => {
      const tipe = part.trim();
      if (tipe) tipeParams.push(tipe);
    });
  });

  const ICON = {
    pin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    star: `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z"/></svg>`,
    clock: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    cash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 10v4M17.5 10v4"/></svg>`,
    send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 3-7.5 18-3.2-7.3L3 10.5 21 3Z"/><path d="M21 3 10.3 13.7"/></svg>`,
    empty: `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`
  };

  const numberID = new Intl.NumberFormat("id-ID");

  function formatHarga(harga) {
    return Number(harga) === 0 ? "Gratis" : `Rp ${numberID.format(harga)}`;
  }

  function detailUrl(destinasi) {
    return `detail-destinasi.html?id=${encodeURIComponent(destinasi.id)}`;
  }

  function cardTemplate(destinasi) {
    const href = detailUrl(destinasi);

    return `
      <article class="dest-card" data-id="${destinasi.id}">
        <div class="card-media">
          <a href="${href}" aria-label="Lihat detail ${destinasi.nama}">
            <img src="${destinasi.gambar || ""}" alt="${destinasi.alt || ""}" loading="lazy" decoding="async" />
          </a>
          <span class="price-badge">
            ${ICON.cash}
            ${formatHarga(destinasi.harga)}
          </span>
        </div>
        <div class="card-body">
          <p class="location">
            ${ICON.pin}
            <span>${destinasi.lokasi || ""}</span>
          </p>
          <h3 class="dest-title">
            <a href="${href}">${destinasi.nama}</a>
          </h3>
          <div class="rating-row">
            <span class="rating-badge">
              ${ICON.star}
              ${Number(destinasi.rating).toFixed(1)}
            </span>
            <span class="reviews">(${numberID.format(destinasi.ulasan || 0)} ulasan)</span>
          </div>
          <div class="hours">
            ${ICON.clock}
            <span>${destinasi.jam || ""}</span>
          </div>
          <div class="card-actions">
            <a href="${href}" class="btn-detail">Lihat Detail</a>
            <button type="button" class="btn-send" aria-label="Simpan ${destinasi.nama}">
              ${ICON.send}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function emptyTemplate() {
    return `
      <div class="empty-state">
        ${ICON.empty}
        <h3>Tidak ada destinasi yang cocok</h3>
        <p>Coba ubah atau hapus pilihan filter Anda.</p>
        <button type="button" class="btn-reset" id="reset-filter">Reset Filter</button>
      </div>
    `;
  }

  function errorTemplate() {
    return `
      <div class="empty-state">
        ${ICON.empty}
        <h3>Gagal memuat destinasi</h3>
        <p>Pastikan server PHP berjalan dan database sudah diimpor.</p>
        <button type="button" class="btn-reset" id="retry-load">Coba Lagi</button>
      </div>
    `;
  }

  const WISHLIST_API = "api/wishlist.php";
  const LOGIN_URL = "login.html";

  /* Data hasil fetch terakhir — dipakai tombol wishlist. */
  let currentData = [];

  /* id destinasi yang sudah disimpan user yang login. */
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
            .filter((item) => item && item.jenis === "destinasi")
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
    grid.querySelectorAll(".btn-send").forEach((button) => {
      const card = button.closest(".dest-card");
      const id = card ? card.getAttribute("data-id") : "";
      const destinasi = currentData.find((item) => item.id === id);
      if (destinasi) {
        applyButtonState(button, savedIds.has(String(id)), destinasi.nama);
      }
    });
  }

  function bindWishlistButtons() {
    grid.querySelectorAll(".btn-send").forEach((button) => {
      if (button.dataset.wishBound === "1") return;
      button.dataset.wishBound = "1";

      const card = button.closest(".dest-card");
      const id = card ? card.getAttribute("data-id") : "";
      const destinasi = currentData.find((item) => item.id === id);
      if (!destinasi) return;

      applyButtonState(button, savedIds.has(String(id)), destinasi.nama);

      button.addEventListener("click", () => {
        if (button.disabled) return;
        button.disabled = true;

        apiFetch(WISHLIST_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ jenis: "destinasi", item_id: String(id) })
        })
          .then((result) => {
            const saved = Boolean(result && result.saved);
            if (saved) savedIds.add(String(id));
            else savedIds.delete(String(id));
            applyButtonState(button, saved, destinasi.nama);
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

  /* Centang checkbox "Tipe Wisata" sesuai parameter ?tipe= di URL. */
  if (tipeParams.length) {
    checkboxes.forEach((checkbox) => {
      if (checkbox.name !== "tipe") return;
      const value = normalizeText(checkbox.value);
      checkbox.checked = tipeParams.some((tipe) => normalizeText(tipe) === value);
    });
  }

  function syncSelected() {
    selected.pulau.clear();
    selected.tipe.clear();

    checkboxes.forEach((checkbox) => {
      if (!checkbox.checked) return;
      if (selected[checkbox.name]) selected[checkbox.name].add(checkbox.value);
    });
  }

  let filterInfo = null;

  function buildFilterLabel() {
    const parts = [];
    if (rawQuery) parts.push(`kata kunci: “${rawQuery}”`);
    const activeCount = checkboxes.filter((checkbox) => checkbox.checked).length;
    if (activeCount) parts.push(`${activeCount} filter aktif`);
    return parts.join(" · ");
  }

  function updateFilterInfo() {
    const adaFilter =
      Boolean(searchQuery) || checkboxes.some((checkbox) => checkbox.checked);

    if (!adaFilter) {
      if (filterInfo) filterInfo.remove();
      filterInfo = null;
      return;
    }

    if (!filterInfo || !filterInfo.isConnected) {
      filterInfo = document.createElement("div");
      filterInfo.className = "active-filter-info";
      countEl.insertAdjacentElement("afterend", filterInfo);
    }

    const label = document.createElement("span");
    label.className = "active-filter-text";
    label.textContent = buildFilterLabel();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-reset-small";
    button.textContent = "Reset Filter";
    button.addEventListener("click", resetFilter);

    filterInfo.replaceChildren(label, button);
  }

  let requestId = 0;

  function buildApiUrl() {
    syncSelected();
    const query = new URLSearchParams();

    if (searchQuery) query.set("q", rawQuery);
    selected.pulau.forEach((value) => query.append("pulau", value));
    selected.tipe.forEach((value) => query.append("tipe", value));

    const qs = query.toString();
    return qs ? `${API_URL}?${qs}` : API_URL;
  }

  function paint(hasil) {
    grid.innerHTML =
      hasil.length > 0 ? hasil.map(cardTemplate).join("") : emptyTemplate();

    const jumlah = hasil.length;
    countEl.textContent = jumlah
      ? `Menampilkan ${jumlah} destinasi wisata terbaik untuk Anda.`
      : "Tidak ada destinasi yang sesuai dengan filter Anda.";

    updateFilterInfo();

    const resetButton = document.getElementById("reset-filter");
    if (resetButton) resetButton.addEventListener("click", resetFilter);

    bindWishlistButtons();
  }

  async function render() {
    const id = ++requestId;
    const url = buildApiUrl();

    grid.innerHTML = '<p class="loading-note">Memuat destinasi...</p>';

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
      countEl.textContent = "Gagal memuat data destinasi.";
      grid.innerHTML = errorTemplate();
      updateFilterInfo();

      const retry = document.getElementById("retry-load");
      if (retry) retry.addEventListener("click", render);
    }
  }

  function resetFilter() {
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
    searchQuery = "";
    rawQuery = "";
    window.history.replaceState({}, "", window.location.pathname);
    render();
  }

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", render);
  });

  loadWishlist();
  render();
})();
