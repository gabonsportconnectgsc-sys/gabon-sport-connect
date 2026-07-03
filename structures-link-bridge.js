/**
 * ══════════════════════════════════════════════════════════════════════
 *  STRUCTURES-LINK-BRIDGE.JS — Pont Comptes (users) ↔ Fiches (structuresSportives)
 *  Gabon Sport Connect · 2026
 *
 *  Problème résolu :
 *  Un "club" peut exister comme COMPTE (collection `users`, role:'club'/
 *  'federation'/'association') et/ou comme FICHE STRUCTURE détaillée
 *  (collection `structuresSportives`, gérée par le module Structures).
 *  Ces deux annuaires étaient totalement indépendants → deux chiffres
 *  différents affichés selon l'écran.
 *
 *  Solution (non destructive, sans migration de données) :
 *  On ajoute un champ de liaison :
 *    - users/{uid}.structureId            → id du doc structuresSportives lié
 *    - structuresSportives/{id}.linkedUserId → uid du compte lié
 *  Rien n'est supprimé ni déplacé. Un admin lie manuellement (ou crée
 *  en un clic une fiche structure pré-remplie) depuis le nouvel onglet
 *  "🔗 Liaison" du module Structures.
 *
 *  Comptage unifié exposé : window.GSCStructureLink.getUnifiedClubCount()
 *  = (nb de fiches structuresSportives) + (nb de comptes club/fédération/
 *    association SANS fiche liée), pour ne jamais compter deux fois la
 *  même entité.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const ORG_ROLES = ['club', 'federation', 'association', 'organisateur'];
  const TYPE_LABELS = { club: 'Club', federation: 'Fédération', association: 'Association', organisateur: 'Organisateur' };

  function db() {
    return (window.firebase && window.firebase.firestore) ? window.firebase.firestore() : null;
  }

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ── Chargement des deux annuaires ─────────────────────────────── */
  async function loadClubUsers() {
    const d = db(); if (!d) return [];
    const snap = await d.collection('users').get();
    return snap.docs
      .map(doc => ({ uid: doc.id, ...doc.data() }))
      .filter(u => ORG_ROLES.includes(u.role) && u.status !== 'deleted');
  }

  async function loadStructures() {
    const d = db(); if (!d) return [];
    const snap = await d.collection('structuresSportives').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /* ── Comptage unifié (dédupliqué) ──────────────────────────────── */
  async function getUnifiedClubCount() {
    const [users, structures] = await Promise.all([loadClubUsers(), loadStructures()]);
    const unlinkedUsers = users.filter(u => !u.structureId);
    return {
      total: structures.length + unlinkedUsers.length,
      structures: structures.length,
      comptesLiés: users.length - unlinkedUsers.length,
      comptesNonLiés: unlinkedUsers.length
    };
  }

  /* ── Actions de liaison ─────────────────────────────────────────── */
  async function linkUserToStructure(uid, structureId) {
    const d = db();
    await d.collection('users').doc(uid).update({ structureId });
    await d.collection('structuresSportives').doc(structureId).update({ linkedUserId: uid });
  }

  async function unlinkUser(uid, structureId) {
    const d = db();
    await d.collection('users').doc(uid).update({ structureId: firebase.firestore.FieldValue.delete() });
    if (structureId) {
      await d.collection('structuresSportives').doc(structureId).update({ linkedUserId: firebase.firestore.FieldValue.delete() });
    }
  }

  async function createStructureFromUser(user) {
    const d = db();
    const fullname = [user.prenom, user.nom].filter(Boolean).join(' ');
    const payload = {
      nom: user.nomOrganisation || fullname || 'Structure sans nom',
      type: TYPE_LABELS[user.role] || user.role,
      discipline: user.sport || (Array.isArray(user.sports) ? user.sports[0] : '') || 'Football',
      ville: user.ville || '',
      telephone: user.telephone || user.tel || '',
      email: user.email || '',
      status: 'active',
      linkedUserId: user.uid,
      source: 'liaison-compte',
      addedBy: (window.currentUser && window.currentUser.uid) || 'admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await d.collection('structuresSportives').add(payload);
    await d.collection('users').doc(user.uid).update({ structureId: ref.id });
    return ref.id;
  }

  /* ── Interface d'administration (onglet Liaison) ───────────────── */
  let _users = [], _structures = [];

  async function refresh() {
    const container = document.getElementById('liaison-content');
    if (!container) return;
    container.innerHTML = '<p style="font-size:13px;color:var(--gray-txt);">Chargement…</p>';
    [_users, _structures] = await Promise.all([loadClubUsers(), loadStructures()]);
    render();
  }

  function structureOptions(currentId) {
    const free = _structures.filter(s => !s.linkedUserId || s.id === currentId);
    return free.map(s => `<option value="${s.id}" ${s.id === currentId ? 'selected' : ''}>${esc(s.nom)} (${esc(s.ville) || '—'})</option>`).join('');
  }

  function render() {
    const container = document.getElementById('liaison-content');
    if (!container) return;

    const counts = {
      structures: _structures.length,
      liés: _users.filter(u => u.structureId).length,
      nonLiés: _users.filter(u => !u.structureId).length
    };
    const total = counts.structures + counts.nonLiés;

    const summary = `
      <div class="stats-grid" style="margin-bottom:16px;">
        <div class="stat-card c1"><div class="stat-icon">🏟️</div><div class="stat-data"><div class="stat-value">${total}</div><div class="stat-label">Total unifié (dédupliqué)</div></div></div>
        <div class="stat-card c2"><div class="stat-icon">📋</div><div class="stat-data"><div class="stat-value">${counts.structures}</div><div class="stat-label">Fiches structures</div></div></div>
        <div class="stat-card c3"><div class="stat-icon">🔗</div><div class="stat-data"><div class="stat-value">${counts.liés}</div><div class="stat-label">Comptes liés</div></div></div>
        <div class="stat-card c4"><div class="stat-icon">⚠️</div><div class="stat-data"><div class="stat-value">${counts.nonLiés}</div><div class="stat-label">Comptes à lier</div></div></div>
      </div>`;

    const rows = _users.map(u => {
      const fullname = [u.prenom, u.nom].filter(Boolean).join(' ') || u.nomOrganisation || u.email || u.uid;
      const isLinked = !!u.structureId;
      const linkedStruct = _structures.find(s => s.id === u.structureId);
      return `
        <tr>
          <td>${esc(u.nomOrganisation || fullname)}</td>
          <td>${TYPE_LABELS[u.role] || u.role}</td>
          <td>${esc(u.ville) || '—'}</td>
          <td>${isLinked
            ? `✅ ${esc(linkedStruct ? linkedStruct.nom : u.structureId)}`
            : '⚠️ Non lié'}</td>
          <td>
            ${isLinked
              ? `<button class="btn-action outline" onclick="GSCStructureLink.uiUnlink('${u.uid}','${u.structureId}')">Délier</button>`
              : `
                <select id="sel-struct-${u.uid}" style="padding:4px 6px;border-radius:6px;border:1px solid var(--gray-bd);max-width:140px;">
                  <option value="">-- Choisir une fiche --</option>
                  ${structureOptions()}
                </select>
                <button class="btn-action" onclick="GSCStructureLink.uiLink('${u.uid}')">Lier</button>
                <button class="btn-action green" onclick="GSCStructureLink.uiCreate('${u.uid}')">+ Créer fiche</button>
              `}
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      ${summary}
      <p style="font-size:12px;color:var(--gray-txt);margin-bottom:12px;max-width:680px;">
        Un compte (rôle Club / Fédération / Association / Organisateur) peut être lié à une fiche
        structure existante, ou en générer une nouvelle pré-remplie. Aucune donnée n'est supprimée ;
        la liaison sert uniquement à ne compter chaque club qu'une seule fois.
      </p>
      <div class="users-table-wrap">
        <table class="users-table">
          <thead><tr><th>Nom</th><th>Type</th><th>Ville</th><th>Statut de liaison</th><th>Actions</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">Aucun compte club/fédération/association trouvé.</td></tr>'}</tbody>
        </table>
      </div>`;
  }

  async function uiLink(uid) {
    const sel = document.getElementById(`sel-struct-${uid}`);
    const structureId = sel && sel.value;
    if (!structureId) { alert('Choisissez une fiche structure dans la liste.'); return; }
    await linkUserToStructure(uid, structureId);
    await refresh();
  }

  async function uiCreate(uid) {
    const user = _users.find(u => u.uid === uid);
    if (!user) return;
    if (!confirm(`Créer une fiche structure pour "${user.nomOrganisation || user.email}" ?`)) return;
    await createStructureFromUser(user);
    await refresh();
  }

  async function uiUnlink(uid, structureId) {
    if (!confirm('Délier ce compte de sa fiche structure ?')) return;
    await unlinkUser(uid, structureId);
    await refresh();
  }

  /* ── Navigation : ajout de l'onglet "Liaison" ──────────────────── */
  function showLiaisonSection() {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('liaison');
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.mn-btn').forEach(b => b.classList.remove('active'));
    const mNavBtn = document.getElementById('mnav-liaison');
    if (mNavBtn) mNavBtn.classList.add('active');
    const navBtn = document.getElementById('nav-liaison');
    if (navBtn) navBtn.classList.add('active');

    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle && topbarTitle.firstChild) topbarTitle.firstChild.textContent = 'Liaison Clubs';

    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');

    refresh();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const mNavBtn = document.getElementById('mnav-liaison');
    if (mNavBtn) mNavBtn.addEventListener('click', showLiaisonSection);
    const navBtn = document.getElementById('nav-liaison');
    if (navBtn) navBtn.addEventListener('click', showLiaisonSection);
  });

  window.GSCStructureLink = {
    getUnifiedClubCount,
    linkUserToStructure,
    unlinkUser,
    createStructureFromUser,
    uiLink, uiCreate, uiUnlink,
    refresh
  };

})(window);
