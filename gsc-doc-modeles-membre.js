/* gsc-doc-modeles-membre.js — Membre : « 📋 Documents demandés pour votre profil »
   Lit ged_modeles_acteurs (publie == true), garde ceux du rôle du membre,
   et les affiche dans la carte « 📁 Mes documents » avec modèle à télécharger
   et bouton « Déposer ». Ajouter ?gscdebug=1 à l'URL pour un diagnostic. */
(function () {
  'use strict';
  if (window.__gscModelesMembre) return;
  window.__gscModelesMembre = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
  const DEBUG = /[?&]gscdebug=1/.test(location.search);
  function addLabel(n) {
    n = String(n || 'document').trim() || 'document';
    const l = (n.length > 1 && n[0] !== n[0].toLowerCase() && n[1] === n[1].toLowerCase()) ? n[0].toLowerCase() + n.slice(1) : n;
    return '➕ Ajouter ' + l;
  }

  let uid = null, role = '', myDocs = [], models = [], allPublished = [], lastLoad = 0, err = '';

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

  async function getPublished() {
    if (window.getDocs && window.query && window.where && window.collection && window.db) {
      const s = await window.getDocs(window.query(window.collection(window.db, 'ged_modeles_acteurs'), window.where('publie', '==', true)));
      return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
    }
    if (window.db && window.db.collection) {
      const s = await window.db.collection('ged_modeles_acteurs').where('publie', '==', true).get();
      return s.docs.map(d => Object.assign({ id: d.id }, d.data()));
    }
    throw new Error('API Firestore indisponible');
  }

  async function refresh() {
    uid = currentUid(); if (!uid) return;
    try {
      const [u, pub] = await Promise.all([getUserDoc(uid), getPublished()]);
      role = (u && u.role) || '';
      myDocs = Array.isArray(u && u.documents) ? u.documents : [];
      allPublished = pub;
      models = pub.filter(m => !m._suppr && norm(m.role) === norm(role))
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      err = '';
    } catch (e) { err = e.message || String(e); console.warn('[ModelesMembre]', e); }
    lastLoad = Date.now();
  }

  function say(msg) {
    if (typeof window.toast === 'function') { try { window.toast(msg, 'info'); return; } catch (e) {} }
    alert(msg);
  }

  function html() {
    let h = '';
    if (models.length) {
      h += '<div style="font-weight:700;margin:6px 0;">📋 Documents demandés pour votre profil</div>';
      h += models.map((m, i) => {
        const done = myDocs.some(d => norm(d.label) === norm(m.nom));
        const link = safeUrl(m.url);
        return '<div style="border:1px solid rgba(128,128,128,.3);border-radius:10px;padding:8px 10px;margin-bottom:8px;">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center;">' +
          '<strong>' + esc(m.nom || 'Document') + '</strong>' +
          '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:' + (done ? '#d4edda' : '#fff3cd') + ';color:' + (done ? '#155724' : '#8a6d00') + ';">' + (done ? '✅ Déposé' : (m.obligatoire ? '⚠️ Obligatoire' : 'Facultatif')) + '</span></div>' +
          (m.description ? '<div style="font-size:12px;opacity:.8;margin-top:3px;">' + esc(m.description) + '</div>' : '') +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">' +
          (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener" style="font-size:12px;font-weight:700;">⬇️ Télécharger le modèle</a>' : '') +
          (done ? '' : '<button type="button" data-gm="dep" data-i="' + i + '" style="font-size:12px;font-weight:700;padding:5px 10px;border-radius:8px;border:1px solid #1b9e5a;background:transparent;color:#1b9e5a;">' + esc(addLabel(m.nom)) + '</button>') +
          '</div></div>';
      }).join('');
    }
    if (DEBUG) {
      const roles = Array.from(new Set(allPublished.map(m => m.role))).join(', ') || '—';
      h += '<div style="font-size:11px;opacity:.7;">Diagnostic : rôle membre « ' + esc(role) + ' » · ' + allPublished.length + ' modèle(s) publié(s) · rôles trouvés : ' + esc(roles) + (err ? ' · erreur : ' + esc(err) : '') + '</div>';
    }
    return h;
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
          const b = ev.target.closest('[data-gm="dep"]'); if (!b) return;
          const m = models[parseInt(b.getAttribute('data-i'), 10)]; if (!m) return;
          const inp = document.getElementById('own-document-input');
          window.__gscDocTitle = { t: m.nom || 'Document', ts: Date.now() };
          if (inp) inp.click();
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
