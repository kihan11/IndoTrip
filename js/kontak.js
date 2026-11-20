
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var toast = document.getElementById('successToast');
  var toastClose = document.getElementById('toastClose');
  var submitButton = form.querySelector('[type="submit"]');
  var hideTimer;

  // Tempat pesan error umum (jaringan / server), dibuat agar HTML tidak diubah.
  var formError = document.createElement('div');
  formError.className = 'field-error';
  formError.setAttribute('role', 'alert');
  if (submitButton) {
    submitButton.parentNode.insertBefore(formError, submitButton);
  }

  function showToast() {
    clearTimeout(hideTimer);
    toast.classList.add('is-visible');
    hideTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    clearTimeout(hideTimer);
    toast.classList.remove('is-visible');
  }

  if (toastClose) {
    toastClose.addEventListener('click', hideToast);
  }

  var rules = {
    nama: {
      validate: function (value) { return value.trim().length >= 2; },
      empty: 'Nama lengkap wajib diisi.',
      invalid: 'Nama lengkap minimal 2 karakter.'
    },
    email: {
      validate: function (value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); },
      empty: 'Alamat email wajib diisi.',
      invalid: 'Masukkan alamat email yang valid.'
    },
    subjek: {
      validate: function (value) { return value.trim().length > 0; },
      empty: 'Subjek pesan wajib diisi.',
      invalid: 'Subjek pesan wajib diisi.'
    },
    pesan: {
      validate: function (value) { return value.trim().length >= 10; },
      empty: 'Pesan wajib diisi.',
      invalid: 'Pesan minimal 10 karakter.'
    }
  };

  function setError(input, message) {
    var field = input.closest('.contact-field');
    var error = field.querySelector('.field-error');
    if (message) {
      field.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      error.textContent = message;
    } else {
      field.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      error.textContent = '';
    }
  }

  function validateField(input) {
    var rule = rules[input.name];
    if (!rule) return true;

    var value = input.value.trim();
    var ok = rule.validate(value);
    setError(input, ok ? '' : (value === '' ? rule.empty : rule.invalid));
    return ok;
  }

  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];

    input.addEventListener('blur', function () {
      validateField(input);
    });

    input.addEventListener('input', function () {
      if (input.closest('.contact-field').classList.contains('is-invalid')) {
        validateField(input);
      }
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.textContent = '';

    var isValid = true;
    Object.keys(rules).forEach(function (name) {
      if (!validateField(form.elements[name])) isValid = false;
    });

    if (!isValid) {
      var firstInvalid = form.querySelector('.is-invalid input, .is-invalid textarea');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
    }

    fetch('api/kontak.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        nama: form.elements.nama.value.trim(),
        email: form.elements.email.value.trim(),
        subjek: form.elements.subjek.value.trim(),
        pesan: form.elements.pesan.value.trim()
      })
    })
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (payload) {
          if (!response.ok || !payload || payload.success !== true) {
            var error = new Error(
              (payload && (payload.error || payload.message)) || 'Gagal mengirim pesan. Silakan coba lagi.'
            );
            error.payload = payload || {};
            throw error;
          }
          return payload.data;
        });
      })
      .then(function () {
        form.reset();
        Object.keys(rules).forEach(function (name) {
          setError(form.elements[name], '');
        });
        showToast(); // Hanya jika server merespons sukses.
      })
      .catch(function (error) {
        // Tampilkan error validasi per field bila server mengirimkannya.
        var detail = error.payload && error.payload.detail;
        var firstInvalid = null;

        if (detail && typeof detail === 'object') {
          Object.keys(rules).forEach(function (name) {
            if (detail[name]) {
              setError(form.elements[name], String(detail[name]));
              if (!firstInvalid) firstInvalid = form.elements[name];
            }
          });
        }

        if (firstInvalid) {
          firstInvalid.focus();
        } else {
          formError.textContent = error.message || 'Gagal mengirim pesan. Silakan coba lagi.';
        }
      })
      .then(function () {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.removeAttribute('aria-busy');
        }
      });
  });
});
