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

  // ── CORRECTIF (06/08/2026) ──
  // Même Worker que le pont d'authentification et les actions admin (voir
  // admin-controller.js) — utilisé ici pour l'endpoint /accept-club-offer.
  // L'écriture de structureId sur son propre profil est verrouillée côté
  // firestore.rules (LOCKED_SELF_FIELDS) et échouait systématiquement en
  // permission-denied ; elle passe désormais par ce Worker (compte de
  // service), qui revérifie l'offre côté serveur avant de l'appliquer.
  const GSC_WORKER_URL = 'https://gsc-auth-bridge.gabonsportconnectgsc.workers.dev';

  async function getMyAccessToken() {
    if (!window._sb) throw new Error('Session introuvable (Supabase non initialisé).');
    let { data: { session } } = await window._sb.auth.getSession();
    if (!session) {
      const refreshed = await window._sb.auth.refreshSession();
      session = refreshed.data && refreshed.data.session;
    }
    if (!session || !session.access_token) throw new Error('Session expirée — reconnectez-vous.');
    return session.access_token;
  }

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

    // ── CORRECTIF (03/08/2026) : searchCandidates() téléchargeait auparavant
    // TOUTE la collection users (getDocs(usersRef) sans filtre) pour ne
    // garder que les quelques profils dont le champ "employeur" (texte libre)
    // correspondait au nom de la structure — filtrage fait côté client après
    // coup. Autorisé par les règles Firestore (lecture publique), mais très
    // coûteux (une lecture facturée par utilisateur de la plateforme, à
    // chaque recherche) et expose au navigateur du club l'intégralité du
    // profil de chaque membre, pas seulement les quelques correspondances
    // affichées. Remplacé par une requête ciblée sur le champ "employeur"
    // (égalité exacte, sensible à la casse — accepte de rater les variantes
    // de casse/espaces plutôt que de re-scanner toute la base ; en pratique
    // la plupart des joueurs sélectionnent leur club dans la liste déroulante
    // à l'inscription, donc le nom est déjà celui exact de la structure).
    const orgName = (p.nomOrganisation || '').trim();
    const queries = [
      window.getDocs(window.query(usersRef, window.where('statut', '==', 'libre')))
    ];
    if (orgName) {
      queries.push(window.getDocs(window.query(usersRef, window.where('employeur', '==', orgName))));
    }
    const results = await Promise.all(queries);
    const libreSnap = results[0];
    const mentionSnap = results[1] || null;

    const seen = new Set();
    const candidates = [];
    libreSnap.docs.forEach(d => {
      if (seen.has(d.id) || d.id === p.uid) return;
      seen.add(d.id);
      candidates.push({ id: d.id, ...d.data(), _matchType: 'libre' });
    });
    if (mentionSnap) {
      mentionSnap.docs.forEach(d => {
        if (seen.has(d.id) || d.id === p.uid) return;
        seen.add(d.id);
        candidates.push({ id: d.id, ...d.data(), _matchType: 'mention' });
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
      // ── CORRECTIF (03/08/2026) : aucune vérification n'empêchait d'envoyer
      // plusieurs offres en rafale vers la même personne (spam de
      // notifications côté joueur, pollution de clubClaimOffers). On
      // vérifie qu'une offre "pending" de cette structure vers cette cible
      // n'existe pas déjà avant d'en créer une nouvelle.
      const dupSnap = await window.getDocs(window.query(
        window.collection(window.db, 'clubClaimOffers'),
        window.where('targetUid', '==', targetUid),
        window.where('structureOwnerUid', '==', window.currentUser.uid),
        window.where('status', '==', 'pending')
      ));
      if (!dupSnap.empty) {
        alert('Une offre est déjà en attente pour cette personne.');
        return;
      }

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
    const now = Date.now();
    // ── CORRECTIF (03/08/2026) : expiresAt (72h) était stocké à la création
    // mais jamais vérifié nulle part — une offre restait acceptable/refusable
    // indéfiniment après son "expiration" affichée. On filtre ici les offres
    // dont l'échéance est dépassée (elles restent en base avec status
    // 'pending', un nettoyage périodique côté admin/Cloud Function serait
    // l'endroit propre pour les faire passer à 'expired', hors du périmètre
    // de ce fichier).
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => {
        const exp = o.expiresAt?.toDate ? o.expiresAt.toDate().getTime() : (o.expiresAt ? new Date(o.expiresAt).getTime() : null);
        return !exp || exp > now;
      });
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

      // ── CORRECTIF (06/08/2026) ──
      // La règle Firestore sur users/{uid} interdit l'auto-modification du
      // champ structureId (LOCKED_SELF_FIELDS, voir firestore.rules) —
      // verrou légitime anti-usurpation (empêche un compte de s'auto-
      // rattacher à n'importe quelle structure). Cette écriture échouait
      // donc systématiquement en permission-denied lors de l'acceptation
      // d'une offre pourtant légitime. Elle passe désormais par le Worker
      // gsc-auth-bridge (/accept-club-offer, compte de service), qui
      // revérifie côté serveur que l'offre cible bien ce joueur, qu'elle
      // est 'pending' et non expirée, avant d'appliquer le rattachement.
      // Le Worker applique lui-même l'ordre d'écriture sûr : profil
      // rattaché AVANT que l'offre soit marquée 'accepted' (jamais d'offre
      // "accepted" sans rattachement réel derrière).
      if (accept) {
        const snap = await window.getDoc(offerRef);
        const o = snap.data();
        if (!o || o.status !== 'pending') {
          alert('Cette offre n\'est plus disponible.');
          await refreshOfferBanner();
          return;
        }

        try {
          const token = await getMyAccessToken();
          const resp = await fetch(GSC_WORKER_URL + '/accept-club-offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ offerId, accept: true })
          });
          if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            throw new Error(`HTTP ${resp.status} ${txt}`);
          }
        } catch (profileErr) {
          console.error('[GSCClubClaim] Échec de la mise à jour du profil à l\'acceptation :', profileErr);
          alert('❌ Le rattachement n\'a pas pu être appliqué à votre profil : ' + (profileErr.message || profileErr));
          return; // offre NON marquée acceptée côté Worker — reste 'pending', rien d'incohérent
        }

        if (window.userProfile) {
          window.userProfile.employeur = o.structureNom || '';
          window.userProfile.structureId = o.structureId || null;
          window.userProfile.statut = 'sous_contrat';
        }

        // Le Worker a déjà marqué l'offre 'accepted' côté serveur après
        // rattachement réussi — pas de second updateDoc client ici.
        if (typeof window.toast === 'function') window.toast('✅ Rattachement confirmé.', 'success');
        await refreshOfferBanner();
        if (typeof window.renderProfile === 'function') window.renderProfile();
        return;
      }

      // ── Cas refus : inchangé, toujours autorisé directement côté client ──
      await window.updateDoc(offerRef, { status: 'refused', respondedAt: window.serverTimestamp ? window.serverTimestamp() : new Date() });

      if (typeof window.toast === 'function') window.toast('Demande refusée.', 'success');
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
