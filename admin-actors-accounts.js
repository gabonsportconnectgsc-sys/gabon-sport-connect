/**
 * ══════════════════════════════════════════════════════════════════════
 *  ADMIN-ACTORS-ACCOUNTS.JS — Comptes & Accès des acteurs (admin)
 *  Gabon Sport Connect · 2026
 *
 *  Monkey-patch non-invasif (n'édite pas admin.html, sauf l'ajout de la
 *  balise <script> de chargement) :
 *   - Injecte un item de navigation "🔐 Comptes & Accès"
 *   - Liste tous les acteurs avec leur email (lecture seule — lié au
 *     compte Firebase Auth), leur téléphone (éditable inline, écrit
 *     directement dans Firestore `users/{uid}.telephone`), et un bouton
 *     de réinitialisation de mot de passe.
 *
 *  ⚠️ IMPORTANT — RÉINITIALISATION DE MOT DE PASSE :
 *  Le SDK Firebase client (celui chargé dans le navigateur) ne permet
 *  JAMAIS de fixer le mot de passe d'un AUTRE utilisateur — c'est une
 *  restriction de sécurité fondamentale de Firebase Auth, pas une
 *  limite de ce module. Réinitialiser le mot de passe d'un acteur
 *  nécessite obligatoirement un backend avec privilèges Admin SDK.
 *
 *  Ce module appelle donc un endpoint sur le Worker Cloudflare déjà
 *  utilisé par admin.html pour le pont Supabase → Firebase
 *  (GSC_WORKER_URL + '/admin/reset-password'). CET ENDPOINT N'EXISTE
 *  PROBABLEMENT PAS ENCORE côté Worker : voir le snippet fourni à part
 *  pour l'ajouter. Tant qu'il n'est pas déployé, le bouton affichera une
 *  erreur claire au lieu d'échouer silencieusement.
 *
 *  Dépendances : window.db (firebase-init.js), window.realtimeSync,
 *  window.supabase (SDK, pour relire la session admin persistée).
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const SECTION_ID = 'comptes-acteurs';
  const NAV_ID = 'nav-comptes-acteurs';
  const MNAV_ID = 'mnav-comptes-acteurs';
  const DEFAULT_PASSWORD = 'Gsc1234';

  // Même config publique que celle utilisée dans admin.html pour le pont
  // Supabase → Firebase (clé "publishable", sans risque à dupliquer côté client).
  const SUPABASE_URL = 'https://ibyftjlgmlaopsgddyzm.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_nKGEuM00uJM0Mgp5UmIGUw_horkQPdr';
  const SUPABASE_STORAGE_KEY = 'sb-gsc-admin-auth';
  const GSC_WORKER_URL = 'https://gsc-auth-bridge.gabonsportconnectgsc.workers.dev';

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ══════════════════════════════════════════════════════════════════
   * 1. STYLES
   * ══════════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('gsc-accounts-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-accounts-styles';
    s.textContent = `
.gsc-acc-phone { display:inline-flex; align-items:center; gap:6px; }
.gsc-acc-phone input { border:1.5px solid var(--gray-bd,#ddd); border-radius:8px; padding:4px 8px; font-size:12.5px; width:130px; }
.gsc-acc-phone .gsc-acc-save { display:none; }
.gsc-acc-phone.editing .gsc-acc-save { display:inline-flex; }
.gsc-acc-email-cell { display:flex; align-items:center; gap:6px; }
.gsc-acc-copy { cursor:pointer; opacity:0.6; font-size:12px; }
.gsc-acc-copy:hover { opacity:1; }
.gsc-acc-status-msg { font-size:11px; margin-top:2px; }
.gsc-acc-status-msg.ok { color:#10b981; }
.gsc-acc-status-msg.err { color:var(--danger,#dc2626); }
`;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. NAVIGATION
   * ══════════════════════════════════════════════════════════════════ */
  function injectNav() {
    if (!document.getElementById(NAV_ID)) {
      const anchor = document.getElementById('nav-joueurs');
      if (anchor) {
        anchor.insertAdjacentHTML('afterend',
          `<button class="nav-item" id="${NAV_ID}">
            <span class="nav-icon">🔐</span><span>Comptes &amp; Accès</span>
          </button>`
        );
      }
    }
    if (!document.getElementById(MNAV_ID)) {
      const mnav = document.querySelector('.mobile-nav');
      if (mnav) {
        mnav.insertAdjacentHTML('beforeend',
          `<button class="mn-btn" id="${MNAV_ID}"><span class="mn-icon">🔐</span><span>Comptes</span></button>`
        );
      }
    }
    const navBtn = document.getElementById(NAV_ID);
    if (navBtn && !navBtn._gscBound) { navBtn._gscBound = true; navBtn.addEventListener('click', showSection); }
    const mNavBtn = document.getElementById(MNAV_ID);
    if (mNavBtn && !mNavBtn._gscBound) { mNavBtn._gscBound = true; mNavBtn.addEventListener('click', showSection); }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. SECTION
   * ══════════════════════════════════════════════════════════════════ */
  function injectSection() {
    if (document.getElementById(SECTION_ID)) return;
    const main = document.querySelector('.main-content');
    if (!main) return;
    main.insertAdjacentHTML('beforeend', `
      <div id="${SECTION_ID}" class="section">
        <div class="dash-card mb-16">
          <div class="dash-card-title">🔐 Comptes &amp; Accès des acteurs</div>
          <p style="font-size:12px;color:var(--gray-txt);margin-bottom:4px;">
            Email (lecture seule, lié au compte de connexion) et téléphone (modifiable) de chaque acteur.
            La réinitialisation de mot de passe fixe un mot de passe temporaire par défaut
            (<code>${DEFAULT_PASSWORD}</code>) — communiquez-le à l'acteur par un canal sûr et invitez-le à le changer dès sa prochaine connexion.
          </p>
        </div>
        <div class="dash-card">
          <div style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <input type="text" id="acc-search" class="search-input" placeholder="🔍 Nom, email, téléphone…" style="max-width:280px;">
            <span id="acc-count" style="font-size:12px;color:var(--gray-txt);"></span>
          </div>
          <div id="acc-purge-banner"></div>
          <div id="acc-table"></div>
        </div>
      </div>
    `);
    const search = document.getElementById('acc-search');
    if (search) search.addEventListener('input', () => renderTable(search.value));
  }

  function showSection() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(SECTION_ID);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById(NAV_ID);
    if (navBtn) navBtn.classList.add('active');
    const mNavBtn = document.getElementById(MNAV_ID);
    if (mNavBtn) mNavBtn.classList.add('active');

    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'Comptes & Accès';

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    render();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. DONNÉES
   * ══════════════════════════════════════════════════════════════════ */
  function getUsers() {
    return (window.realtimeSync && window.realtimeSync.getCache && window.realtimeSync.getCache('users')) || [];
  }

  function actorName(u) {
    return [u.prenom, u.nom].filter(Boolean).join(' ') || u.nomOrganisation || u.email || 'Sans nom';
  }

  let _allRows = [];

  // Même convention de suppression douce que partout ailleurs dans l'app
  // (admin.html Joueurs, index.html Annuaire / adminDeleteUser) : un
  // acteur "supprimé" n'est jamais retiré de Firestore, seul son champ
  // status/statut passe à 'deleted'. Comptes & Accès doit respecter la
  // même règle de visibilité, sinon les comptes supprimés depuis
  // l'Annuaire admin continuent d'apparaître ici.
  function isDeleted(u) {
    const s = (u.status || u.statut || '').toString().toLowerCase();
    return s === 'deleted' || s === 'supprimé' || s === 'supprime';
  }

  function computeRows() {
    return getUsers()
      .filter(u => !isDeleted(u))
      .map(u => ({ u }))
      .sort((a, b) => actorName(a.u).localeCompare(actorName(b.u)));
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. RENDU TABLEAU
   * ══════════════════════════════════════════════════════════════════ */
  function renderTable(filterTerm) {
    const el = document.getElementById('acc-table');
    const countEl = document.getElementById('acc-count');
    if (!el) return;

    const q = (filterTerm || '').toLowerCase().trim();
    let rows = _allRows;
    if (q) {
      rows = rows.filter(({ u }) =>
        actorName(u).toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.telephone || u.phone || '').toLowerCase().includes(q)
      );
    }

    if (countEl) countEl.textContent = `${rows.length} acteur(s)`;

    if (!rows.length) {
      el.innerHTML = '<p style="text-align:center;color:var(--gray-txt);padding:16px;">Aucun acteur trouvé.</p>';
      return;
    }

    const trs = rows.map(({ u }) => {
      const uid = u.id || u.uid;
      const phone = u.telephone || u.phone || '';
      return `
        <tr data-uid="${esc(uid)}">
          <td>${esc(actorName(u))}</td>
          <td>${esc(u.role || '—')}</td>
          <td>
            <div class="gsc-acc-email-cell">
              <span>${esc(u.email || '—')}</span>
              ${u.email ? `<span class="gsc-acc-copy" title="Copier l'email" onclick="GSCAccounts.copyToClipboard('${esc(u.email)}')">📋</span>` : ''}
            </div>
          </td>
          <td>
            <div class="gsc-acc-phone" id="phone-wrap-${esc(uid)}">
              <span class="gsc-acc-phone-view">${esc(phone || '—')}</span>
              <input type="tel" class="gsc-acc-phone-input" style="display:none;" value="${esc(phone)}" placeholder="+241...">
              <button type="button" class="btn-sm" onclick="GSCAccounts.editPhone('${esc(uid)}')">✏️</button>
              <button type="button" class="btn-sm gsc-acc-save" onclick="GSCAccounts.savePhone('${esc(uid)}')">💾</button>
            </div>
            <div class="gsc-acc-status-msg" id="phone-status-${esc(uid)}"></div>
          </td>
          <td>${esc(u.status || u.statut || 'actif')}</td>
          <td>
            <button type="button" class="btn-sm" onclick="GSCAccounts.resetPassword('${esc(uid)}','${esc(u.email || '')}','${esc(actorName(u))}')">🔑 Réinitialiser</button>
            <div class="gsc-acc-status-msg" id="reset-status-${esc(uid)}"></div>
          </td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Nom</th><th>Rôle</th><th>Email</th><th>Téléphone</th><th>Statut</th><th>Mot de passe</th></tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>`;
  }

  function render() {
    _allRows = computeRows();
    renderPurgeBanner();
    const search = document.getElementById('acc-search');
    renderTable(search ? search.value : '');
  }

  function renderPurgeBanner() {
    const el = document.getElementById('acc-purge-banner');
    if (!el) return;
    const stale = getUsers().filter(isDeleted);
    if (!stale.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div style="background:#fee2e2;border:1px solid #fecaca;border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <span style="font-size:12.5px;color:#991b1b;">
          🗑️ ${stale.length} compte(s) marqué(s) supprimé(s) subsistent encore en base (ancien mode de suppression douce). Ils ne sont plus affichés ici mais n'ont pas encore été effacés définitivement.
        </span>
        <button type="button" class="btn-sm" style="background:#dc2626;color:#fff;" onclick="GSCAccounts.purgeDeleted()">Purger définitivement</button>
      </div>
      <div class="gsc-acc-status-msg" id="purge-status"></div>
    `;
  }

  async function purgeDeleted() {
    const statusEl = document.getElementById('purge-status');
    const stale = getUsers().filter(isDeleted);
    if (!stale.length) return;
    if (!confirm(`Effacer définitivement ${stale.length} compte(s) marqué(s) "supprimé" ?\n\nCette action est irréversible : les documents seront retirés de Firestore.`)) return;
    if (!window.db) {
      if (statusEl) { statusEl.textContent = 'Firestore indisponible.'; statusEl.className = 'gsc-acc-status-msg err'; }
      return;
    }
    if (statusEl) { statusEl.textContent = '⏳ Purge en cours…'; statusEl.className = 'gsc-acc-status-msg'; }
    let ok = 0, fail = 0;
    for (const u of stale) {
      const uid = u.id || u.uid;
      if (!uid) continue;
      try {
        await window.db.collection('users').doc(uid).delete();
        ok++;
      } catch (err) {
        console.error('[GSCAccounts] purge erreur pour', uid, err);
        fail++;
      }
    }
    if (statusEl) {
      statusEl.textContent = fail ? `⚠️ ${ok} supprimé(s), ${fail} échec(s).` : `✅ ${ok} compte(s) purgé(s) définitivement.`;
      statusEl.className = 'gsc-acc-status-msg ' + (fail ? 'err' : 'ok');
    }
    render();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 6. ÉDITION TÉLÉPHONE (Firestore direct — pas de backend nécessaire)
   * ══════════════════════════════════════════════════════════════════ */
  function editPhone(uid) {
    const wrap = document.getElementById('phone-wrap-' + uid);
    if (!wrap) return;
    wrap.classList.add('editing');
    wrap.querySelector('.gsc-acc-phone-view').style.display = 'none';
    const input = wrap.querySelector('.gsc-acc-phone-input');
    input.style.display = 'inline-block';
    input.focus();
  }

  async function savePhone(uid) {
    const wrap = document.getElementById('phone-wrap-' + uid);
    const statusEl = document.getElementById('phone-status-' + uid);
    if (!wrap) return;
    const input = wrap.querySelector('.gsc-acc-phone-input');
    const newPhone = (input.value || '').trim();

    if (!window.db) {
      if (statusEl) { statusEl.textContent = 'Firestore indisponible.'; statusEl.className = 'gsc-acc-status-msg err'; }
      return;
    }

    try {
      await window.db.collection('users').doc(uid).update({ telephone: newPhone });
      wrap.querySelector('.gsc-acc-phone-view').textContent = newPhone || '—';
      wrap.querySelector('.gsc-acc-phone-view').style.display = 'inline';
      input.style.display = 'none';
      wrap.classList.remove('editing');
      if (statusEl) { statusEl.textContent = '✅ Enregistré'; statusEl.className = 'gsc-acc-status-msg ok'; setTimeout(() => { statusEl.textContent = ''; }, 2500); }
    } catch (err) {
      console.error('[GSCAccounts] savePhone erreur:', err);
      if (statusEl) { statusEl.textContent = '❌ Erreur : ' + (err.message || err); statusEl.className = 'gsc-acc-status-msg err'; }
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 7. RÉINITIALISATION MOT DE PASSE
   *  ⚠️ Nécessite un endpoint backend avec privilèges Admin SDK.
   *  Voir le commentaire d'en-tête du fichier.
   * ══════════════════════════════════════════════════════════════════ */
  let _sbClient = null;
  function getSupabaseClient() {
    if (_sbClient) return _sbClient;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;
    _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storageKey: SUPABASE_STORAGE_KEY, persistSession: true, autoRefreshToken: true }
    });
    return _sbClient;
  }

  async function getAdminAccessToken() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Session admin introuvable (Supabase SDK non chargé).');
    let { data: { session } } = await client.auth.getSession();
    if (!session) {
      const refreshed = await client.auth.refreshSession();
      session = refreshed.data && refreshed.data.session;
    }
    if (!session || !session.access_token) throw new Error('Session admin expirée — reconnectez-vous.');
    return session.access_token;
  }

  async function resetPassword(uid, email, name) {
    const statusEl = document.getElementById('reset-status-' + uid);
    const label = name || email || uid;
    if (!confirm(
      `Réinitialiser le mot de passe de "${label}" ?\n\n` +
      `Le mot de passe sera fixé à "${DEFAULT_PASSWORD}" (identique pour tous les resets).\n` +
      `⚠️ Un mot de passe par défaut partagé est prévisible : communiquez-le uniquement à la ` +
      `personne concernée (jamais publiquement) et demandez-lui de le changer dès sa prochaine connexion.`
    )) return;

    if (statusEl) { statusEl.textContent = '⏳ En cours…'; statusEl.className = 'gsc-acc-status-msg'; }

    try {
      const token = await getAdminAccessToken();
      const resp = await fetch(GSC_WORKER_URL + '/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ targetUid: uid, newPassword: DEFAULT_PASSWORD })
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`Endpoint /admin/reset-password indisponible (HTTP ${resp.status}). ` +
          `Cet endpoint doit être ajouté au Worker Cloudflare — voir la documentation fournie. ${txt}`);
      }

      // Marque le compte pour forcer un changement de mot de passe à la prochaine
      // connexion (à faire respecter côté écran de connexion — non inclus ici).
      if (window.db) {
        await window.db.collection('users').doc(uid).update({
          mustChangePassword: true,
          passwordResetAt: new Date()
        }).catch(() => {});
      }

      if (statusEl) { statusEl.textContent = `✅ Mot de passe réinitialisé (${DEFAULT_PASSWORD})`; statusEl.className = 'gsc-acc-status-msg ok'; }
    } catch (err) {
      console.error('[GSCAccounts] resetPassword erreur:', err);
      if (statusEl) { statusEl.textContent = '❌ ' + (err.message || err); statusEl.className = 'gsc-acc-status-msg err'; }
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 8. BOOT
   * ══════════════════════════════════════════════════════════════════ */
  function boot() {
    injectStyles();
    injectNav();
    injectSection();

    if (window.realtimeSync && typeof window.realtimeSync.onUpdate === 'function') {
      window.realtimeSync.onUpdate('users', () => {
        if (document.getElementById(SECTION_ID)?.classList.contains('active')) render();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCAccounts = { showSection, render, editPhone, savePhone, copyToClipboard, resetPassword, purgeDeleted };

})(window);
