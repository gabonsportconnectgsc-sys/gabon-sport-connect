/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC CLUB VALIDATION — Rattachement club/structure + validation 72h
 *  Gabon Sport Connect · v1.0 · 2026
 *
 *  Monkey-patch non-invasif (n'édite pas index.html) :
 *   1) Injecte un sélecteur "Sport" et transforme "Employeur / Club actuel"
 *      en liste déroulante dynamique alimentée par les VRAIES structures
 *      gabonaises (gsc-gabon-sports-data.js) : fédérations + les 14 clubs
 *      du National Foot 1 saison 2025-2026, filtrés par sport choisi.
 *   2) Ajoute au statut l'option "Poste de direction / dirigeant".
 *   3) Si le statut déclaré est "Sous contrat" ou "Direction" ET que la
 *      structure choisie est une structure reconnue (club/fédération) :
 *      l'inscription N'EST PAS bloquée, mais le compte est marqué
 *      `clubValidation.status = 'pending'` avec une échéance de 72h.
 *      Le club/la fédération concerné(e) — ou à défaut l'administrateur
 *      de la plateforme via gsc-club-validation-admin.js — peut valider
 *      ou refuser. En cas de refus, l'acteur repasse automatiquement en
 *      statut "libre" / sans club, avec un message l'invitant à se
 *      rapprocher de la direction de son club pour connaître les motifs.
 *
 *  Dépendances : window.db/doc/updateDoc/setDoc (firebase-init.js),
 *  window.realtimeSync, window.GSC_GABON_SPORTS_DATA (data réelle).
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  const SS_KEY = 'gsc_cv_pending_registration';
  const VALIDATION_STATUTS = ['sous_contrat', 'direction'];

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function data() { return window.GSC_GABON_SPORTS_DATA || null; }

  /* ══════════════════════════════════════════════════════════════════
   * 1. INJECTION DES CHAMPS DANS LE FORMULAIRE D'INSCRIPTION
   * ══════════════════════════════════════════════════════════════════ */
  function injectSportField() {
    if (document.getElementById('auth-register-sport-gsc')) return;
    const roleGroup = document.getElementById('auth-register-role')?.closest('.form-group');
    if (!roleGroup) return;
    const d = data();
    const sports = d ? d.SPORTS_LIST : ['Football'];
    const opts = sports.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    roleGroup.insertAdjacentHTML('afterend', `
      <div class="form-group">
        <label>Discipline sportive *</label>
        <select id="auth-register-sport-gsc" onchange="GSCClubValidation.refreshEmployeurOptions()">${opts}</select>
      </div>
    `);
  }

  function ensureDirectionStatutOption() {
    const sel = document.getElementById('auth-register-statut');
    if (!sel) return;
    if (!sel.querySelector('option[value="direction"]')) {
      sel.insertAdjacentHTML('beforeend', `<option value="direction">🧭 Poste de direction / dirigeant</option>`);
    }
    if (!sel._gscBound) {
      sel._gscBound = true;
      sel.addEventListener('change', updateValidationHint);
    }
  }

  /* Structures réelles vivantes (Firestore `structuresSportives`, via
     structures-manager.js), avec repli sur le référentiel statique
     (gsc-gabon-sports-data.js) tant que la collection n'est pas — ou pas
     encore — alimentée pour un sport donné. Les deux sources sont
     dédupliquées par nom/sigle normalisés pour ne jamais afficher deux
     fois le même club. */
  function normalize(s) {
    return (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function liveStructuresBySport(sport) {
    const list = (window.structuresManager && window.structuresManager.list && window.structuresManager.list()) || [];
    return list.filter(s => s.status !== 'deleted' && (!sport || s.discipline === sport));
  }

  function buildEmployeurOptionsHtml(sport) {
    const d = data();
    const liveAll = liveStructuresBySport(null);
    const liveFeds = liveAll.filter(s => s.type === 'Fédération');
    const liveClubs = liveStructuresBySport(sport).filter(s => s.type !== 'Fédération');
    const seenNames = new Set(liveAll.map(s => normalize(s.nom)).concat(liveAll.map(s => normalize(s.sigle))));

    const staticFeds = d ? d.FEDERATIONS.filter(f => !seenNames.has(normalize(f.nom)) && !seenNames.has(normalize(f.sigle))) : [];
    const staticClubs = d ? d.getClubsBySport(sport).filter(c => c.type === 'club' && !seenNames.has(normalize(c.nom))) : [];
    const etabs = d ? d.ETABLISSEMENTS : [];

    if (!liveFeds.length && !liveClubs.length && !staticFeds.length && !staticClubs.length) return null; // rien à afficher : on laisse le select tel quel

    let html = `<option value="">-- Sélectionner votre club/structure --</option>`;

    const fedOpts = liveFeds.map(f => `<option value="live:${esc(f.id)}">${esc(f.sigle || '')} – ${esc(f.nom)}</option>`).join('')
      + staticFeds.map(f => `<option value="${esc(f.id)}">${esc(f.sigle)} – ${esc(f.nom)}</option>`).join('');
    if (fedOpts) html += `<optgroup label="🏛️ Fédérations">${fedOpts}</optgroup>`;

    const clubOpts = liveClubs.map(c => `<option value="live:${esc(c.id)}">${esc(c.nom)}${c.ville ? ' (' + esc(c.ville) + ')' : ''}</option>`).join('')
      + staticClubs.map(c => `<option value="${esc(c.id)}">${esc(c.nom)}${c.ville ? ' (' + esc(c.ville) + ')' : ''}</option>`).join('');
    if (clubOpts) {
      const label = sport === 'Football' ? '⚽ Clubs — National Foot 1 (D1) · saison 2025-2026' : `🏟️ Clubs — ${esc(sport)}`;
      html += `<optgroup label="${label}">${clubOpts}</optgroup>`;
    }
    if (etabs.length) {
      html += `<optgroup label="🎓 Écoles / Universités">` +
        etabs.map(e => `<option value="${esc(e.id)}">${esc(e.nom)}</option>`).join('') +
        `</optgroup>`;
    }
    html += `<optgroup label="🏃 Indépendant">` +
      `<option value="Indépendant">Indépendant (sans club)</option>` +
      `<option value="Auto-entrepreneur">Auto-entrepreneur sportif</option>` +
      `</optgroup>`;
    html += `<option value="Autre">🌍 Autre (préciser dans le profil)</option>`;
    return html;
  }

  /** Résout la valeur sélectionnée ("live:<id>" ou id statique) en un objet
   *  structure uniforme {id, nom, type, validationCapable, source}. */
  function resolveStructure(value) {
    if (!value) return null;
    if (value.indexOf('live:') === 0) {
      const id = value.slice(5);
      const list = (window.structuresManager && window.structuresManager.list && window.structuresManager.list()) || [];
      const s = list.find(x => x.id === id);
      if (!s) return null;
      return { id: s.id, nom: s.nom, type: s.type, validationCapable: true, source: 'live', addedBy: s.addedBy };
    }
    const d = data();
    const s = d && (d.getStructureById(value) || d.findValidationCapableStructure(value));
    if (!s) return null;
    return { id: s.id, nom: s.nom, type: s.type, validationCapable: !!s.validationCapable, source: 'static' };
  }

  function refreshEmployeurOptions() {
    const sel = document.getElementById('auth-register-employeur');
    if (!sel) return;
    const sport = document.getElementById('auth-register-sport-gsc')?.value || 'Football';
    const html = buildEmployeurOptionsHtml(sport);
    if (html) {
      const prev = sel.value;
      sel.innerHTML = html;
      if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
    }
    if (!sel._gscBound) {
      sel._gscBound = true;
      sel.addEventListener('change', updateValidationHint);
    }
    updateValidationHint();
  }

  function currentSelection() {
    const sport = document.getElementById('auth-register-sport-gsc')?.value || 'Football';
    const statut = document.getElementById('auth-register-statut')?.value || 'libre';
    const employeurVal = document.getElementById('auth-register-employeur')?.value || '';
    const role = document.getElementById('auth-register-role')?.value || 'joueur';
    const structure = resolveStructure(employeurVal);
    const needsValidation = VALIDATION_STATUTS.includes(statut) && !!(structure && structure.validationCapable);
    return { sport, statut, employeurVal, role, structure, needsValidation };
  }

  function updateValidationHint() {
    const sel = document.getElementById('auth-register-employeur');
    if (!sel) return;
    let hint = document.getElementById('gsc-cv-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'gsc-cv-hint';
      hint.style.cssText = 'font-size:11.5px;margin-top:6px;padding:8px 10px;border-radius:8px;line-height:1.4;';
      sel.closest('.form-group')?.insertAdjacentElement('afterend', hint);
    }
    const { needsValidation, structure } = currentSelection();
    if (needsValidation) {
      hint.style.display = 'block';
      hint.style.background = '#fffbeb';
      hint.style.color = '#92400e';
      hint.innerHTML = `ℹ️ Votre rattachement à <strong>${esc(structure.nom)}</strong> sera soumis à validation par cette structure (ou par l'administration) sous <strong>72 heures</strong>. Cela ne bloque pas votre inscription : votre compte est actif immédiatement.`;
    } else {
      hint.style.display = 'none';
    }
  }

  function boot() {
    injectSportField();
    ensureDirectionStatutOption();
    refreshEmployeurOptions();
    const roleSel = document.getElementById('auth-register-role');
    if (roleSel && !roleSel._gscCvBound) {
      roleSel._gscCvBound = true;
      roleSel.addEventListener('change', refreshEmployeurOptions);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. PATCH DE L'INSCRIPTION — capture de la demande de rattachement
   * ══════════════════════════════════════════════════════════════════ */
  function patchRegister() {
    if (typeof window.handleSupabaseRegister !== 'function' || window.handleSupabaseRegister._gscPatched) return;
    const original = window.handleSupabaseRegister;
    async function patched() {
      const sel = currentSelection();
      if (sel.needsValidation) {
        sessionStorage.setItem(SS_KEY, JSON.stringify({
          structureRef: sel.employeurVal, // valeur brute du <select> ("live:<id>" ou id statique) — sert au matching addedBy
          structureId: sel.structure.id,
          structureName: sel.structure.nom,
          structureType: sel.structure.type,
          role: sel.role,
          statut: sel.statut,
          requestedAt: new Date().toISOString(),
          deadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
        }));
      } else {
        sessionStorage.removeItem(SS_KEY);
      }
      await original();
      // Cas "session immédiate" (pas de confirmation email requise) :
      // l'utilisateur est déjà connecté ici, on peut appliquer tout de suite.
      await maybeApplyPendingValidation();
    }
    patched._gscPatched = true;
    window.handleSupabaseRegister = patched;
  }

  function patchOnSignedIn() {
    if (typeof window.onSupabaseSignedIn !== 'function' || window.onSupabaseSignedIn._gscPatched) return;
    const original = window.onSupabaseSignedIn;
    async function patched(user, extra) {
      await original(user, extra);
      // Cas "confirmation email requise" : la validation en attente n'a pu
      // être appliquée qu'ici, à la toute première connexion réelle.
      await maybeApplyPendingValidation();
      renderClubValidationBanner();
      renderStructureReviewPanel();
    }
    patched._gscPatched = true;
    window.onSupabaseSignedIn = patched;
  }

  async function maybeApplyPendingValidation() {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return;
    const uid = window.currentUser && window.currentUser.uid;
    if (!uid || !window.db || !window.doc || !window.updateDoc) return;
    let info;
    try { info = JSON.parse(raw); } catch (e) { sessionStorage.removeItem(SS_KEY); return; }
    try {
      await window.updateDoc(window.doc(window.db, 'users', uid), {
        'clubValidation.status': 'pending',
        'clubValidation.structureRef': info.structureRef,
        'clubValidation.structureId': info.structureId,
        'clubValidation.structureName': info.structureName,
        'clubValidation.structureType': info.structureType,
        'clubValidation.requestedRole': info.role,
        'clubValidation.requestedStatut': info.statut,
        'clubValidation.requestedAt': info.requestedAt,
        'clubValidation.deadline': info.deadline,
      });
      if (window.userProfile) {
        window.userProfile.clubValidation = {
          status: 'pending', structureRef: info.structureRef, structureId: info.structureId, structureName: info.structureName,
          structureType: info.structureType, requestedRole: info.role, requestedStatut: info.statut,
          requestedAt: info.requestedAt, deadline: info.deadline,
        };
      }
    } catch (err) {
      console.warn('[GSCClubValidation] écriture clubValidation impossible :', err);
    } finally {
      sessionStorage.removeItem(SS_KEY);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. BANNIÈRE "EN ATTENTE / VALIDÉ / REFUSÉ" côté acteur
   * ══════════════════════════════════════════════════════════════════ */
  function renderClubValidationBanner() {
    const p = window.userProfile;
    const host = document.getElementById('pending-self-notice')?.parentElement
      || document.getElementById('view-dashboard');
    if (!p || !host) return;
    let box = document.getElementById('gsc-cv-banner');
    const cv = p.clubValidation;
    if (!cv || !cv.status || cv.status === 'none') {
      if (box) box.style.display = 'none';
      return;
    }
    if (!box) {
      box = document.createElement('div');
      box.id = 'gsc-cv-banner';
      box.className = 'readonly-notice';
      const ref = document.getElementById('pending-self-notice');
      if (ref) ref.insertAdjacentElement('afterend', box);
      else host.insertAdjacentElement('afterbegin', box);
    }
    box.style.display = 'flex';
    const overdue = cv.status === 'pending' && cv.deadline && new Date(cv.deadline).getTime() < Date.now();

    if (cv.status === 'pending') {
      box.style.background = 'linear-gradient(135deg,#fffbeb,#fef3c7)';
      box.style.borderColor = '#fbbf24';
      box.style.color = '#92400e';
      box.innerHTML = `<span class="rn-icon">⏳</span><span>Rattachement à <strong>${esc(cv.structureName)}</strong> en attente de validation` +
        (overdue ? ` — <strong>délai de 72h dépassé</strong>, une relance a peut-être été nécessaire.` : ` (réponse attendue sous 72h).`) +
        ` Votre compte reste pleinement actif pendant ce temps.</span>`;
    } else if (cv.status === 'approved') {
      box.style.background = 'linear-gradient(135deg,#ecfdf5,#d1fae5)';
      box.style.borderColor = '#10b981';
      box.style.color = '#065f46';
      box.innerHTML = `<span class="rn-icon">✅</span><span>Votre rattachement à <strong>${esc(cv.structureName)}</strong> a été validé.</span>`;
    } else if (cv.status === 'rejected') {
      box.style.background = 'linear-gradient(135deg,#fef2f2,#fee2e2)';
      box.style.borderColor = '#ef4444';
      box.style.color = '#991b1b';
      box.innerHTML = `<span class="rn-icon">❌</span><span>Rattachement à <strong>${esc(cv.structureName)}</strong> non validé. Vous êtes désormais enregistré comme membre simple, sans statut particulier. ${esc(cv.rejectionMessage || "Rapprochez-vous de la direction de votre club pour connaître les motifs du refus.")}</span>`;
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. PANNEAU DE REVUE — côté compte "club / association / fédération"
   *    (permet à la structure elle-même de valider/refuser, en plus de
   *    l'administrateur de la plateforme — voir gsc-club-validation-admin.js)
   * ══════════════════════════════════════════════════════════════════ */
  function getUsersCache() {
    return (window.realtimeSync && window.realtimeSync.getCache && window.realtimeSync.getCache('users')) || [];
  }

  /** Structures Firestore (structuresSportives) créées par le compte
   *  club/fédération actuellement connecté — lien le plus fiable, posé
   *  automatiquement par structures-manager.js (`addedBy`). */
  function myOwnedStructureIds() {
    const uid = window.currentUser && window.currentUser.uid;
    if (!uid || !window.structuresManager || !window.structuresManager.list) return [];
    return window.structuresManager.list().filter(s => s.addedBy === uid).map(s => 'live:' + s.id);
  }

  function myStructureMatches(u) {
    const p = window.userProfile;
    if (!p || !['club', 'association', 'federation'].includes(p.role)) return false;
    const cv = u.clubValidation;
    if (!cv || cv.status !== 'pending') return false;

    // 1) Lien fiable : la structure Firestore qui a servi de cible a été
    //    créée par ce même compte (structuresSportives.addedBy).
    const owned = myOwnedStructureIds();
    if (owned.length && cv.structureRef && owned.includes(cv.structureRef)) return true;

    // 2) Repli : comparaison de nom (référentiel statique ou saisie libre),
    //    même logique que le reste de l'app pour rattacher un acteur à son
    //    organisation employeuse (cf. index.html, correspondance a.club /
    //    userProfile.nomOrganisation).
    const d = data();
    const myStructure = d && d.findValidationCapableStructure(p.nomOrganisation);
    if (myStructure && cv.structureId === myStructure.id) return true;
    return normalize(cv.structureName) === normalize(p.nomOrganisation);
  }

  function renderStructureReviewPanel() {
    const p = window.userProfile;
    if (!p || !['club', 'association', 'federation'].includes(p.role)) return;
    const host = document.getElementById('view-dashboard');
    if (!host) return;
    const pending = getUsersCache().filter(myStructureMatches);

    let card = document.getElementById('gsc-cv-review-card');
    if (!pending.length) { if (card) card.style.display = 'none'; return; }
    if (!card) {
      card = document.createElement('div');
      card.id = 'gsc-cv-review-card';
      card.className = 'card mb-16 fade-up';
      host.insertAdjacentElement('afterbegin', card);
    }
    card.style.display = 'block';
    const rows = pending.map(u => {
      const uid = u.uid || u.id;
      const name = [u.prenom, u.nom].filter(Boolean).join(' ') || u.email || uid;
      const deadline = u.clubValidation?.deadline ? new Date(u.clubValidation.deadline) : null;
      const overdue = deadline && deadline.getTime() < Date.now();
      const roleLabel = u.clubValidation?.requestedRole || u.role || '';
      const statutLabel = u.clubValidation?.requestedStatut === 'direction' ? 'Poste de direction' : 'Sous contrat';
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-bd,#eee);flex-wrap:wrap;">
          <div>
            <div style="font-weight:700;font-size:13px;">${esc(name)}</div>
            <div style="font-size:11.5px;color:var(--gray-txt);">${esc(roleLabel)} · ${esc(statutLabel)}${overdue ? ' · <span style="color:#dc2626;font-weight:700;">délai dépassé</span>' : ''}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn-sm" style="background:#10b981;color:#fff;padding:6px 12px;" onclick="GSCClubValidation.approve('${uid}')">✅ Valider</button>
            <button class="btn-sm" style="background:#ef4444;color:#fff;padding:6px 12px;" onclick="GSCClubValidation.reject('${uid}')">❌ Refuser</button>
          </div>
        </div>`;
    }).join('');

    card.innerHTML = `
      <div class="card-header"><div class="card-title">🔔 Demandes de rattachement en attente (${pending.length})</div></div>
      <div class="card-body">
        <p style="font-size:12px;color:var(--gray-txt);margin-bottom:6px;">Les acteurs déclarant un statut "Sous contrat" ou "Poste de direction" chez votre structure attendent votre décision (délai indicatif : 72h). L'inscription n'est pas bloquée en attendant.</p>
        ${rows}
      </div>`;
  }

  async function approve(uid) {
    if (!window.db || !window.doc || !window.updateDoc) return;
    try {
      await window.updateDoc(window.doc(window.db, 'users', uid), {
        'clubValidation.status': 'approved',
        'clubValidation.decidedAt': new Date().toISOString(),
        'clubValidation.decidedBy': (window.currentUser && window.currentUser.uid) || 'admin',
      });
      if (typeof window.toast === 'function') window.toast('Rattachement validé.', 'success');
      renderStructureReviewPanel();
    } catch (err) {
      console.warn('[GSCClubValidation] approve erreur :', err);
    }
  }

  async function reject(uid, reason) {
    if (!window.db || !window.doc || !window.updateDoc) return;
    const message = reason || "Rapprochez-vous de la direction de votre club pour connaître les motifs du refus.";
    try {
      await window.updateDoc(window.doc(window.db, 'users', uid), {
        'clubValidation.status': 'rejected',
        'clubValidation.decidedAt': new Date().toISOString(),
        'clubValidation.decidedBy': (window.currentUser && window.currentUser.uid) || 'admin',
        'clubValidation.rejectionMessage': message,
        // L'acteur redevient "simple membre" : statut neutre, plus de club déclaré.
        statut: 'libre',
        employeur: '',
      });
      if (typeof window.toast === 'function') window.toast('Demande refusée — l\'acteur repasse en membre simple.', 'info');
      renderStructureReviewPanel();
    } catch (err) {
      console.warn('[GSCClubValidation] reject erreur :', err);
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 5. BOOT
   * ══════════════════════════════════════════════════════════════════ */
  function init() {
    boot();
    patchRegister();
    patchOnSignedIn();
    renderClubValidationBanner();
    renderStructureReviewPanel();
    if (window.realtimeSync && typeof window.realtimeSync.onUpdate === 'function') {
      window.realtimeSync.onUpdate('users', () => {
        renderClubValidationBanner();
        renderStructureReviewPanel();
      });
    }
  }

  document.addEventListener('firebase-ready', init, { once: true });
  if (window._firebaseReady) init();
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });

  window.GSCClubValidation = {
    refreshEmployeurOptions, approve, reject,
    renderClubValidationBanner, renderStructureReviewPanel,
  };

})(window);
