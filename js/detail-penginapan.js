

(function () {
  "use strict";

  const API_URL = "api/penginapan.php";
  const ORDER_API = "api/pemesanan.php";
  const LOGIN_URL = "login.html";

  const content = document.getElementById("dp-content");
  const notFound = document.getElementById("dp-notfound");
  const id = (new URLSearchParams(window.location.search).get("id") || "").trim();

  /* Data penginapan aktif (dipakai form pemesanan). */
  let currentItem = null;

  function setText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value == null ? "" : String(value);
  }

  const numberID = new Intl.NumberFormat("id-ID");

  const CHECK =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>';

  const DOT_ORANGE =
    '<span class="dd-dot orange" aria-hidden="true"></span>';

  const CLOCK =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  function renderList(elementId, items, markup, className) {
    const container = document.getElementById(elementId);
    if (!container || !Array.isArray(items)) return;
    container.innerHTML = "";

    items.forEach(function (item) {
      const li = document.createElement("li");

      const icon = document.createElement("span");
      icon.innerHTML = markup;

      const iconNode = icon.firstChild;
      if (iconNode) {
        if (className && iconNode.classList) iconNode.classList.add(className);
        li.appendChild(iconNode);
      }

      const label = document.createElement("span");
      label.textContent = item;
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
      if (tag.isDistance) span.classList.add("dd-tag-distance");
      span.textContent = tag.label;
      container.appendChild(span);
    });
  }

  function showNotFound(message) {
    if (content) content.hidden = true;
    if (notFound) notFound.hidden = false;
    if (message) {
      const el = document.getElementById("dp-notfound-message");
      if (el) el.textContent = message;
    }
    document.title = "Penginapan tidak ditemukan — IndoTrip";
  }

  if (!id) {
    showNotFound();
    return;
  }

  function fillPage(data) {
    document.title = data.nama + " — IndoTrip";
    currentItem = data;

    const orderBtn = document.getElementById("dpOrderBtn");
    if (orderBtn) orderBtn.hidden = false;
    const subtitle = document.getElementById("dpOrderSubtitle");
    if (subtitle) {
      subtitle.textContent = data.nama + (data.lokasi ? " — " + data.lokasi : "");
    }

    /* Hero */
    const hero = document.getElementById("dp-hero");
    if (hero) {
      const foto = data.gambarHero || data.gambar;
      if (foto) hero.style.backgroundImage = 'url("' + foto + '")';
      hero.setAttribute("aria-label", "Foto " + data.nama);
    }

    /* Kartu identitas */
    renderTags("dp-tags", [
      { label: data.tipe },
      { label: data.pulau },
      { label: data.jarak, isDistance: true }
    ]);

    setText("dp-nama", data.nama);
    setText("dp-alamat", data.alamatLengkap || data.lokasi);
    setText("dp-rating", Number(data.rating).toFixed(1));
    setText("dp-ulasan", "(" + numberID.format(data.ulasan || 0) + " ulasan)");
    setText("dp-checkin-card", data.checkIn);
    setText("dp-checkout-card", data.checkOut);
    setText("dp-harga", "Rp " + numberID.format(data.harga));

    const maps = document.getElementById("dp-maps");
    if (maps) {
      const query = encodeURIComponent(
        data.nama + ", " + (data.alamatLengkap || data.lokasi)
      );
      maps.href = "https://www.google.com/maps/search/?api=1&query=" + query;
      maps.setAttribute("aria-label", "Buka " + data.nama + " di Google Maps");
    }

    /* Informasi */
    setText("dp-checkin", data.checkIn);
    setText("dp-checkout", data.checkOut);
    setText(
      "dp-rating-info",
      data.ratingLabel || Number(data.rating).toFixed(1) + " / 5.0"
    );

    /* Tentang, fasilitas, tips & kebijakan */
    setText("dp-tentang-judul", data.tentangJudul || "Tentang " + data.nama);
    setText("dp-deskripsi", data.deskripsi);

    const fasilitasDetail =
      data.fasilitasDetail && data.fasilitasDetail.length
        ? data.fasilitasDetail
        : (data.fasilitas || []).map(function (f) {
            return f.nama;
          });
    renderList("dp-fasilitas", fasilitasDetail, CHECK, "dd-icon-check");
    renderList("dp-tips", data.tips, DOT_ORANGE);
    renderList("dp-kebijakan", data.kebijakan, CLOCK, "dd-icon-clock");

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
    const btn = document.getElementById("dpOrderBtn");
    const modalEl = document.getElementById("dpOrderModal");
    if (!btn || !modalEl) return;

    const helper = window.IndoTripPemesanan || {};
    const instruksiHtml = helper.instruksiHtml || function () { return ""; };

    const formStep1 = document.getElementById("dpOrderFormStep1");
    const formBayar = document.getElementById("dpOrderFormBayar");
    const step1 = document.getElementById("dpOrderStep1");
    const step2 = document.getElementById("dpOrderStep2");
    const success = document.getElementById("dpOrderSuccess");
    const footer = document.getElementById("dpOrderFooter");
    const errorEl = document.getElementById("dpOrderError");
    const subtitle = document.getElementById("dpOrderSubtitle");
    const step1Label = document.getElementById("dpStep1Label");
    const step2Label = document.getElementById("dpStep2Label");
    const tanggal = document.getElementById("dpOrderTanggal");
    const jumlah = document.getElementById("dpOrderJumlah");
    const catatan = document.getElementById("dpOrderCatatan");
    const breakSatuan = document.getElementById("dpBreakSatuan");
    const breakJumlah = document.getElementById("dpBreakJumlah");
    const breakTotal = document.getElementById("dpBreakTotal");
    const nextBtn = document.getElementById("dpOrderNext");
    const backBtn = document.getElementById("dpOrderBack");
    const batalBtn = document.getElementById("dpOrderBatal");
    const submitBtn = document.getElementById("dpOrderSubmit");
    const metodeHidden = document.getElementById("dpPayMetode");
    const instruksi = document.getElementById("dpPayInstruksi");
    const bayarTotal = document.getElementById("dpPayTotal");
    const uploadWrap = document.getElementById("dpPayUploadWrap");
    const gratisEl = document.getElementById("dpPayGratis");
    const fileInput = document.getElementById("dpPayBukti");
    const previewWrap = document.getElementById("dpPayPreviewWrap");
    const preview = document.getElementById("dpPayPreview");
    const kodeEl = document.getElementById("dpOrderKode");
    const totalEl = document.getElementById("dpOrderTotal");
    const nextNote = document.getElementById("dpOrderNextNote");
    const methodInputs = modalEl.querySelectorAll('input[name="dp_pay_method"]');

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

    function jumlahMalam() {
      const n = parseInt(jumlah ? jumlah.value : "1", 10);
      return !Number.isFinite(n) || n < 1 ? 1 : Math.min(n, 50);
    }

    /* Rincian harga di step 1. Total final tetap dihitung ulang di server. */
    function updateRincian() {
      const satuan = Number(currentItem && currentItem.harga) || 0;
      const n = jumlahMalam();
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
          : "Penginapan gratis — pesanan langsung aktif. Cek kode booking di Riwayat Pemesanan.";
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
        showError("Isi tanggal dan jumlah malam dengan benar (1–50).");
        return null;
      }
      if (tanggal && tanggal.min && tanggalVal < tanggal.min) {
        showError("Tanggal check-in tidak boleh sebelum hari ini.");
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
        data.append("jenis", "penginapan");
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
      showNotFound("Data penginapan tidak dapat dimuat. Silakan coba lagi nanti.");
    });
})();
