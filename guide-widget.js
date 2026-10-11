/* Module « Comment ça marche » — Gabon Sport Connect
   Fichier autonome, sans bibliothèque. Tout se règle dans CONFIG. */
(function () {
  "use strict";

  var CONFIG = {
    homePathRegex: /(^\/$|\/index\.html$|\/gabon-sport-connect\/?$)/i,
    adminPathRegex: /admin/i,
    menuAnchor: { textRegex: /accueil|home/i, hrefContains: "index" }, // null = ne pas toucher au menu
    menuLabel: "❓ Comment ça marche",
    toast: { text: "❓ Nouveau ? Touchez pour découvrir comment ça marche", delayMs: 1500, durationMs: 8000, oncePerSession: true },
    fab: { text: "❓ Guide", position: "bottom-right" },
    color: "#0a7d3b",
    defaultRole: { normal: "visiteur", admin: "admin" },
    roles: [
      {
        id: "visiteur", label: "Visiteur",
        intro: "Vous découvrez Gabon Sport Connect sans compte.",
        secs: [
          { t: "✅ Ce que je peux faire", p: ["Parcourez l'annuaire des clubs et structures sportives.", "Consultez les actualités et les publications publiques.", "Découvrez les sports pratiqués au Gabon."] },
          { t: "⚠️ Ce que je dois faire", p: ["Créez un compte pour publier ou réagir.", "Renseignez des informations exactes à l'inscription."] },
          { t: "🔧 Comment faire", p: ["Touchez Inscription depuis l'accueil.", "Remplissez le formulaire puis validez.", "Connectez-vous ensuite avec votre compte."] },
          { t: "⭐ Points importants", p: ["Ne partagez jamais votre mot de passe.", "Votre compte peut être vérifié avant activation complète."] }
        ]
      },
      {
        id: "membre", label: "Membre",
        intro: "Vous êtes inscrit : joueur, athlète ou supporter.",
        secs: [
          { t: "✅ Ce que je peux faire", p: ["Complétez votre profil sportif.", "Publiez, réagissez et commentez dans la communauté.", "Suivez les clubs et structures de votre choix."] },
          { t: "⚠️ Ce que je dois faire", p: ["Complétez votre profil pour être mieux visible.", "Respectez les règles de la communauté."] },
          { t: "🔧 Comment faire", p: ["Ouvrez votre profil depuis le menu.", "Touchez Modifier puis enregistrez.", "Ajoutez une photo nette et récente."] },
          { t: "⭐ Points importants", p: ["Les contenus inappropriés sont modérés et supprimés.", "Ne publiez aucune donnée privée d'autrui."] }
        ]
      },
      {
        id: "club", label: "Club / Structure",
        intro: "Vous gérez un club ou une structure sportive.",
        secs: [
          { t: "✅ Ce que je peux faire", p: ["Présentez votre structure : bio, infrastructures, palmarès.", "Publiez les actualités de votre club.", "Soyez visible dans l'annuaire."] },
          { t: "⚠️ Ce que je dois faire", p: ["Envoyez les documents demandés pour validation.", "Gardez vos informations à jour."] },
          { t: "🔧 Comment faire", p: ["Ouvrez le formulaire de votre structure.", "Remplissez chaque rubrique puis envoyez.", "Attendez la décision de l'administration."] },
          { t: "⭐ Points importants", p: ["Un dossier incomplet peut être refusé.", "Vérifiez vos documents avant l'envoi."] }
        ]
      },
      {
        id: "admin", label: "Administrateur",
        intro: "Vous gérez la plateforme et validez les demandes.",
        secs: [
          { t: "✅ Ce que je peux faire", p: ["Validez ou refusez les clubs et structures.", "Modérez les publications et commentaires.", "Gérez les membres et les contenus."] },
          { t: "⚠️ Ce que je dois faire", p: ["Traitez les demandes en attente régulièrement.", "Vérifiez les documents avant toute validation."] },
          { t: "🔧 Comment faire", p: ["Ouvrez le tableau de bord administrateur.", "Choisissez la rubrique à traiter.", "Validez ou refusez, puis confirmez."] },
          { t: "⭐ Points importants", p: ["Vérifiez bien avant de supprimer : action définitive.", "Ne communiquez jamais vos accès."] }
        ]
      }
    ]
  };

  var path = location.pathname;
  var isAdmin = CONFIG.adminPathRegex.test(path);
  var isHome = !isAdmin && CONFIG.homePathRegex.test(path);
  var C = CONFIG.color;
  var current = null;

  function el(tag, props, kids) {
    var e = document.createElement(tag);
    if (props) for (var k in props) {
      if (k === "style") e.style.cssText = props[k];
      else if (k === "text") e.textContent = props[k];
      else e.setAttribute(k, props[k]);
    }
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  function injectCss() {
    var s = el("style");
    s.textContent =
      ".gw-toast{position:fixed;left:12px;right:12px;bottom:78px;max-width:420px;margin:0 auto;background:" + C + ";color:#fff;padding:12px 40px 12px 14px;border-radius:12px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3);z-index:99998;cursor:pointer}" +
      ".gw-x{position:absolute;right:8px;top:6px;background:none;border:0;color:#fff;font-size:18px;cursor:pointer}" +
      ".gw-fab{position:fixed;bottom:16px;" + (CONFIG.fab.position.indexOf("left") > -1 ? "left" : "right") + ":14px;background:" + C + ";color:#fff;border:0;border-radius:24px;padding:12px 16px;font:600 14px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);z-index:99997;cursor:pointer}" +
      ".gw-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:10px}" +
      ".gw-box{background:#fff;color:#222;width:100%;max-width:520px;max-height:90vh;overflow:auto;border-radius:14px;font:14px/1.45 system-ui,sans-serif}" +
      ".gw-hd{position:sticky;top:0;background:" + C + ";color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;font-weight:700}" +
      ".gw-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid #eee}" +
      ".gw-tab{border:1px solid " + C + ";background:#fff;color:" + C + ";border-radius:16px;padding:6px 12px;font-size:13px;cursor:pointer}" +
      ".gw-tab.on{background:" + C + ";color:#fff}" +
      ".gw-body{padding:12px 14px}.gw-body h4{margin:14px 0 4px;color:" + C + "}.gw-body ul{margin:0;padding-left:18px}.gw-body li{margin:3px 0}";
    document.head.appendChild(s);
  }

  function renderBody(box, id) {
    var role = CONFIG.roles.filter(function (r) { return r.id === id; })[0] || CONFIG.roles[0];
    current = role.id;
    box.innerHTML = "";
    box.appendChild(el("p", { text: role.intro, style: "margin:0 0 4px;font-style:italic" }));
    role.secs.forEach(function (sec) {
      box.appendChild(el("h4", { text: sec.t }));
      var ul = el("ul");
      sec.p.forEach(function (t) { ul.appendChild(el("li", { text: t })); });
      box.appendChild(ul);
    });
  }

  function open(roleId) {
    if (document.getElementById("gw-ov")) return;
    var start = roleId || (isAdmin ? CONFIG.defaultRole.admin : CONFIG.defaultRole.normal);
    var body = el("div", { class: "gw-body" });
    var tabs = el("div", { class: "gw-tabs" });
    CONFIG.roles.forEach(function (r) {
      var b = el("button", { class: "gw-tab", text: r.label, type: "button" });
      b.onclick = function () {
        Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        renderBody(body, r.id);
      };
      b.setAttribute("data-id", r.id);
      tabs.appendChild(b);
    });
    var close = el("button", { class: "gw-x", text: "✕", type: "button", "aria-label": "Fermer" });
    var ov = el("div", { class: "gw-ov", id: "gw-ov" }, [
      el("div", { class: "gw-box" }, [el("div", { class: "gw-hd" }, [el("span", { text: "Comment ça marche" }), close]), tabs, body])
    ]);
    function shut() { ov.remove(); }
    close.onclick = shut;
    ov.addEventListener("click", function (e) { if (e.target === ov) shut(); });
    document.body.appendChild(ov);
    var first = tabs.querySelector('[data-id="' + start + '"]') || tabs.firstChild;
    first.click();
  }

  function addMenuLine() {
    var a = CONFIG.menuAnchor;
    if (!a) return false;
    var links = document.querySelectorAll("a");
    var target = null;
    for (var i = 0; i < links.length; i++) {
      var l = links[i];
      if (l.closest && l.closest("#gw-ov")) continue;
      var okText = a.textRegex && a.textRegex.test(l.textContent || "");
      var okHref = a.hrefContains && (l.getAttribute("href") || "").indexOf(a.hrefContains) > -1;
      if (okText && okHref) { target = l; break; }
    }
    if (!target || document.getElementById("gw-menu")) return !!target;
    var line = target.cloneNode(false);
    line.id = "gw-menu";
    line.href = "#";
    line.textContent = CONFIG.menuLabel;
    line.onclick = function (e) { e.preventDefault(); open(); };
    var holder = target.parentNode && target.parentNode.tagName === "LI" ? target.parentNode : target;
    var copy = holder === target ? line : holder.cloneNode(false);
    if (holder !== target) copy.appendChild(line);
    holder.parentNode.insertBefore(copy, holder.nextSibling);
    return true;
  }

  function showToast() {
    var T = CONFIG.toast;
    try { if (T.oncePerSession && sessionStorage.getItem("gw_toast")) return; sessionStorage.setItem("gw_toast", "1"); } catch (e) {}
    setTimeout(function () {
      var x = el("button", { class: "gw-x", text: "✕", type: "button", "aria-label": "Fermer" });
      var t = el("div", { class: "gw-toast", text: T.text }, [x]);
      x.onclick = function (e) { e.stopPropagation(); t.remove(); };
      t.onclick = function () { t.remove(); open(); };
      document.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.remove(); }, T.durationMs);
    }, T.delayMs);
  }

  function addFab() {
    if (document.getElementById("gw-fab")) return;
    var b = el("button", { class: "gw-fab", id: "gw-fab", text: CONFIG.fab.text, type: "button" });
    b.onclick = function () { open(); };
    document.body.appendChild(b);
  }

  function init() {
    injectCss();
    if (isAdmin) { addFab(); return; }
    if (isHome) {
      showToast();
      // menu latéral : parfois construit après le chargement, on réessaie
      var tries = 0;
      var iv = setInterval(function () {
        tries++;
        if (addMenuLine() || tries > 10) {
          clearInterval(iv);
          if (!document.getElementById("gw-menu")) addFab(); // repli si le lien de référence est introuvable
        }
      }, 500);
    }
  }

  window.GuideWidget = { open: open };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
