

(function () {
  "use strict";

  var numberID = new Intl.NumberFormat("id-ID");

  function formatRupiah(value) {
    return "Rp " + numberID.format(Number(value) || 0);
  }

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

  function instruksiHtml(metode) {
    var info = METODE_PEMBAYARAN[metode] || METODE_PEMBAYARAN.transfer_bca;
    return info.html;
  }

  window.IndoTripPemesanan = {
    formatRupiah: formatRupiah,
    qrisSvg: qrisSvg,
    metode: METODE_PEMBAYARAN,
    instruksiHtml: instruksiHtml
  };
})();
