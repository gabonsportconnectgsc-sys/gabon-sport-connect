(function () {
  const n = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  function users() {
    const real = (window.realtimeSync && window.realtimeSync.getCache('users')) || [];
    return real.concat(window.GSC_SEED_ACTORS || []);
  }
  function attempt(k) {
    const ov = document.getElementById('player-modal');
    if (!ov || !ov.classList.contains('open')) return;
    const t = id => n((document.getElementById(id) || {}).textContent);
    const email = t('modal-email'), name = t('modal-player-name');
    const m = users().find(u => (email && email !== '—' && n(u.email) === email) ||
      (name && n([u.prenom, u.nom].filter(Boolean).join(' ') || u.nomOrganisation) === name));
    if (m && window.gscInjectModalQr) return window.gscInjectModalQr(m);
    if (k < 12) setTimeout(() => attempt(k + 1), 300);
  }
  function init() {
    const ov = document.getElementById('player-modal');
    if (!ov) return;
    new MutationObserver(() => attempt(0)).observe(ov, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
