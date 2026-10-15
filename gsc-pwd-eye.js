/* GSC — bouton œil (afficher/masquer) sur tout champ mot de passe sans bascule */
(function () {
  function place(inp, btn) {
    try { btn.style.top = (inp.offsetTop + inp.offsetHeight / 2 - 15) + 'px'; } catch (_) {}
  }
  function attach(inp) {
    if (inp.dataset.gscEye || inp.closest('.pwd-wrap') || !inp.parentNode) return;
    inp.dataset.gscEye = '1';
    var par = inp.parentNode;
    if (getComputedStyle(par).position === 'static') par.style.position = 'relative';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '👁️';
    btn.setAttribute('aria-label', 'Afficher le mot de passe');
    btn.style.cssText = 'position:absolute;right:8px;width:30px;height:30px;border:0;background:transparent;cursor:pointer;font-size:16px;line-height:30px;padding:0;z-index:5';
    inp.style.paddingRight = '42px';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁️';
      btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    });
    inp.insertAdjacentElement('afterend', btn);
    place(inp, btn);
    inp.addEventListener('focus', function () { place(inp, btn); });
    window.addEventListener('resize', function () { place(inp, btn); });
    setTimeout(function () { place(inp, btn); }, 400);
  }
  function scan() { document.querySelectorAll('input[type="password"]').forEach(attach); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
