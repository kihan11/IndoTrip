

(function () {
  "use strict";

  var API_URL = "api/auth.php";
  var PROFILE_URL = "profile.html";

  function initials(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "TI";
    var first = parts[0].charAt(0);
    var second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + second).toUpperCase();
  }

  function applyUser(user) {
    var name = String(user.name || user.nama || "").trim() || "Traveller IndoTrip";
    var inisial = initials(name);

    var actions = document.querySelector(".header-actions");
    if (actions) {
      var loginBtn = actions.querySelector(".btn-login");
      var registerBtn = actions.querySelector(".btn-register");
      var profileBtn = actions.querySelector(".btn-profile");
      var chip = actions.querySelector(".btn-user");

      if (loginBtn) loginBtn.style.display = "none";
      if (registerBtn) registerBtn.style.display = "none";

      /* Panel admin sengaja tidak ditampilkan di header web user. */
      var adminLink = actions.querySelector(".btn-admin");
      if (adminLink) adminLink.remove();

      if (!chip) {
        chip = document.createElement("a");
        chip.href = PROFILE_URL;
        chip.className = "btn-user";
        chip.innerHTML = '<span class="btn-user-avatar"></span><span class="btn-user-name"></span>';
        if (profileBtn) actions.insertBefore(chip, profileBtn);
        else actions.appendChild(chip);
      }

      chip.setAttribute("aria-label", "Profil " + name);
      chip.title = name;
      var avatar = chip.querySelector(".btn-user-avatar");
      var label = chip.querySelector(".btn-user-name");
      if (avatar) avatar.textContent = inisial;
      if (label) label.textContent = name;
    }

    var mobileLinks = document.querySelectorAll(".mobile-nav .mobile-login");
    Array.prototype.forEach.call(mobileLinks, function (link) {
      var href = link.getAttribute("href") || "";
      if (href.indexOf("login.html") !== -1 || href.indexOf("signup.html") !== -1) {
        link.style.display = "none";
      } else if (href.indexOf("profile.html") !== -1) {
        link.textContent = inisial + " " + name;
      }
    });

    /* Menu seluler juga bebas dari tautan panel admin. */
    var mobileAdmin = document.querySelector(".mobile-nav .mobile-admin");
    if (mobileAdmin) mobileAdmin.remove();
  }

  document.addEventListener("DOMContentLoaded", function () {
    fetch(API_URL + "?action=me", {
      method: "GET",
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    }).then(function (response) {
      if (!response.ok) return null;
      return response.json();
    }).then(function (data) {
      if (data && data.success === true && data.data) applyUser(data.data);
    }).catch(function () {
      /* Jika tidak login / server error, biarkan tombol Masuk & Daftar. */
    });
  });
})();
