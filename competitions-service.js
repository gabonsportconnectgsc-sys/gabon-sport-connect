/* ==========================================================
   GSC — Service des compétitions (lecture, création, synchro)
   Fichier dédié : js/competitions-service.js
   Dépend de : js/competitions-data.js (calendrier de référence)

   Initialisation (une fois, après Firebase) :
     GSCCompetitions.init({ db: firebase.firestore() });           // SDK « compat »
     GSCCompetitions.init({ db: db, api: { collection, doc, getDocs, setDoc, deleteDoc } }); // SDK modulaire

   Sans base (db absent) : le calendrier de référence est affiché en lecture seule.
   ========================================================== */
(function (global) {
  'use strict';

  var PALETTE = ['#1e88e5', '#43a047', '#e53935', '#fb8c00', '#8e24aa', '#00acc1',
                 '#d81b60', '#6d4c41', '#3949ab', '#7cb342', '#f4511e', '#00897b'];
  var cfg = { collection: 'competitions', meta: 'competitions_meta', db: null, api: null, mode: 'aucun' };

  function reference() {
    return (global.GSC_COMPETITIONS_REFERENCE && global.GSC_COMPETITIONS_REFERENCE.competitions) || [];
  }
  function versionReference() {
    return (global.GSC_COMPETITIONS_REFERENCE && global.GSC_COMPETITIONS_REFERENCE.version) || '';
  }
  function nettoyer(o) {
    var out = {};
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (v === undefined) return;
      if (Array.isArray(v)) out[k] = v.map(function (x) { return (x && typeof x === 'object') ? nettoyer(x) : x; });
      else if (v && typeof v === 'object' && typeof v.toDate !== 'function') out[k] = nettoyer(v);
      else out[k] = v;
    });
    return out;
  }
  /* Renseigne debut/fin à partir des périodes (utile pour les tris et l'affichage) */
  function completer(c) {
    if (Array.isArray(c.periodes) && c.periodes.length) {
      var d = c.periodes[0].debut, f = c.periodes[0].fin;
      c.periodes.forEach(function (p) { if (p.debut < d) d = p.debut; if (p.fin > f) f = p.fin; });
      c.debut = d; c.fin = f;
    }
    return c;
  }
  function nouvelId() { return 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- Adaptateur Firestore (compat ou modulaire) ---------- */
  var A = {
    liste: function (col) {
      if (cfg.mode === 'modulaire') {
        return cfg.api.getDocs(cfg.api.collection(cfg.db, col)).then(function (s) {
          return s.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
        });
      }
      return cfg.db.collection(col).get().then(function (s) {
        return s.docs.map(function (d) { var x = d.data(); x.id = d.id; return x; });
      });
    },
    ecrire: function (col, id, data) {
      if (cfg.mode === 'modulaire') return cfg.api.setDoc(cfg.api.doc(cfg.db, col, id), data, { merge: true });
      return cfg.db.collection(col).doc(id).set(data, { merge: true });
    },
    lire: function (col, id) {
      if (cfg.mode === 'modulaire') {
        return cfg.api.getDoc(cfg.api.doc(cfg.db, col, id)).then(function (d) { return d.exists() ? d.data() : null; });
      }
      return cfg.db.collection(col).doc(id).get().then(function (d) { return d.exists ? d.data() : null; });
    }
  };

  function init(options) {
    var o = options || {};
    if (o.collection) cfg.collection = o.collection;
    if (o.meta) cfg.meta = o.meta;
    cfg.db = o.db || null; cfg.api = o.api || null;
    if (cfg.db && cfg.api) cfg.mode = 'modulaire';
    else if (cfg.db && typeof cfg.db.collection === 'function') cfg.mode = 'compat';
    else if (!cfg.db && global.firebase && typeof global.firebase.firestore === 'function') {
      try { cfg.db = global.firebase.firestore(); cfg.mode = 'compat'; } catch (e) { cfg.mode = 'aucun'; }
    } else cfg.mode = 'aucun';
    return cfg.mode;
  }
  function connecte() { return cfg.mode !== 'aucun'; }

  /* ---------- Lecture : référence + base (la base l'emporte) ---------- */
  function charger() {
    var base = reference().map(function (r) { return completer(JSON.parse(JSON.stringify(r))); });
    if (!connecte()) return Promise.resolve(base);
    return A.liste(cfg.collection).then(function (docs) {
      var map = {};
      base.forEach(function (c) { map[c.id] = c; });
      docs.forEach(function (d) { map[d.id] = d; });
      return Object.keys(map).map(function (k) { return completer(map[k]); }).filter(function (c) { return !c.supprime; });
    }).catch(function (err) {
      console.warn('[GSC] Lecture des compétitions impossible, calendrier de référence utilisé.', err);
      return base;
    });
  }

  /* ---------- Validation / enregistrement ---------- */
  function valideDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(new Date(s + 'T00:00:00Z')); }

  function valider(c) {
    var e = [];
    if (!c.nom || !String(c.nom).trim()) e.push('Le nom est obligatoire.');
    if (Array.isArray(c.periodes) && c.periodes.length) {
      c.periodes.forEach(function (p, i) {
        if (!valideDate(p.debut) || !valideDate(p.fin)) e.push('Période ' + (i + 1) + ' : dates invalides.');
        else if (p.fin < p.debut) e.push('Période ' + (i + 1) + ' : la fin précède le début.');
      });
    } else {
      if (!valideDate(c.debut)) e.push('La date de début est obligatoire.');
      if (!valideDate(c.fin)) e.push('La date de fin est obligatoire.');
      if (valideDate(c.debut) && valideDate(c.fin) && c.fin < c.debut) e.push('La date de fin précède le début.');
    }
    if (c.source && !/^https?:\/\//i.test(c.source)) e.push('Le lien source doit commencer par http:// ou https://.');
    return e;
  }

  function couleurLibre(liste) {
    var prises = {};
    liste.forEach(function (c) { if (c.couleur) prises[c.couleur.toLowerCase()] = 1; });
    for (var i = 0; i < PALETTE.length; i++) if (!prises[PALETTE[i]]) return PALETTE[i];
    return PALETTE[liste.length % PALETTE.length];
  }

  function enregistrer(comp, listeActuelle) {
    if (!connecte()) return Promise.reject(new Error('Base de données non connectée.'));
    var c = JSON.parse(JSON.stringify(comp));
    var erreurs = valider(c);
    if (erreurs.length) return Promise.reject(new Error(erreurs.join(' ')));
    var nouveau = !c.id;
    if (nouveau) { c.id = nouvelId(); c.origine = 'admin'; c.couleur = c.couleur || couleurLibre(listeActuelle || []); }
    else if (String(c.id).indexOf('ref-') === 0) c.modifieManuellement = true;
    if (c.periodes && c.periodes.length) {
      c.debut = c.periodes[0].debut;
      c.fin = c.periodes.reduce(function (m, p) { return p.fin > m ? p.fin : m; }, c.periodes[0].fin);
    } else { c.periodes = []; }
    c.supprime = false;
    c.majLe = new Date().toISOString();
    return A.ecrire(cfg.collection, c.id, nettoyer(c)).then(function () { return c; });
  }

  /* Suppression : « pierre tombale » pour que le calendrier de référence ne la réintroduise pas */
  function supprimer(id) {
    if (!connecte()) return Promise.reject(new Error('Base de données non connectée.'));
    return A.ecrire(cfg.collection, id, { id: id, supprime: true, majLe: new Date().toISOString() });
  }

  /* ---------- Synchronisation avec la situation réelle ---------- */
  function synchroniser() {
    if (!connecte()) return Promise.reject(new Error('Base de données non connectée.'));
    var ver = versionReference();
    var resume = { ajoutees: 0, misesAJour: 0, conservees: 0, total: 0, version: ver };
    return A.liste(cfg.collection).then(function (docs) {
      var existants = {};
      docs.forEach(function (d) { existants[d.id] = d; });
      var taches = [];
      reference().forEach(function (r) {
        var d = existants[r.id];
        var data = nettoyer(JSON.parse(JSON.stringify(r)));
        data.origine = 'reference'; data.refVersion = ver; data.supprime = false; data.majLe = new Date().toISOString();
        if (!d) { resume.ajoutees++; taches.push(A.ecrire(cfg.collection, r.id, data)); }
        else if (d.supprime || d.modifieManuellement) { resume.conservees++; }
        else if (d.refVersion !== ver) { resume.misesAJour++; taches.push(A.ecrire(cfg.collection, r.id, data)); }
      });
      return Promise.all(taches);
    }).then(function () {
      return A.ecrire(cfg.meta, 'synchro', { date: new Date().toISOString(), version: ver });
    }).then(function () { return charger(); })
      .then(function (liste) { resume.total = liste.length; resume.liste = liste; return resume; });
  }

  function derniereSynchro() {
    if (!connecte()) return Promise.resolve(null);
    return A.lire(cfg.meta, 'synchro').then(function (d) { return d || null; }).catch(function () { return null; });
  }

  global.GSCCompetitions = {
    init: init, connecte: connecte, charger: charger, enregistrer: enregistrer, supprimer: supprimer,
    synchroniser: synchroniser, derniereSynchro: derniereSynchro, valider: valider, couleurLibre: couleurLibre, PALETTE: PALETTE,
    versionReference: versionReference
  };
})(typeof window !== 'undefined' ? window : globalThis);
