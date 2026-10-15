/* gsc-doc-member.js — Membre : badge ⏳ / ✅ / ❌ (avec motifs numérotés)
   à côté de chaque document de la carte « 📁 Mes documents ».
   Lecture seule de docDecisions (filtrée sur son uid). */
(function () {
  'use strict';
  if (window.__gscDocMember) return;
  window.__gscDocMember = true;

  function docKey(url) {
    let h = 5381; const s = String(url || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let uid = null, byKey = {}, lastLoad = 0;

  function currentUid() {
    return (window.currentUser && window.currentUser.uid) ||
      (window.firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid) || null;
  }

  async function fetchDecisions(u) {
    if (window.getDocs && window.query && window.where && window.collection && window.db) {
      const s = await window.getDocs(window.query(window.collection(window.db, 'docDecisions'), window.where('uid', '==', u)));
      return s.docs.map(d => d.data());
    }
    if (window.db && window.db.collection) {
      const s = await window.db.collection('docDecisions').where('uid', '==', u).get();
      return s.docs.map(d => d.data());
    }
    throw new Error('API Firestore indisponible');
  }

  async function refresh() {
    uid = currentUid(); if (!uid) return;
    try {
      const list = await fetchDecisions(uid);
      byKey = {}; list.forEach(d => { byKey[d.docKey] = d; });
      lastLoad = Date.now();
    } catch (e) { console.warn('[DocMember]', e); }
  }

  function badgeHtml(dec) {
    if (!dec) return '⏳ En attente';
    if (dec.status === 'valide') return '✅ Validé';
    const m = (dec.motifs || []).map((x, i) => '<div>Motif ' + (i + 1) + ' : ' + esc(x) + '</div>').join('');
    return '❌ Non conforme' + (m ? '<div style="font-weight:400;margin-top:2px;">' + m + '</div>' : '') +
      '<div><button type="button" class="gsc-docreplace" style="margin-top:4px;padding:3px 8px;border-radius:8px;border:1px solid #721c24;background:#fff;color:#721c24;font-size:11px;font-weight:700;">🔄 Remplacer</button></div>';
  }
  function badgeStyle(dec) {
    const c = !dec ? ['#fff3cd', '#8a6d00'] : dec.status === 'valide' ? ['#d4edda', '#155724'] : ['#f8d7da', '#721c24'];
    return 'display:inline-block;margin-left:8px;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;vertical-align:middle;background:' + c[0] + ';color:' + c[1] + ';';
  }

  function decorate() {
    const titles = Array.from(document.querySelectorAll('.card-title')).filter(t => /Mes documents/.test(t.textContent));
    titles.forEach(t => {
      const card = t.closest('.card') || t.parentElement; if (!card) return;
      card.querySelectorAll('a[href^="http"]').forEach(a => {
        if (a.closest('#gsc-modeles-block')) return;
        const dec = byKey[docKey(a.getAttribute('href'))];
        const html = badgeHtml(dec);
        let b = a.nextElementSibling;
        if (!b || !b.classList.contains('gsc-docbadge')) {
          b = document.createElement('span'); b.className = 'gsc-docbadge';
          a.insertAdjacentElement('afterend', b);
        }
        if (b.getAttribute('data-h') !== html) { b.setAttribute('data-h', html); b.style.cssText = badgeStyle(dec); b.innerHTML = html; }
      });
    });
  }

  // Remplacement d'un document non conforme : nouveau fichier, même titre, ancien retiré après envoi réussi
  window.gscStartReplace = function (label, url) {
    const inp = document.getElementById('own-document-input'); if (!inp) return;
    window.__gscDocTitle = { t: label, ts: Date.now() };
    window.__gscReplace = { url: url, label: label, ts: Date.now(), startIso: new Date().toISOString() };
    inp.click();
  };
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.gsc-docreplace'); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    const badge = b.closest('.gsc-docbadge'); const a = badge && badge.previousElementSibling;
    if (!a || !a.getAttribute) return;
    const label = (a.textContent || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
    window.gscStartReplace(label, a.getAttribute('href'));
  }, true);

  async function tick() {
    if (!currentUid()) return;
    if (!uid || Date.now() - lastLoad > 60000) await refresh();
    decorate();
  }
  setInterval(tick, 1500);
})();
