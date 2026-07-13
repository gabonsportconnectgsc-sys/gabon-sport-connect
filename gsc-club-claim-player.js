/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC-CLUB-CLAIM-PLAYER.JS — Revendication de joueurs par un club
 *  Gabon Sport Connect · 2026
 *
 *  Complète gsc-club-validation.js (qui gère le sens "le joueur déclare un
 *  club à l'inscription, le club valide"). Ici c'est l'inverse : à la
 *  prise en main de son compte, un club/association/fédération peut
 *  RECHERCHER et REVENDIQUER un acteur déjà inscrit :
 *    - en statut "libre" (sans club), ou
 *    - ayant déjà mentionné ce club comme employeur (texte libre, non
 *      encore validé/rattaché formellement).
 *
 *  Comme seul le propriétaire d'un `users/{uid}` (ou l'admin) peut y
 *  écrire, la revendication crée une offre dans `clubClaimOffers/{id}`
 *  (créée par le club, lue par le joueur ciblé). Le joueur accepte ou
 *  refuse à sa prochaine connexion ; s'il accepte, LUI-MÊME met à jour
 *  son propre profil (statut, employeur, structureId) — même principe
 *  que `applyDecisionIfNeeded()` dans gsc-club-validation.js.
 *
 *  Règle Firestore requise (voir firestore.rules) :
 *    match /clubClaimOffers/{offerId} { … }
 *
 *  Dépendances : window.db/collection/query/where/getDocs/addDoc/doc/
 *  updateDoc/onSnapshot/serverTimestamp (index.html, SDK modulaire),
 *  window.userProfile, window.currentUser, window.renderProfile.
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const ORG_ROLES = ['club', 'association', 'federation'];
  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmtDate(d) { try { return d ? new Date(d.toDate ? d.toDate() : d).toLocaleDateString('fr-FR') : '—'; } catch (e) { return '—'; } }
  function norm(s) { return (s || '').toString().trim().toLowerCase(); }

  /* ══════════════════════════════════════════════════════════════════
   * 1. CÔTÉ CLUB — recherche &amp; envoi d'une offre de revendication
   * ══════════════════════════════════════════════════════════════════ */
  async function searchCandidates() {
    const p = window.userProfile;
    if (!p || !ORG_ROLES.includes(p.role)) return [];
    const usersRef = window.collection(window.db, 'users');

    const [libreSnap, allSnap] = await Promise.all([
      window.getDocs(window.query(usersRef, window.where('statut', '==', 'libre'))),
      window.getDocs(usersRef) // lecture publique — filtrage employeur côté client
    ]);

    const seen = new Set();
    const candidates = [];
    libreSnap.docs.forEach(d => {
      if (seen.has(d.id) || d.id === p.uid) return;
      seen.add(d.id);
      candidates.push({ id: d.id, ...d.data(), _matchType: 'libre' });
    });
    const orgName = norm(p.nomOrganisation);
    if (orgName) {
      allSnap.docs.forEach(d => {
        if (seen.has(d.id) || d.id === p.uid) return;
        const u = d.data();
        if (u.employeur && norm(u.employeur) === orgName) {
          seen.add(d.id);
          candidates.push({ id: d.id, ...u, _matchType: 'mention' });
        }
      });
    }
    return candidates;
  }

  function renderCandidateRow(c) {
    const fullname = [c.prenom, c.nom].filter(Boolean).join(' ') || c.email?.split('@')[0] || '—';
    const badge = c._matchType === 'libre'
      ? '<span class="ged-status">🔓 Libre</span>'
      : `<span class="ged-status ged-status-en_attente">💬 Vous a mentionné</span>`;
    return `
      <div class="claim-row">
        <div class="claim-row-info">
          <div class="claim-row-name">${esc(fullname)} ${badge}</div>
          <div class="claim-row-meta">${esc(c.role || '—')} ${c.sport ? '· ' + esc(c.sport) : ''}</div>
        </div>
        <button class="btn-sm" onclick="GSCClubClaim.sendOffer('${esc(c.id)}','${esc(fullname).replace(/'/g, "&#39;")}')">🤝 Revendiquer</button>
      </div>
    `;
  }

  async function runSearch() {
    const box = document.getElementById('claim-results');
    if (!box) return;
    box.innerHTML = '<p class="ged-pub-empty">Recherche…</p>';
    try {
      const candidates = await searchCandidates();
      box.innerHTML = candidates.length
        ? candidates.map(renderCandidateRow).join('')
        : '<p class="ged-pub-empty">Aucun joueur libre ou vous ayant mentionné comme employeur pour le moment.</p>';
    } catch (err) {
      box.innerHTML = `<p class="ged-pub-empty">Erreur de recherche : ${esc(err.message || err)}</p>`;
    }
  }

  async function sendOffer(targetUid, targetName) {
    const p = window.userProfile;
    if (!p || !window.currentUser) return;
    try {
      await window.addDoc(window.collection(window.db, 'clubClaimOffers'), {
        targetUid,
        targetNom: targetName,
        structureId: p.structureId || null,
        structureOwnerUid: window.currentUser.uid,
        structureNom: p.nomOrganisation || '',
        sport: p.sport || null,
        status: 'pending',
        createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date(),
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000)
      });

      // Notifie le joueur ciblé (best-effort — n'empêche pas l'offre si ça échoue)
      try {
        await window.addDoc(window.collection(window.db, 'notifications'), {
          type: 'claim_offer', title: `🤝 ${p.nomOrganisation || 'Un club'} souhaite vous rattacher`,
          body: `Rendez-vous sur votre profil pour accepter ou refuser cette demande.`,
          recipientId: targetUid, read: false, senderId: window.currentUser.uid,
          createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date(),
          link: { section: 'profil' }
        });
      } catch (e) { /* non bloquant */ }

      alert('✅ Offre envoyée. Le joueur devra l\'accepter à sa prochaine connexion.');
      runSearch();
    } catch (err) {
      alert('❌ Erreur : ' + (err.message || err));
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. CÔTÉ JOUEUR — offres reçues, acceptation / refus
   * ══════════════════════════════════════════════════════════════════ */
  async function loadMyOffers() {
    const p = window.userProfile;
    if (!p || !window.currentUser) return [];
    const ref = window.collection(window.db, 'clubClaimOffers');
    const q = window.query(ref, window.where('targetUid', '==', window.currentUser.uid), window.where('status', '==', 'pending'));
    const snap = await window.getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  function renderOfferBanner(offers) {
    if (!offers.length) return '';
    const items = offers.map(o => `
      <div class="claim-offer-row">
        <div>🏟️ <strong>${esc(o.structureNom || 'Un club')}</strong> souhaite vous rattacher${o.sport ? ' (' + esc(o.sport) + ')' : ''}.</div>
        <div class="claim-offer-actions">
          <button class="btn-sm" onclick="GSCClubClaim.respond('${esc(o.id)}',true)">✅ Accepter</button>
          <button class="btn-sm" onclick="GSCClubClaim.respond('${esc(o.id)}',false)">❌ Refuser</button>
        </div>
      </div>
    `).join('');
    return `<div class="card mb-16 fade-up claim-offer-banner"><div class="dash-card-title">🤝 Demande(s) de rattachement</div>${items}</div>`;
  }

  async function respond(offerId, accept) {
    try {
      const offerRef = window.doc(window.db, 'clubClaimOffers', offerId);
      await window.updateDoc(offerRef, { status: accept ? 'accepted' : 'refused', respondedAt: window.serverTimestamp ? window.serverTimestamp() : new Date() });

      if (accept) {
        const offers = await loadMyOffers(); // relit pour retrouver les détails avant filtrage 'pending'
        const snap = await window.getDoc(offerRef);
        const o = snap.data();
        await window.updateDoc(window.doc(window.db, 'users', window.currentUser.uid), {
          employeur: o.structureNom || '',
          structureId: o.structureId || null,
          statut: 'sous_contrat'
        });
        if (window.userProfile) {
          window.userProfile.employeur = o.structureNom || '';
          window.userProfile.structureId = o.structureId || null;
          window.userProfile.statut = 'sous_contrat';
        }
      }

      if (typeof window.toast === 'function') window.toast(accept ? '✅ Rattachement confirmé.' : 'Demande refusée.', 'success');
      await refreshOfferBanner();
      if (typeof window.renderProfile === 'function') window.renderProfile();
    } catch (err) {
      alert('❌ Erreur : ' + (err.message || err));
    }
  }

  async function refreshOfferBanner() {
    let host = document.getElementById('claim-offer-host');
    if (!host) {
      const anchor = document.getElementById('profile-completion-bar');
      if (!anchor || !anchor.parentElement) return;
      host = document.createElement('div');
      host.id = 'claim-offer-host';
      anchor.insertAdjacentElement('afterend', host);
    }
    const offers = await loadMyOffers();
    host.innerHTML = renderOfferBanner(offers);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. INJECTION — panneau club (recherche) + bannière joueur (offres)
   * ══════════════════════════════════════════════════════════════════ */
  function ensureClubPanel() {
    let panel = document.getElementById('claim-club-panel');
    if (panel) return panel;
    const anchor = document.getElementById('ged-depot-panel') || document.getElementById('prof-club-info-card');
    if (!anchor) return null;
    panel = document.createElement('div');
    panel.id = 'claim-club-panel';
    panel.className = 'card mb-16 fade-up ged-pub-panel';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="dash-card-title">🔎 Revendiquer un joueur</div>
      <p class="ged-pub-empty" style="text-align:left;padding:0 0 10px;">Recherchez les joueurs déjà inscrits en statut « libre » ou vous ayant mentionné comme employeur, pour les rattacher à votre structure.</p>
      <button class="btn btn-secondary" onclick="GSCClubClaim.runSearch()">🔍 Lancer la recherche</button>
      <div id="claim-results" style="margin-top:12px;"></div>
    `;
    anchor.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function updateVisibility() {
    const p = window.userProfile;
    const panel = ensureClubPanel();
    if (panel) panel.style.display = (p && ORG_ROLES.includes(p.role)) ? '' : 'none';
    refreshOfferBanner();
  }

  function patchRenderProfile() {
    if (typeof window.renderProfile === 'function' && !window.renderProfile._claimPatched) {
      const _orig = window.renderProfile;
      window.renderProfile = function () {
        const r = _orig.apply(this, arguments);
        try { updateVisibility(); } catch (e) { console.error('[GSCClubClaim]', e); }
        return r;
      };
      window.renderProfile._claimPatched = true;
    }
  }

  function boot() {
    patchRenderProfile();
    if (typeof window.renderProfile !== 'function') window.addEventListener('load', patchRenderProfile);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCClubClaim = { runSearch, sendOffer, respond };

})(window);
