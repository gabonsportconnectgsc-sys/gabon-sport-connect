/* gsc-doc-modeles-membre.js (v2) — Membre : « 📋 Documents demandés pour votre profil »
   Lit ged_modeles_acteurs (publie == true) du rôle du membre + ses décisions (docDecisions).
   Par pièce : ➕ Ajouter <type> · ⏳ En attente · ✅ Validé · ❌ Non conforme + 🔄 Remplacer.
   Ajouter ?gscdebug=1 à l'URL pour un diagnostic. */
(function () {
  'use strict';
  if (window.__gscModelesMembre) return;
  window.__gscModelesMembre = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
  const DEBUG = /[?&]gscdebug=1/.test(location.search);
  function docKey(url) {
    let h = 5381; const s = String(url || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  function addLabel(n) {
    n = String(n || 'document').trim() || 'document';
    const l = (n.length > 1 && n[0] !== n[0].toLowerCase() && n[1] === n[1].toLowerCase()) ? n[0].toLowerCase() + n.slice(1) : n;
    return '➕ Ajouter ' + l;
  }

  let uid = null, role = '', myDocs = [], models = [], allPublished = [], byKey = {}, lastLoad = 0, err = '';

  function currentUid() {
    return (window.currentUser && window.currentUser.uid) ||
      (window.firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid) || null;
  }

  async function getUserDoc(u) {
    if (window.getDoc && window.doc && window.db) {
      const s = await window.getDoc(window.doc(window.db, 'users', u));
      return s.exists() ? s.data() : null;
    }
    if (window.db && window.db.collection) {
      const s = await window.db.collection('users').doc(u).get();
      return s.exists ? s.data() : null;
    }
    throw new Error('API Firestore indisponible');
  }

  async function queryAll(coll, field, val) {
    if (window.getDocs && window.query && window.where && window.collection && window.db) {
      const s = await window.getDocs(window.query(window.collection(window.db, coll), window.where(field, '==', val)));
      return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
    }
    if (window.db && window.db.collection) {
      const s = await window.db.collection(coll).where(field, '==', val).get();
      return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
    }
    throw new Error('API Firestore indisponible');
  }

  async function refresh() {
    uid = currentUid(); if (!uid) return;
    try {
      const [u, pub, decs] = await Promise.all([
        getUserDoc(uid),
        queryAll('ged_modeles_acteurs', 'publie', true),
        queryAll('docDecisions', 'uid', uid).catch(() => [])
      ]);
      role = (u && u.role) || '';
      myDocs = Array.isArray(u && u.documents) ? u.documents : [];
      allPublished = pub;
      byKey = {}; decs.forEach(d => { byKey[d.docKey] = d; });
      models = pub.filter(m => !m._suppr && norm(m.role) === norm(role))
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      err = '';
    } catch (e) { err = e.message || String(e); console.warn('[ModelesMembre]', e); }
    lastLoad = Date.now();
  }

  function mineOf(m) {
    return myDocs.filter(d => norm(d.label) === norm(m.nom))
      .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)))[0] || null;
  }

  const PILL = {
    wait: ['#fff3cd', '#8a6d00'], ok: ['#d4edda', '#155724'], bad: ['#f8d7da', '#721c24']
  };
  function pill(txt, k) {
    return '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:' + PILL[k][0] + ';color:' + PILL[k][1] + ';">' + txt + '</span>';
  }
  const BTN = 'font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;border:1px solid #1b9e5a;background:transparent;color:#1b9e5a;';

  function html() {
    let h = '';
    if (models.length) {
      h += '<div style="font-weight:700;margin:6px 0;">📋 Documents demandés pour votre profil</div>';
      h += models.map((m, i) => {
        const mine = mineOf(m);
        const dec = mine ? byKey[docKey(mine.url)] : null;
        const link = safeUrl(m.url);
        let st, action = '', motifs = '';
        if (!mine) {
          st = pill(m.obligatoire ? '⚠️ Obligatoire' : 'Facultatif', 'wait');
          action = '<button type="button" data-gm="dep" data-i="' + i + '" style="' + BTN + '">' + esc(addLabel(m.nom)) + '</button>';
        } else if (!dec) {
          st = pill('⏳ En attente', 'wait');
        } else if (dec.status === 'valide') {
          st = pill('✅ Validé', 'ok');
        } else {
          st = pill('❌ Non conforme', 'bad');
          motifs = (dec.motifs || []).map((x, k) => '<div>Motif ' + (k + 1) + ' : ' + esc(x) + '</div>').join('');
          action = '<button type="button" data-gm="rep" data-i="' + i + '" style="' + BTN + '">🔄 Remplacer ce document</button>';
        }
        return '<div style="border:1px solid rgba(128,128,128,.3);border-radius:10px;padding:8px 10px;margin-bottom:8px;">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;"><strong>' + esc(m.nom || 'Document') + '</strong>' + st + '</div>' +
          (m.description ? '<div style="font-size:12px;opacity:.8;margin-top:3px;">' + esc(m.description) + '</div>' : '') +
          (motifs ? '<div style="font-size:12px;color:#c0392b;margin-top:4px;">' + motifs + '</div>' : '') +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">' +
          (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="font-size:12px;font-weight:700;">⬇️ Télécharger le modèle</a>' : '') +
          action + '</div></div>';
      }).join('');
    }
    if (DEBUG) {
      const roles = Array.from(new Set(allPublished.map(m => m.role))).join(', ') || '—';
      h += '<div style="font-size:11px;opacity:.7;">Diagnostic : rôle membre « ' + esc(role) + ' » · ' + allPublished.length + ' modèle(s) publié(s) · rôles trouvés : ' + esc(roles) + (err ? ' · erreur : ' + esc(err) : '') + '</div>';
    }
    return h;
  }

  function startReplace(label, url) {
    if (typeof window.gscStartReplace === 'function') { window.gscStartReplace(label, url); return; }
    const inp = document.getElementById('own-document-input');
    window.__gscDocTitle = { t: label, ts: Date.now() };
    window.__gscReplace = { url, label, ts: Date.now(), startIso: new Date().toISOString() };
    if (inp) inp.click();
  }

  function decorate() {
    const titles = Array.from(document.querySelectorAll('.card-title')).filter(t => /Mes documents/.test(t.textContent));
    titles.forEach(t => {
      const card = t.closest('.card') || t.parentElement; if (!card) return;
      const btn = Array.from(card.querySelectorAll('button')).find(b => /Ajouter un document/.test(b.textContent));
      if (!btn) return;
      let box = card.querySelector('#gsc-modeles-block');
      const h = html();
      if (!h) { if (box) box.remove(); return; }
      if (!box) {
        box = document.createElement('div'); box.id = 'gsc-modeles-block'; box.style.margin = '10px 0';
        box.addEventListener('click', ev => {
          const b = ev.target.closest('[data-gm]'); if (!b) return;
          const m = models[parseInt(b.getAttribute('data-i'), 10)]; if (!m) return;
          if (b.getAttribute('data-gm') === 'rep') {
            const mine = mineOf(m); if (mine) startReplace(mine.label || m.nom, mine.url);
          } else {
            const inp = document.getElementById('own-document-input');
            window.__gscDocTitle = { t: m.nom || 'Document', ts: Date.now() };
            window.__gscReplace = null;
            if (inp) inp.click();
          }
        });
        btn.parentElement.insertBefore(box, btn);
      }
      if (box.getAttribute('data-h') !== h) { box.setAttribute('data-h', h); box.innerHTML = h; }
    });
  }

  async function tick() {
    if (!currentUid()) return;
    if (!lastLoad || currentUid() !== uid || Date.now() - lastLoad > 30000) await refresh();
    decorate();
  }
  setInterval(tick, 1500);
})();
