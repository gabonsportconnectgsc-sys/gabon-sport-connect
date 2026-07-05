/**
 * ══════════════════════════════════════════════════════════════════════
 *  GSC-SECTEUR-FEMININ.JS — Secteur / filtre "Sport Féminin" (public)
 *  Gabon Sport Connect · 2026
 *
 *  Monkey-patch non-invasif (n'édite pas index.html) :
 *   - Ajoute un bouton toggle "🚺 Secteur Féminin" dans l'annuaire.
 *   - Filtre les acteurs affichés sur le champ `sexe === 'F'` quand actif.
 *   - Affiche un compteur d'actrices en temps réel sur le bouton.
 *   - Prépare un hook pour structures-public-view.js (GSCPublicStructures)
 *     dès que ce module sera présent — désactivé tant qu'il ne l'est pas.
 *
 *  Dépendances : aucune obligatoire. Se branche sur window.allActors,
 *  window.renderActors, window.searchAnnuaire, window.showView s'ils
 *  existent (fonctions déjà définies par index.html).
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  let _active = false;
  let _pollTimer = null;

  /* ══════════════════════════════════════════════════════════════════
   * 1. STYLES
   * ══════════════════════════════════════════════════════════════════ */
  function injectStyles() {
    if (document.getElementById('gsc-fem-styles')) return;
    const s = document.createElement('style');
    s.id = 'gsc-fem-styles';
    s.textContent = `
.gsc-fem-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  flex-shrink: 0; white-space: nowrap;
  border: 1.5px solid #ec4899; color: #be185d; background: #fdf2f8;
  border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all .15s ease;
}
.gsc-fem-toggle:hover { background: #fce7f3; }
.gsc-fem-toggle.active { background: #ec4899; color: #fff; border-color: #ec4899; }
.gsc-fem-badge {
  background: rgba(0,0,0,0.12); border-radius: 99px; padding: 1px 7px;
  font-size: 11px; font-weight: 800;
}
.gsc-fem-toggle.active .gsc-fem-badge { background: rgba(255,255,255,0.28); }
.gsc-fem-banner {
  display: none; align-items: center; gap: 8px;
  background: #fdf2f8; border: 1px solid #f9a8d4; color: #be185d;
  border-radius: 10px; padding: 8px 12px; font-size: 12.5px; font-weight: 600;
  margin: 10px 0;
}
.gsc-fem-banner.show { display: flex; }
`;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 2. COMPTAGE
   *  ⚠️ Filtrage volontairement basé sur `sexe === 'F'` de l'ACTRICE,
   *  et non sur la discipline/structure/rôle. Une actrice peut être
   *  arbitre, entraîneure ou formatrice au sein d'une structure ou
   *  d'une compétition de secteur masculin (ex. arbitrage de matchs de
   *  football masculin) : elle doit rester visible ici. Ne PAS remplacer
   *  ce filtre par une logique basée sur les effectifs de structure
   *  (saisons[saison].effectifs.femmes), qui ne reflète que les rosters
   *  de joueuses et exclurait ces actrices à tort.
   * ══════════════════════════════════════════════════════════════════ */
  function countFeminine() {
    const list = Array.isArray(window.allActors) ? window.allActors : [];
    return list.filter(a => a && a.sexe === 'F').length;
  }

  function updateBadge() {
    const badge = document.getElementById('gsc-fem-count');
    if (badge) badge.textContent = countFeminine();
  }

  /* ══════════════════════════════════════════════════════════════════
   * 3. TOGGLE + BANNIÈRE ANNUAIRE
   * ══════════════════════════════════════════════════════════════════ */
  function setActive(v) {
    _active = v;
    document.querySelectorAll('.gsc-fem-toggle').forEach(b => b.classList.toggle('active', _active));
    const banner = document.getElementById('gsc-fem-banner');
    if (banner) banner.classList.toggle('show', _active);

    if (typeof window.searchAnnuaire === 'function') window.searchAnnuaire();
    else if (typeof window.renderActors === 'function' && Array.isArray(window._lastRenderedActors)) {
      window.renderActors(window._lastRenderedActors);
    }

    // Structures publiques (structures-public-view.js), si chargé
    if (window.GSCPublicStructures && typeof window.GSCPublicStructures.setFeminineOnly === 'function') {
      window.GSCPublicStructures.setFeminineOnly(_active);
    }
  }

  function toggle() { setActive(!_active); }

  function injectAnnuaireUI() {
    const sportSelect = document.getElementById('annuaire-sport');
    if (!sportSelect || document.getElementById('gsc-fem-toggle-annuaire')) return;
    const row = sportSelect.parentElement;
    if (!row) return;
    row.insertAdjacentHTML('beforeend',
      `<button type="button" id="gsc-fem-toggle-annuaire" class="gsc-fem-toggle${_active ? ' active' : ''}" title="Afficher uniquement les actrices (sexe = Féminin)">
        🚺 Secteur Féminin <span id="gsc-fem-count" class="gsc-fem-badge">0</span>
      </button>`
    );
    document.getElementById('gsc-fem-toggle-annuaire').addEventListener('click', toggle);

    // Bannière informative au-dessus de la grille de résultats
    const grid = document.getElementById('actors-grid');
    if (grid && !document.getElementById('gsc-fem-banner')) {
      grid.insertAdjacentHTML('beforebegin',
        `<div id="gsc-fem-banner" class="gsc-fem-banner">
          🚺 Secteur Sport Féminin actif — seules les actrices (joueuses, arbitres, entraîneures, etc.) sont affichées.
        </div>`
      );
    }
    updateBadge();
  }

  function injectStructuresUI() {
    const search = document.getElementById('structures-public-search');
    if (!search || document.getElementById('gsc-fem-toggle-structures')) return;
    const row = search.parentElement;
    if (!row) return;
    row.insertAdjacentHTML('beforeend',
      `<button type="button" id="gsc-fem-toggle-structures" class="gsc-fem-toggle${_active ? ' active' : ''}" title="Afficher uniquement les structures avec effectif féminin">
        🚺 Secteur Féminin
      </button>`
    );
    document.getElementById('gsc-fem-toggle-structures').addEventListener('click', toggle);
  }

  /* ══════════════════════════════════════════════════════════════════
   * 4. PATCH — FILTRAGE DES RÉSULTATS ANNUAIRE
   * ══════════════════════════════════════════════════════════════════ */
  function patchRenderActors() {
    if (typeof window.renderActors !== 'function' || window.renderActors._gscFemPatched) return;
    const orig = window.renderActors;
    const patched = function (actors) {
      updateBadge();
      const list = _active && Array.isArray(actors)
        ? actors.filter(a => a && a.sexe === 'F')
        : actors;
      return orig.call(this, list);
    };
    patched._gscFemPatched = true;
    window.renderActors = patched;
  }

  function isActive() { return _active; }

  /* ══════════════════════════════════════════════════════════════════
   * 6. BOOT
   * ══════════════════════════════════════════════════════════════════ */
  function boot() {
    injectStyles();
    injectAnnuaireUI();
    injectStructuresUI();
    patchRenderActors();

    // Réinjecte l'UI si les vues annuaire/structures sont (re)générées après ce script
    const mo = new MutationObserver(() => {
      injectAnnuaireUI();
      injectStructuresUI();
      patchRenderActors();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Rafraîchit le compteur régulièrement (allActors se charge de façon async)
    clearInterval(_pollTimer);
    _pollTimer = setInterval(updateBadge, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.GSCFeminin = { isActive, toggle, setActive, countFeminine };

})(window);
