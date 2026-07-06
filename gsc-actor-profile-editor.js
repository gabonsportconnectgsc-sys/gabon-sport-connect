/**
 * GSC ACTOR PROFILE EDITOR — Édition de profil depuis "Comptes & Accès"
 * ──────────────────────────────────────────────────────────────────
 * admin-actors-accounts.js n'édite que le téléphone (et gère le reset
 * mdp). Ce module ajoute, sans toucher à ce fichier, un bouton
 * "✏️ Profil" sur chaque ligne du tableau Comptes & Accès, ouvrant une
 * fenêtre d'édition complète : nom/organisation, ville, sport, rôle,
 * statut, et — pour les comptes créés automatiquement par
 * gsc-sync-comptes-reels.js — une case "Réclamé par un responsable"
 * pour tracer la prise en main progressive.
 *
 * Fonctionne par MutationObserver sur #players-grid : reste valide même
 * si admin-actors-accounts.js se re-rend tout seul (temps réel).
 */
(function () {
  'use strict';

  const ROLE_OPTIONS = [
    ['joueur', 'Joueur'], ['athlete', 'Athlète'], ['entraineur', 'Entraîneur'], ['arbitre', 'Arbitre'],
    ['club', 'Club'], ['federation', 'Fédération'], ['association', 'Association'], ['organisateur', 'Organisateur'],
    ['independant', 'Indépendant'], ['supporter', 'Supporter'], ['eleve_etudiant', 'Élève/Étudiant'],
    ['sportif_etranger', 'Sportif étranger'], ['handisport', 'Handisport'], ['ancien_sportif', 'Ancien sportif'],
    ['formateur', 'Formateur']
  ];
  const ORG_ROLES = ['club', 'federation', 'association', 'organisateur'];

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function injectStyles() {
    if (document.getElementById('gsc-profile-editor-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-profile-editor-styles';
    s.textContent = `
.gsc-pe-overlay { display:none; position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:9999; align-items:center; justify-content:center; padding:16px; }
.gsc-pe-overlay.open { display:flex; }
.gsc-pe-modal { background:#fff; border-radius:14px; padding:20px; width:100%; max-width:420px; max-height:88vh; overflow-y:auto; }
.gsc-pe-modal h3 { margin:0 0 12px; font-size:16px; }
.gsc-pe-field { margin-bottom:10px; }
.gsc-pe-field label { display:block; font-size:12px; font-weight:700; color:#333; margin-bottom:4px; }
.gsc-pe-field input, .gsc-pe-field select { width:100%; box-sizing:border-box; border:1.5px solid #ddd; border-radius:8px; padding:8px 10px; font-size:13.5px; }
.gsc-pe-checkbox { display:flex; align-items:center; gap:8px; font-size:13px; margin:10px 0; }
.gsc-pe-actions { display:flex; gap:10px; margin-top:14px; }
.gsc-pe-actions button { flex:1; border:none; border-radius:8px; padding:10px; font-weight:700; cursor:pointer; }
.gsc-pe-save { background:#009E60; color:#fff; }
.gsc-pe-cancel { background:#f1f5f9; color:#333; }
.gsc-pe-status { font-size:12.5px; margin-top:8px; }
.gsc-pe-status.ok { color:#10b981; }
.gsc-pe-status.err { color:#dc2626; }
.gsc-profile-edit-btn { margin-left:6px; }
`;
    document.head.appendChild(s);
  }

  function injectModal() {
    if (document.getElementById('gsc-pe-overlay')) return;
    const div = document.createElement('div');
    div.id = 'gsc-pe-overlay';
    div.className = 'gsc-pe-overlay';
    div.innerHTML = `
      <div class="gsc-pe-modal">
        <h3>✏️ Éditer le profil</h3>
        <div class="gsc-pe-field"><label>Rôle</label>
          <select id="pe-role">${ROLE_OPTIONS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select>
        </div>
        <div class="gsc-pe-field"><label>Nom / Organisation</label><input id="pe-nomOrg" placeholder="Nom du club, fédération, ou nom complet"></div>
        <div class="gsc-pe-field"><label>Ville</label><input id="pe-ville" placeholder="Ville"></div>
        <div class="gsc-pe-field"><label>Sport / Discipline</label><input id="pe-sport" placeholder="Football, Natation…"></div>
        <div class="gsc-pe-field"><label>Téléphone</label><input id="pe-telephone" placeholder="+241..."></div>
        <div class="gsc-pe-field"><label>Statut</label>
          <select id="pe-status"><option value="active">Actif</option><option value="hidden">Masqué</option></select>
        </div>
        <div id="pe-claim-wrap" class="gsc-pe-checkbox" style="display:none;">
          <input type="checkbox" id="pe-claimed"><label for="pe-claimed" style="margin:0;">Réclamé par un responsable réel (compte pris en main)</label>
        </div>
        <div class="gsc-pe-actions">
          <button type="button" class="gsc-pe-cancel" id="pe-cancel-btn">Annuler</button>
          <button type="button" class="gsc-pe-save" id="pe-save-btn">Enregistrer</button>
        </div>
        <div id="pe-status-msg" class="gsc-pe-status"></div>
      </div>`;
    document.body.appendChild(div);

    document.getElementById('pe-cancel-btn').addEventListener('click', closeModal);
    div.addEventListener('click', (e) => { if (e.target === div) closeModal(); });
    document.getElementById('pe-save-btn').addEventListener('click', saveProfile);
    document.getElementById('pe-role').addEventListener('change', toggleClaimVisibility);
  }

  let _editingUid = null;
  let _editingWasAutoGenerated = false;

  function toggleClaimVisibility() {
    const role = document.getElementById('pe-role').value;
    const wrap = document.getElementById('pe-claim-wrap');
    wrap.style.display = (_editingWasAutoGenerated && ORG_ROLES.includes(role)) ? 'flex' : 'none';
  }

  function findUser(uid) {
    const users = (window.realtimeSync && window.realtimeSync.getCache && window.realtimeSync.getCache('users')) || [];
    return users.find(u => (u.id || u.uid) === uid) || null;
  }

  function openProfileEditor(uid) {
    injectModal();
    const u = findUser(uid);
    if (!u) { alert('Compte introuvable (données pas encore synchronisées).'); return; }
    _editingUid = uid;
    _editingWasAutoGenerated = !!u.autoGenerated;

    document.getElementById('pe-role').value = u.role || 'joueur';
    document.getElementById('pe-nomOrg').value = u.nomOrganisation || [u.prenom, u.nom].filter(Boolean).join(' ') || '';
    document.getElementById('pe-ville').value = u.ville || '';
    document.getElementById('pe-sport').value = u.sport || u.discipline || '';
    document.getElementById('pe-telephone').value = u.telephone || u.phone || '';
    document.getElementById('pe-status').value = (u.status === 'hidden') ? 'hidden' : 'active';
    document.getElementById('pe-claimed').checked = !!u.claimed;
    document.getElementById('pe-status-msg').textContent = '';
    document.getElementById('pe-status-msg').className = 'gsc-pe-status';
    toggleClaimVisibility();

    document.getElementById('gsc-pe-overlay').classList.add('open');
  }

  function closeModal() {
    document.getElementById('gsc-pe-overlay')?.classList.remove('open');
    _editingUid = null;
  }

  async function saveProfile() {
    if (!_editingUid) return;
    const statusEl = document.getElementById('pe-status-msg');
    const fields = {
      role: document.getElementById('pe-role').value,
      nomOrganisation: document.getElementById('pe-nomOrg').value.trim(),
      ville: document.getElementById('pe-ville').value.trim(),
      sport: document.getElementById('pe-sport').value.trim(),
      telephone: document.getElementById('pe-telephone').value.trim(),
      status: document.getElementById('pe-status').value,
      updatedAt: new Date()
    };
    if (_editingWasAutoGenerated) fields.claimed = document.getElementById('pe-claimed').checked;

    if (!window.db) { statusEl.textContent = 'Firestore indisponible.'; statusEl.className = 'gsc-pe-status err'; return; }
    statusEl.textContent = '⏳ Enregistrement…';
    statusEl.className = 'gsc-pe-status';
    try {
      await window.db.collection('users').doc(_editingUid).update(fields);
      statusEl.textContent = '✅ Profil mis à jour.';
      statusEl.className = 'gsc-pe-status ok';
      setTimeout(closeModal, 900);
    } catch (err) {
      console.error('[GSC PROFILE EDITOR] erreur:', err);
      statusEl.textContent = '❌ ' + (err.message || err);
      statusEl.className = 'gsc-pe-status err';
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * Injection du bouton "✏️ Profil" sur chaque ligne de la table des
   * comptes (#players-grid dans admin-controller.js). Les lignes portent
   * `data-id` (pas `data-uid`) et ont déjà un handler de clic global qui
   * ouvre openPlayerModal() — d'où le stopPropagation() sur notre bouton
   * pour ne pas ouvrir les deux modales en même temps.
   * ══════════════════════════════════════════════════════════════════ */
  function injectEditButtons() {
    document.querySelectorAll('#players-grid tr[data-id]').forEach(tr => {
      if (tr.querySelector('.gsc-profile-edit-btn')) return;
      const uid = tr.getAttribute('data-id');
      const lastTd = tr.querySelector('td:last-child');
      if (!lastTd) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-sm gsc-profile-edit-btn';
      btn.textContent = '✏️ Profil';
      btn.addEventListener('click', (evt) => {
        evt.stopPropagation();
        openProfileEditor(uid);
      });
      lastTd.appendChild(btn);
    });
  }

  function startObserver() {
    const table = document.getElementById('players-grid');
    if (!table) { setTimeout(startObserver, 400); return; }
    injectEditButtons();
    const obs = new MutationObserver(() => injectEditButtons());
    obs.observe(table, { childList: true, subtree: true });
  }

  function init() {
    injectStyles();
    startObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[GSC PROFILE EDITOR] chargé');
})();
