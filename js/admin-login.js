

(function () {
  "use strict";

  var AUTH_API = "api/auth.php";
  var ADMIN_URL = "admin.html";

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

  /* Tombol tampil/sembunyikan password */
  function bindPasswordToggle() {
    var button = document.querySelector("#adminLoginForm .js-toggle-password");
    if (!button) return;
    var wrapper = button.closest(".auth-input-icon");
    var input = wrapper ? wrapper.querySelector("input") : null;
    if (!input) return;

    button.addEventListener("click", function () {
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", show ? "true" : "false");
      button.setAttribute("aria-label", show ? "Sembunyikan password" : "Tampilkan password");
      button.classList.toggle("is-visible", show);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindPasswordToggle();

    var form = document.getElementById("adminLoginForm");
    if (!form) return;

    var emailInput = document.getElementById("adminLoginEmail");
    var passwordInput = document.getElementById("adminLoginPassword");
    var message = document.getElementById("adminLoginMessage");
    var submitBtn = form.querySelector('button[type="submit"]');

    [emailInput, passwordInput].forEach(function (input) {
      if (input) input.addEventListener("input", function () { clearMessage(message); });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearMessage(message);

      var email = emailInput ? emailInput.value.trim() : "";
      var password = passwordInput ? passwordInput.value : "";

      if (!email || !password) {
        showMessage(message, "Lengkapi email dan password admin terlebih dahulu.");
        return;
      }
      if (!isValidEmail(email)) {
        showMessage(message, "Format email tidak valid. Contoh: nama@email.com");
        return;
      }

      setBusy(submitBtn, true);

      fetch(AUTH_API, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          action: "admin_login",
          email: email,
          password: password
        })
      })
        .then(function (response) {
          return response.json().catch(function () { return null; }).then(function (payload) {
            if (!response.ok || !payload || payload.success !== true) {
              var error = new Error(
                (payload && (payload.error || payload.message)) ||
                "Tidak dapat terhubung ke server. Silakan coba lagi."
              );
              error.status = response.status;
              throw error;
            }
            return payload.data;
          });
        })
        .then(function () {
          window.location.href = ADMIN_URL;
        })
        .catch(function (error) {
          showMessage(
            message,
            (error && error.message) || "Gagal masuk sebagai admin. Silakan coba lagi.",
            "error"
          );
          setBusy(submitBtn, false);
        });
    });
  });
})();
