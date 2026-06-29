/**
 * GSC Profile Engine — Moteur de fiches dynamiques multi-sports
 * Remplace renderSportStats, la section stats de buildEditForm,
 * la section stats de openActorDetail et la section stats de saveProfile.
 * Backward-compatible : tous les anciens champs Firestore continuent de fonctionner.
 */

// ─────────────────────────────────────────────────────────────
// 1. CONFIGURATION DES STATS PAR SPORT × RÔLE
// ─────────────────────────────────────────────────────────────

window.GSC_SPORT_STATS_CONFIG = {

  // ── JOUEUR / ATHLÈTE ─────────────────────────────────────
  joueur: {
    Football: {
      Gardien: [
        { id:'arrets',         icon:'✋', label:'Arrêts',       type:'number' },
        { id:'cleanSheets',    icon:'🧤', label:'Clean sheets', type:'number' },
        { id:'butsEncaissés',  icon:'🥅', label:'Buts enc.',   type:'number' },
        { id:'pctArrets',      icon:'📊', label:'% Arrêts',    type:'number', suffix:'%' },
        { id:'matchsJoues',    icon:'🎮', label:'Matchs',      type:'number' },
        { id:'trophees',       icon:'🏆', label:'Trophées',    type:'number' },
      ],
      _default: [
        { id:'matchsJoues',    icon:'🎮', label:'Matchs',      type:'number' },
        { id:'buts',           icon:'⚽', label:'Buts',        type:'number' },
        { id:'passes',         icon:'🅰️', label:'Passes déc.', type:'number' },
        { id:'cartonsJaunes',  icon:'🟨', label:'C. jaunes',   type:'number' },
        { id:'cartonsRouges',  icon:'🟥', label:'C. rouges',   type:'number' },
        { id:'trophees',       icon:'🏆', label:'Trophées',    type:'number' },
      ],
    },
    Basketball: [
      { id:'matchsJoues', icon:'🎮', label:'Matchs',   type:'number' },
      { id:'buts',        icon:'🏀', label:'Points',   type:'number' },
      { id:'passes',      icon:'🔄', label:'Passes',   type:'number' },
      { id:'rebonds',     icon:'💪', label:'Rebonds',  type:'number' },
      { id:'contres',     icon:'🛡️', label:'Contres',  type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées', type:'number' },
    ],
    Handball: [
      { id:'matchsJoues', icon:'🎮', label:'Matchs',   type:'number' },
      { id:'buts',        icon:'🤾', label:'Buts',     type:'number' },
      { id:'passes',      icon:'🅰️', label:'Passes',   type:'number' },
      { id:'arrets',      icon:'✋', label:'Arrêts',   type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées', type:'number' },
    ],
    Volleyball: [
      { id:'matchsJoues', icon:'🎮', label:'Matchs',  type:'number' },
      { id:'buts',        icon:'🏐', label:'Points',  type:'number' },
      { id:'aces',        icon:'🎯', label:'Aces',    type:'number' },
      { id:'blocs',       icon:'🛡️', label:'Blocs',   type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',type:'number' },
    ],
    'Athlétisme': [
      { id:'matchsJoues',   icon:'🏃', label:'Épreuves',        type:'number' },
      { id:'meilleursTemps',icon:'⏱️', label:'Meilleur temps',  type:'text'   },
      { id:'records',       icon:'📈', label:'Records',         type:'number' },
      { id:'medailles',     icon:'🥇', label:'Médailles',       type:'number' },
      { id:'trophees',      icon:'🏆', label:'Trophées',        type:'number' },
    ],
    Natation: [
      { id:'matchsJoues',   icon:'🏊', label:'Compétitions',    type:'number' },
      { id:'meilleursTemps',icon:'⏱️', label:'Meilleur temps',  type:'text'   },
      { id:'records',       icon:'📈', label:'Records',         type:'number' },
      { id:'medailles',     icon:'🥇', label:'Médailles',       type:'number' },
      { id:'trophees',      icon:'🏆', label:'Trophées',        type:'number' },
    ],
    Boxe: [
      { id:'matchsJoues', icon:'🥊', label:'Combats',   type:'number' },
      { id:'buts',        icon:'✅', label:'Victoires', type:'number' },
      { id:'ko',          icon:'💥', label:'KO',        type:'number' },
      { id:'defaites',    icon:'❌', label:'Défaites',  type:'number' },
      { id:'categoriePoids', icon:'⚖️', label:'Catégorie', type:'text' },
    ],
    Judo: [
      { id:'matchsJoues', icon:'🥋', label:'Combats',   type:'number' },
      { id:'buts',        icon:'✅', label:'Victoires', type:'number' },
      { id:'medailles',   icon:'🥇', label:'Médailles', type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',  type:'number' },
      { id:'categoriePoids', icon:'⚖️', label:'Catégorie', type:'text' },
    ],
    Tennis: [
      { id:'classement',  icon:'📊', label:'Classement',       type:'text'   },
      { id:'matchsJoues', icon:'🎾', label:'Matchs',           type:'number' },
      { id:'buts',        icon:'✅', label:'Victoires',        type:'number' },
      { id:'trophees',    icon:'🏆', label:'Titres',           type:'number' },
    ],
    Rugby: [
      { id:'matchsJoues', icon:'🏉', label:'Matchs',          type:'number' },
      { id:'buts',        icon:'⚡', label:'Essais',          type:'number' },
      { id:'passes',      icon:'🔄', label:'Transformations', type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',        type:'number' },
    ],
    Cyclisme: [
      { id:'matchsJoues', icon:'🚴', label:'Courses',     type:'number' },
      { id:'buts',        icon:'✅', label:'Victoires',   type:'number' },
      { id:'medailles',   icon:'🥇', label:'Médailles',   type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',    type:'number' },
    ],
    Taekwondo: [
      { id:'matchsJoues', icon:'🥋', label:'Combats',    type:'number' },
      { id:'buts',        icon:'✅', label:'Victoires',  type:'number' },
      { id:'medailles',   icon:'🥇', label:'Médailles',  type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',   type:'number' },
      { id:'categoriePoids', icon:'⚖️', label:'Catégorie', type:'text' },
    ],
    _default: [
      { id:'matchsJoues', icon:'🎯', label:'Matchs/Épr.', type:'number' },
      { id:'buts',        icon:'🥇', label:'Points/Buts', type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',    type:'number' },
    ],
  },

  // ── ARBITRE ────────────────────────────────────────────────
  arbitre: {
    Football: [
      { id:'matchsJoues',   icon:'🎮', label:'Matchs arbitrés', type:'number' },
      { id:'cartonsJaunes', icon:'🟨', label:'Cartons jaunes',  type:'number' },
      { id:'cartonsRouges', icon:'🟥', label:'Cartons rouges',  type:'number' },
      { id:'niveauArbitrage', icon:'📊', label:'Niveau',        type:'text'   },
    ],
    Basketball: [
      { id:'matchsJoues', icon:'🎮', label:'Matchs arbitrés', type:'number' },
      { id:'niveauArbitrage', icon:'📊', label:'Niveau',      type:'text'   },
    ],
    _default: [
      { id:'matchsJoues', icon:'🎮', label:'Matchs arbitrés', type:'number' },
      { id:'niveauArbitrage', icon:'📊', label:'Niveau',      type:'text'   },
    ],
  },

  // ── ENTRAÎNEUR ─────────────────────────────────────────────
  entraineur: {
    _default: [
      { id:'matchsJoues',  icon:'📋', label:'Matchs dirigés',  type:'number' },
      { id:'buts',         icon:'✅', label:'Victoires',       type:'number' },
      { id:'trophees',     icon:'🏆', label:'Trophées',        type:'number' },
      { id:'diplomesCoach',icon:'🎓', label:'Diplômes',        type:'text'   },
    ],
  },

  // ── INDÉPENDANT ────────────────────────────────────────────
  independant: {
    _default: [
      { id:'matchsJoues', icon:'🎯', label:'Événements',     type:'number' },
      { id:'trophees',    icon:'🏆', label:'Distinctions',   type:'number' },
    ],
  },

  // ── ÉLÈVE / ÉTUDIANT ───────────────────────────────────────
  eleve_etudiant: {
    _default: [
      { id:'matchsJoues', icon:'🎮', label:'Compétitions',   type:'number' },
      { id:'medailles',   icon:'🥇', label:'Médailles',      type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',       type:'number' },
    ],
  },

  // ── SPORTIF ÉTRANGER ───────────────────────────────────────
  sportif_etranger: {
    _default: [
      { id:'matchsJoues', icon:'🎮', label:'Matchs',         type:'number' },
      { id:'buts',        icon:'⚽', label:'Buts/Points',    type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',       type:'number' },
    ],
  },

  // ── HANDISPORT ─────────────────────────────────────────────
  handisport: {
    _default: [
      { id:'matchsJoues', icon:'🏅', label:'Compétitions',   type:'number' },
      { id:'medailles',   icon:'🥇', label:'Médailles',      type:'number' },
      { id:'trophees',    icon:'🏆', label:'Trophées',       type:'number' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// 2. HELPER — résoudre la config de stats pour un profil
// ─────────────────────────────────────────────────────────────
function _resolveStatsConfig(p) {
  const role = p.role || 'joueur';
  const sport = (p.sport || 'Football').replace(/^[^\w\u00C0-\u017E]+/, '').trim();
  const roleConf = window.GSC_SPORT_STATS_CONFIG[role] || window.GSC_SPORT_STATS_CONFIG['joueur'];

  // Cherche la config par sport exact, puis _default
  let conf = roleConf[sport] || roleConf['_default'];

  // Cas spécial Football joueur : Gardien vs autres postes
  if (role === 'joueur' && sport === 'Football' && typeof conf === 'object' && !Array.isArray(conf)) {
    const poste = p.poste || '';
    conf = conf[poste] || conf['_default'];
  }

  return Array.isArray(conf) ? conf : [];
}

// ─────────────────────────────────────────────────────────────
// 3. PATCH — renderSportStats (Vue Profil — sport-stats-display)
// ─────────────────────────────────────────────────────────────
window.renderSportStats = function(p) {
  const container = document.getElementById('sport-stats-display');
  if (!container) return;

  const fields = _resolveStatsConfig(p);
  if (!fields.length) { container.innerHTML = ''; return; }

  container.innerHTML = fields.map(f => {
    let val = p[f.id];
    if (val === undefined || val === null || val === '') val = f.type === 'number' ? 0 : '—';
    if (f.suffix) val = val + f.suffix;
    return `<div class="sport-stat-item">
      <div class="sport-stat-icon">${f.icon}</div>
      <div>
        <div class="sport-stat-val">${val}</div>
        <div class="sport-stat-lbl">${f.label}</div>
      </div>
    </div>`;
  }).join('');
};

// ─────────────────────────────────────────────────────────────
// 4. PATCH — Section stats dans buildEditForm
//    Injecté via monkey-patch après DOMContentLoaded
// ─────────────────────────────────────────────────────────────
function _buildStatsFormSection(p) {
  const isPersonnel = ['joueur','arbitre','entraineur','independant','eleve_etudiant','sportif_etranger','handisport'].includes(p.role);
  if (!isPersonnel) return '';

  const fields = _resolveStatsConfig(p);
  if (!fields.length) return '';

  let h = `<div class="section-divider green">📊 Statistiques</div>`;
  h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">`;

  fields.forEach((f, i) => {
    const val = p[f.id] !== undefined && p[f.id] !== null ? p[f.id] : (f.type === 'number' ? 0 : '');
    if (f.type === 'number') {
      h += `<div class="form-group"><label>${f.icon} ${f.label}</label>
        <input type="number" id="edit-stat-${f.id}" value="${val}" min="0">
      </div>`;
    } else {
      h += `<div class="form-group"><label>${f.icon} ${f.label}</label>
        <input type="text" id="edit-stat-${f.id}" value="${val}" placeholder="${f.label}">
      </div>`;
    }
    // Fermer/ouvrir la grille toutes les 2 colonnes
    if ((i + 1) % 2 === 0 && i < fields.length - 1) {
      h += `</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">`;
    }
  });

  h += `</div>`;
  return h;
}

// ─────────────────────────────────────────────────────────────
// 5. PATCH — Lire les stats depuis le formulaire (pour saveProfile)
// ─────────────────────────────────────────────────────────────
window.getStatsFromForm = function(p) {
  const fields = _resolveStatsConfig(p);
  const updates = {};
  fields.forEach(f => {
    const el = document.getElementById('edit-stat-' + f.id);
    if (!el) return;
    updates[f.id] = f.type === 'number'
      ? (parseInt(el.value) || 0)
      : el.value.trim();
  });
  return updates;
};

// ─────────────────────────────────────────────────────────────
// 6. PATCH — openActorDetail stats section
// ─────────────────────────────────────────────────────────────
window._gscRenderDetailStats = function(a) {
  const isPersonnel = ['joueur','arbitre','entraineur','independant','eleve_etudiant','sportif_etranger','handisport'].includes(a.role);
  if (!isPersonnel) return '';

  const fields = _resolveStatsConfig(a);
  if (!fields.length) return '';

  let html = `<div class="adm-section"><div class="adm-section-title">📊 Statistiques</div>`;
  html += `<div class="adm-stats-grid">`;
  fields.forEach(f => {
    let val = a[f.id];
    if (val === undefined || val === null || val === '') val = f.type === 'number' ? 0 : '—';
    if (f.suffix) val = val + f.suffix;
    html += `<div class="adm-stat"><div class="adm-stat-val">${val}</div><div class="adm-stat-lbl">${f.icon} ${f.label}</div></div>`;
  });
  html += `</div></div>`;
  return html;
};

// ─────────────────────────────────────────────────────────────
// 7. INJECTION — Monkey-patch buildEditForm & saveProfile & openActorDetail
// ─────────────────────────────────────────────────────────────
(function patchGSCFunctions() {

  // --- patch buildEditForm ---
  const _origBuildEditForm = window.buildEditForm;
  if (typeof _origBuildEditForm === 'function') {
    window.buildEditForm = function(p) {
      _origBuildEditForm(p);

      // On remplace la section stats ancienne par la nouvelle
      const body = document.getElementById('edit-form-body');
      if (!body) return;

      // Chercher et remplacer l'ancienne section stats Football-only
      // La section débute par un .section-divider avec "Statistiques"
      const dividers = body.querySelectorAll('.section-divider');
      let oldStatsSection = null;
      dividers.forEach(d => {
        if (d.textContent.includes('Statistiques')) oldStatsSection = d;
      });

      if (oldStatsSection) {
        // Supprimer les éléments de l'ancienne section (le divider + les grilles qui suivent jusqu'au prochain divider ou fin)
        let node = oldStatsSection;
        const toRemove = [node];
        let next = node.nextElementSibling;
        while (next && !next.classList.contains('section-divider')) {
          toRemove.push(next);
          next = next.nextElementSibling;
        }
        toRemove.forEach(n => n.remove());
      }

      // Injecter la nouvelle section stats avant le bouton "Enregistrer"
      const isPersonnel = ['joueur','arbitre','entraineur','independant','eleve_etudiant','sportif_etranger','handisport'].includes(p.role);
      if (!isPersonnel) return;

      const saveBtn = body.querySelector('.btn-save');
      const newStats = _buildStatsFormSection(p);
      if (!newStats) return;

      const tmp = document.createElement('div');
      tmp.innerHTML = newStats;

      if (saveBtn) {
        while (tmp.firstChild) body.insertBefore(tmp.firstChild, saveBtn);
      } else {
        while (tmp.firstChild) body.appendChild(tmp.firstChild);
      }
    };
  } else {
    // buildEditForm pas encore disponible — on réessaie après un délai
    setTimeout(patchGSCFunctions, 300);
    return;
  }

  // --- patch saveProfile ---
  const _origSaveProfile = window.saveProfile;
  if (typeof _origSaveProfile === 'function') {
    window.saveProfile = async function() {
      // On ré-écrit les champs de stats dans les inputs legacy pour que
      // l'ancienne saveProfile les récupère, ET on envoie les champs nouveaux
      // directement via un second updateDoc ou via le patch ci-dessous.
      // La stratégie : injecter les valeurs dans des inputs legacy si existants,
      // puis appeler l'originale qui les lira. Pour les nouveaux champs,
      // on les envoie via un updateDoc supplémentaire.
      await _origSaveProfile();

      // Envoyer les stats dynamiques en supplément
      if (!window.db || !window.currentUser || !window.userProfile) return;
      const p = window.userProfile;
      const stats = window.getStatsFromForm(p);
      if (!stats || !Object.keys(stats).length) return;

      try {
        // firebase imports via globals already set up in index.html
        const ref = window.doc(window.db, 'users', window.currentUser.uid);
        await window.updateDoc(ref, { ...stats, updatedAt: window.serverTimestamp() });
        Object.assign(window.userProfile, stats);
        if (typeof window.renderSportStats === 'function') window.renderSportStats(window.userProfile);
      } catch(e) { console.warn('[GSC Engine] Stats update error:', e); }
    };
  }

  // --- patch openActorDetail stats block ---
  // On observe les changements sur le modal adm-detail-info (container des stats)
  // et on remplace le bloc stats dès qu'il est rendu
  const _origOpenActorDetail = window.openActorDetail;
  if (typeof _origOpenActorDetail === 'function') {
    window.openActorDetail = function(uid) {
      _origOpenActorDetail(uid);
      // Après le rendu original, remplacer le bloc stats
      requestAnimationFrame(() => {
        const actor = (window.allActors || []).find(x => (x.uid || x.id) === uid)
                   || (window.allAdminUsers || []).find(x => (x.uid || x.id) === uid);
        if (!actor) return;

        // Trouver et remplacer la section "📊 Statistiques" dans le modal
        const infoEl = document.getElementById('adm-body');
        if (!infoEl) return;

        const sections = infoEl.querySelectorAll('.adm-section');
        sections.forEach(sec => {
          const title = sec.querySelector('.adm-section-title');
          if (title && title.textContent.includes('Statistiques')) {
            sec.outerHTML = window._gscRenderDetailStats(actor);
          }
        });

        // Si aucune section stats n'existait (ex: arbitre), injecter après "Profil physique"
        const refreshed = document.getElementById('adm-body');
        if (!refreshed) return;
        const hasStat = Array.from(refreshed.querySelectorAll('.adm-section-title'))
          .some(t => t.textContent.includes('Statistiques'));

        if (!hasStat) {
          const isPersonnel = ['joueur','arbitre','entraineur','independant','eleve_etudiant','sportif_etranger','handisport'].includes(actor.role);
          if (!isPersonnel) return;
          const statsHtml = window._gscRenderDetailStats(actor);
          if (!statsHtml) return;
          // Insérer après la section "Profil physique" ou au début
          const physSection = Array.from(refreshed.querySelectorAll('.adm-section'))
            .find(s => s.querySelector('.adm-section-title')?.textContent.includes('physique'));
          if (physSection) {
            physSection.insertAdjacentHTML('afterend', statsHtml);
          } else {
            refreshed.insertAdjacentHTML('afterbegin', statsHtml);
          }
        }
      });
    };
  }

})();

// ─────────────────────────────────────────────────────────────
// 8. PATCH — prof-stats-card visible pour TOUS les rôles personnels
//    (pas seulement joueur) + label "Pied fort" dynamique
// ─────────────────────────────────────────────────────────────
(function patchRenderProfile() {
  const _origRenderProfile = window.renderProfile;
  if (typeof _origRenderProfile !== 'function') {
    setTimeout(patchRenderProfile, 300);
    return;
  }

  window.renderProfile = function() {
    _origRenderProfile();

    const p = window.userProfile;
    if (!p) return;
    const isPersonnel = ['joueur','arbitre','entraineur','independant','eleve_etudiant','sportif_etranger','handisport'].includes(p.role);

    // Rendre prof-stats-card visible pour tous les rôles personnels
    const statsCard = document.getElementById('prof-stats-card');
    if (statsCard && isPersonnel) {
      statsCard.style.display = '';
    }

    // Mettre à jour les compteurs legacy avec les bons champs selon le sport
    const fields = _resolveStatsConfig(p);
    const matchField = fields.find(f => ['matchsJoues','matchsArbitrés'].includes(f.id)) || fields[0];
    const butsField  = fields[1];
    const passField  = fields[2];

    const elMatchs = document.getElementById('prof-matchs');
    const elButs   = document.getElementById('prof-buts');
    const elPasses = document.getElementById('prof-passes');

    if (elMatchs && matchField) {
      elMatchs.textContent = p[matchField.id] ?? 0;
      const lbl = elMatchs.closest('.mini-stat')?.querySelector('.ms-lbl');
      if (lbl) lbl.textContent = matchField.label;
    }
    if (elButs && butsField) {
      elButs.textContent = p[butsField.id] ?? (butsField.type === 'number' ? 0 : '—');
      const lbl = elButs.closest('.mini-stat')?.querySelector('.ms-lbl');
      if (lbl) lbl.textContent = butsField.label;
    }
    if (elPasses && passField) {
      elPasses.textContent = p[passField.id] ?? (passField.type === 'number' ? 0 : '—');
      const lbl = elPasses.closest('.mini-stat')?.querySelector('.ms-lbl');
      if (lbl) lbl.textContent = passField.label;
    }

    // Mettre à jour le label "Pied fort" selon le sport
    const sport = (p.sport || 'Football').replace(/^[^\w\u00C0-\u017E]+/, '').trim();
    const elPied = document.getElementById('prof-pied');
    if (elPied) {
      const piedLblEl = elPied.closest('.phys-card')?.querySelector('.phys-lbl');
      if (piedLblEl) {
        const sportLabels = {
          'Football': 'Pied fort', 'Rugby': 'Pied fort',
          'Basketball': 'Main forte', 'Handball': 'Main forte',
          'Volleyball': 'Main forte', 'Tennis': 'Main forte',
          'Boxe': 'Garde', 'Judo': 'Garde', 'Taekwondo': 'Garde',
          'Athlétisme': 'Latéralité', 'Natation': 'Style',
          'Cyclisme': 'Latéralité',
        };
        piedLblEl.textContent = sportLabels[sport] || 'Latéralité';
      }
      // Valeur : pied ou main selon sport
      const sportsMain = ['Basketball','Handball','Volleyball','Tennis'];
      elPied.textContent = (sportsMain.includes(sport) ? p.main : p.pied) || '—';
    }

    // Rendre renderSportStats avec le bon profil
    if (typeof window.renderSportStats === 'function') {
      window.renderSportStats(p);
    }
  };
})();

// ─────────────────────────────────────────────────────────────
// 9. Exposer les fonctions Firebase nécessaires pour saveProfile patch
//    (reprend les variables globales déjà en place dans index.html)
// ─────────────────────────────────────────────────────────────
// Note : db, doc, updateDoc, serverTimestamp, currentUser, userProfile
// sont déjà des globaux définis dans index.html. Ce fichier les utilise via window.*

console.log('[GSC Profile Engine] ✅ Moteur de fiches multi-sports chargé.');
