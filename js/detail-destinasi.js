

(function () {
  "use strict";

  const API_URL = "api/destinasi.php";
  const ORDER_API = "api/pemesanan.php";
  const LOGIN_URL = "login.html";

  const content = document.getElementById("dd-content");
  const notFound = document.getElementById("dd-notfound");
  const id = (new URLSearchParams(window.location.search).get("id") || "").trim();

  /* Data destinasi aktif (dipakai form pemesanan). */
  let currentItem = null;

  function setText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value == null ? "" : String(value);
  }

  const numberID = new Intl.NumberFormat("id-ID");

  const DOT_GREEN =
    '<span class="dd-dot" aria-hidden="true"></span>';

  const DOT_ORANGE =
    '<span class="dd-dot orange" aria-hidden="true"></span>';

  function renderList(elementId, items, dot) {
    const container = document.getElementById(elementId);
    if (!container || !Array.isArray(items)) return;
    container.innerHTML = "";

    items.forEach(function (item) {
      const li = document.createElement("li");
      const marker = document.createElement("span");
      marker.innerHTML = dot || DOT_GREEN;
      const label = document.createElement("span");
      label.textContent = item;
      if (marker.firstChild) li.appendChild(marker.firstChild);
      li.appendChild(label);
      container.appendChild(li);
    });
  }

  function renderTags(elementId, tags) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = "";

    (tags || []).forEach(function (tag) {
      const span = document.createElement("span");
      span.className = "dd-tag";
      span.textContent = tag;
      container.appendChild(span);
    });
  }

  function showNotFound(message) {
    if (content) content.hidden = true;
    if (notFound) notFound.hidden = false;
    if (message) {
      const el = document.getElementById("dd-notfound-message");
      if (el) el.textContent = message;
    }
    document.title = "Destinasi tidak ditemukan — IndoTrip";
  }

  if (!id) {
    showNotFound();
    return;
  }

  function fillPage(data) {
    document.title = data.nama + " — IndoTrip";
    currentItem = data;

    const orderBtn = document.getElementById("ddOrderBtn");
    if (orderBtn) orderBtn.hidden = false;
    const subtitle = document.getElementById("ddOrderSubtitle");
    if (subtitle) {
      subtitle.textContent = data.nama + (data.lokasi ? " — " + data.lokasi : "");
    }

    /* Hero */
    const hero = document.getElementById("dd-hero");
    if (hero) {
      const foto = data.gambarHero || data.gambar;
      if (foto) hero.style.backgroundImage = 'url("' + foto + '")';
      hero.setAttribute("aria-label", "Foto " + data.nama);
    }

    /* Kartu identitas */
    renderTags("dd-tags", [data.pulau].concat(data.tipe || []));
    setText("dd-nama", data.nama);
    setText("dd-lokasi", data.lokasiLengkap || data.lokasi);
    setText("dd-rating", Number(data.rating).toFixed(1));
    setText("dd-ulasan", numberID.format(data.ulasan || 0) + " ulasan Google");

    const maps = document.getElementById("dd-maps");
    if (maps) {
      const query = encodeURIComponent(data.nama + ", " + data.lokasi);
      maps.href = "https://www.google.com/maps/search/?api=1&query=" + query;
      maps.setAttribute("aria-label", "Buka " + data.nama + " di Google Maps");
    }

    /* Informasi */
    setText("dd-jam", data.jam);
    setText("dd-jam-catatan", data.jamCatatan);
    setText(
      "dd-htm",
      data.htm || (Number(data.harga) === 0 ? "Gratis" : "Rp " + numberID.format(data.harga))
    );
    setText("dd-htm-catatan", data.htmCatatan || "/ orang");
    setText("dd-lokasi-info", data.lokasi);

    /* Tentang, fasilitas & tips */
    setText("dd-tentang-judul", "Tentang " + data.nama);
    setText("dd-deskripsi", data.deskripsi);
    renderList("dd-fasilitas", data.fasilitas, DOT_GREEN);
    renderList("dd-tips", data.tips, DOT_ORANGE);

    if (content) content.hidden = false;
    if (notFound) notFound.hidden = true;
  }

  function todayISO() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  }

  function formatRupiah(value) {
    return "Rp " + numberID.format(Number(value) || 0);
  }

  function initOrder() {
    const btn = document.getElementById("ddOrderBtn");
    const modalEl = document.getElementById("ddOrderModal");
    if (!btn || !modalEl) return;

    const helper = window.IndoTripPemesanan || {};
    const instruksiHtml = helper.instruksiHtml || function () { return ""; };

    const formStep1 = document.getElementById("ddOrderFormStep1");
    const formBayar = document.getElementById("ddOrderFormBayar");
    const step1 = document.getElementById("ddOrderStep1");
    const step2 = document.getElementById("ddOrderStep2");
    const success = document.getElementById("ddOrderSuccess");
    const footer = document.getElementById("ddOrderFooter");
    const errorEl = document.getElementById("ddOrderError");
    const subtitle = document.getElementById("ddOrderSubtitle");
    const step1Label = document.getElementById("ddStep1Label");
    const step2Label = document.getElementById("ddStep2Label");
    const tanggal = document.getElementById("ddOrderTanggal");
    const jumlah = document.getElementById("ddOrderJumlah");
    const catatan = document.getElementById("ddOrderCatatan");
    const breakSatuan = document.getElementById("ddBreakSatuan");
    const breakJumlah = document.getElementById("ddBreakJumlah");
    const breakTotal = document.getElementById("ddBreakTotal");
    const nextBtn = document.getElementById("ddOrderNext");
    const backBtn = document.getElementById("ddOrderBack");
    const batalBtn = document.getElementById("ddOrderBatal");
    const submitBtn = document.getElementById("ddOrderSubmit");
    const metodeHidden = document.getElementById("ddPayMetode");
    const instruksi = document.getElementById("ddPayInstruksi");
    const bayarTotal = document.getElementById("ddPayTotal");
    const uploadWrap = document.getElementById("ddPayUploadWrap");
    const gratisEl = document.getElementById("ddPayGratis");
    const fileInput = document.getElementById("ddPayBukti");
    const previewWrap = document.getElementById("ddPayPreviewWrap");
    const preview = document.getElementById("ddPayPreview");
    const kodeEl = document.getElementById("ddOrderKode");
    const totalEl = document.getElementById("ddOrderTotal");
    const nextNote = document.getElementById("ddOrderNextNote");
    const methodInputs = modalEl.querySelectorAll('input[name="dd_pay_method"]');

    if (!formStep1 || !formBayar || !step1 || !step2) return;

    let modal = null;
    let totalTagihan = 0;
    let paksaBukti = false; // true jika server menyatakan item berbayar

    function clearError() {
      if (errorEl) {
        errorEl.textContent = "";
        errorEl.hidden = true;
      }
    }

    function showError(message) {
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
    }

    function jumlahOrang() {
      const n = parseInt(jumlah ? jumlah.value : "1", 10);
      return !Number.isFinite(n) || n < 1 ? 1 : Math.min(n, 50);
    }

    /* Rincian harga di step 1. Total final tetap dihitung ulang di server. */
    function updateRincian() {
      const satuan = Number(currentItem && currentItem.harga) || 0;
      const n = jumlahOrang();
      totalTagihan = satuan * n;
      if (breakSatuan) breakSatuan.textContent = formatRupiah(satuan);
      if (breakJumlah) breakJumlah.textContent = String(n);
      if (breakTotal) {
        breakTotal.textContent = totalTagihan === 0 ? "Gratis" : formatRupiah(totalTagihan);
      }
    }
    if (jumlah) jumlah.addEventListener("input", updateRincian);

    function metodeAktif() {
      let val = "transfer_bca";
      Array.prototype.forEach.call(methodInputs, function (input) {
        const label = input.closest(".pay-method");
        if (input.checked) {
          val = input.value;
          if (label) label.classList.add("is-active");
        } else if (label) {
          label.classList.remove("is-active");
        }
      });
      if (metodeHidden) metodeHidden.value = val;
      return val;
    }

    /* Siapkan tampilan step 2 memakai total yang sudah dihitung di step 1. */
    function siapStep2() {
      updateRincian();
      if (instruksi) instruksi.innerHTML = instruksiHtml(metodeAktif());
      if (bayarTotal) {
        bayarTotal.textContent = totalTagihan === 0 ? "Gratis" : formatRupiah(totalTagihan);
      }
      const gratis = totalTagihan === 0;
      const butuhBukti = !gratis || paksaBukti;
      if (uploadWrap) uploadWrap.hidden = !butuhBukti;
      if (gratisEl) gratisEl.hidden = butuhBukti;
      if (submitBtn) submitBtn.textContent = butuhBukti ? "Bayar & Kirim" : "Konfirmasi Pemesanan";
      if (nextNote) {
        nextNote.textContent = butuhBukti
          ? "Status verifikasi pembayaran dapat dilihat di tab Riwayat Pemesanan pada halaman profilmu."
          : "Destinasi gratis — tiket langsung aktif. Cek kode booking di Riwayat Pemesanan.";
      }
    }

    function resetPreview() {
      if (preview && preview.src && preview.src.indexOf("blob:") === 0) {
        URL.revokeObjectURL(preview.src);
      }
      if (preview) preview.removeAttribute("src");
      if (previewWrap) previewWrap.hidden = true;
      if (fileInput) fileInput.value = "";
    }

    function tampilkanLangkah(n) {
      if (step1) step1.hidden = n !== 1;
      if (step2) step2.hidden = n !== 2;
      if (success) success.hidden = true;
      if (footer) footer.hidden = false;
      if (nextBtn) nextBtn.hidden = n !== 1;
      if (backBtn) backBtn.hidden = n !== 1;
      if (batalBtn) batalBtn.hidden = false;
      if (submitBtn) submitBtn.hidden = n !== 2;
      if (step1Label) step1Label.classList.toggle("is-active", n === 1);
      if (step2Label) step2Label.classList.toggle("is-active", n === 2);
      clearError();
      if (n === 2) siapStep2();
    }

    function closeModal() {
      if (modal) {
        modal.hide();
      } else {
        modalEl.classList.remove("show");
        modalEl.style.display = "none";
      }
    }

    /* Fallback penutup modal bila Bootstrap tidak tersedia. */
    modalEl.querySelectorAll('[data-bs-dismiss="modal"]').forEach(function (el) {
      el.addEventListener("click", function () {
        if (!modal) closeModal();
      });
    });

    btn.addEventListener("click", function () {
      if (subtitle && currentItem) {
        subtitle.textContent =
          currentItem.nama + (currentItem.lokasi ? " — " + currentItem.lokasi : "");
      }
      const today = todayISO();
      if (tanggal) {
        tanggal.min = today;
        if (!tanggal.value || tanggal.value < today) tanggal.value = today;
      }
      if (catatan) catatan.value = "";
      paksaBukti = false;
      Array.prototype.forEach.call(methodInputs, function (input) {
        input.checked = input.value === "transfer_bca";
      });
      if (metodeHidden) metodeHidden.value = "transfer_bca";
      resetPreview();
      updateRincian();
      tampilkanLangkah(1);

      if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
        modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      } else {
        modalEl.classList.add("show");
        modalEl.style.display = "block";
      }
    });

    function validasiStep1() {
      const tanggalVal = tanggal ? tanggal.value.trim() : "";
      const jumlahVal = parseInt(jumlah ? jumlah.value : "1", 10);
      if (!tanggalVal || !Number.isFinite(jumlahVal) || jumlahVal < 1 || jumlahVal > 50) {
        showError("Isi tanggal dan jumlah orang dengan benar (1–50).");
        return null;
      }
      if (tanggal && tanggal.min && tanggalVal < tanggal.min) {
        showError("Tanggal kunjungan tidak boleh sebelum hari ini.");
        return null;
      }
      clearError();
      return {
        tanggal: tanggalVal,
        jumlah: jumlahVal,
        catatan: catatan ? catatan.value.trim() : ""
      };
    }

    function lanjutBayar() {
      if (validasiStep1()) tampilkanLangkah(2);
    }

    if (formStep1) {
      formStep1.addEventListener("submit", function (event) {
        event.preventDefault();
        lanjutBayar();
      });
    }
    if (nextBtn) nextBtn.addEventListener("click", lanjutBayar);
    if (backBtn) backBtn.addEventListener("click", function () { tampilkanLangkah(1); });

    Array.prototype.forEach.call(methodInputs, function (input) {
      input.addEventListener("change", function () {
        if (instruksi) instruksi.innerHTML = instruksiHtml(metodeAktif());
      });
    });

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        clearError();
        const file = fileInput.files && fileInput.files[0];
        if (!file || !preview || !previewWrap) return;
        if (preview.src && preview.src.indexOf("blob:") === 0) {
          URL.revokeObjectURL(preview.src);
        }
        preview.src = URL.createObjectURL(file);
        previewWrap.hidden = false;
      });
    }

    if (formBayar) {
      formBayar.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!currentItem) return;

        const valid = validasiStep1();
        if (!valid) {
          tampilkanLangkah(1);
          return;
        }

        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        const butuhBukti = totalTagihan > 0 || paksaBukti;
        if (butuhBukti) {
          if (!file) {
            showError("Pilih file bukti pembayaran terlebih dahulu.");
            return;
          }
          if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) === -1) {
            showError("Format bukti harus JPG, PNG, atau WebP.");
            return;
          }
          if (file.size > 2 * 1024 * 1024) {
            showError("Ukuran bukti pembayaran maksimal 2 MB.");
            return;
          }
        }

        /* Kirim sekaligus: detail pesanan + metode + bukti (multipart). */
        const data = new FormData();
        data.append("item_id", currentItem.id);
        data.append("jenis", "destinasi");
        data.append("tanggal_kunjungan", valid.tanggal);
        data.append("jumlah", String(valid.jumlah));
        data.append("catatan", valid.catatan);
        data.append("metode_pembayaran", metodeHidden ? metodeHidden.value : "transfer_bca");
        if (butuhBukti && file) data.append("bukti", file);

        clearError();
        submitBtn.disabled = true;

        fetch(ORDER_API, {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          body: data
        })
          .then(function (response) {
            return response.json().catch(function () { return null; }).then(function (payload) {
              if (!response.ok || !payload || payload.success !== true) {
                const error = new Error(
                  (payload && (payload.error || payload.message)) || "Gagal menyimpan pemesanan."
                );
                error.status = response.status;
                throw error;
              }
              return payload.data;
            });
          })
          .then(function (res) {
            if (step1) step1.hidden = true;
            if (step2) step2.hidden = true;
            if (footer) footer.hidden = true;
            if (kodeEl) kodeEl.textContent = res.kode_booking;
            if (totalEl) totalEl.textContent = "Total: " + formatRupiah(res.total_harga);
            if (success) success.hidden = false;
          })
          .catch(function (error) {
            if (error && error.status === 401) {
              window.location.href = LOGIN_URL;
              return;
            }
            const pesan = (error && error.message) || "Gagal menyimpan pemesanan.";
            /* Harga bisa berubah di panel admin setelah halaman dibuka. */
            if (!paksaBukti && /bukti/i.test(pesan)) {
              paksaBukti = true;
              siapStep2();
              showError("Item ini ternyata berbayar. Silakan unggah bukti pembayaran.");
              return;
            }
            showError(pesan);
          })
          .then(function () {
            submitBtn.disabled = false;
          });
      });
    }
  }

  initOrder();

  fetch(API_URL + "?id=" + encodeURIComponent(id), {
    headers: { Accept: "application/json" }
  })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (payload) {
      const data = payload && payload.success === true ? payload.data : null;
      if (!data || !data.nama) {
        showNotFound();
        return;
      }
      fillPage(data);
    })
    .catch(function () {
      showNotFound("Data destinasi tidak dapat dimuat. Silakan coba lagi nanti.");
    });
})();
