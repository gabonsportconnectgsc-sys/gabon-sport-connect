/* gsc-doc-reception.js — Admin : « 📥 Documents reçus »
   Valider / déclarer non conforme les documents déposés par les membres.
   - Décision stockée dans la collection docDecisions (écriture admin seule)
   - Notification dans `notifications` (senderId = uid de l'admin)
   - Lien WhatsApp wa.me avec message prêt
   Indépendant du code de la fiche acteur. */
(function () {
  'use strict';
  if (window.__gscDocReception) return;
  window.__gscDocReception = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Même fonction côté membre (gsc-doc-member.js) : clé stable d'un document
  function docKey(url) {
    let h = 5381; const s = String(url || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  const MOTIFS = [
    'Document flou ou illisible',
    'Date de validité expirée',
    'Document non recommandé',
    'Document incomplet',
    'Ce n\'est pas le type de document demandé'
  ];

  let items = [];        // {uid, name, role, tel, doc, key, id}
  let decisions = {};    // id -> décision
  let results = {};
  let certs = [];      // id -> {wa}
  let open = null;       // {id, mode}
  let showAll = false;
  let loading = false;

  function say(msg, type) {
    if (typeof window.toast === 'function') { try { window.toast(msg, type || 'info'); return; } catch (e) {} }
    alert(msg);
  }

  function adminUid() {
    try { return firebase.auth().currentUser.uid; } catch (e) { return null; }
  }

  function normPhone(raw) {
    let n = String(raw || '').replace(/[^\d]/g, '');
    if (n.startsWith('00')) n = n.slice(2);
    if (!n) return '';
    if (!n.startsWith('241') && n.length <= 9) n = '241' + n.replace(/^0/, '');
    return n;
  }

  async function load() {
    if (loading) return; if (!adminUid()) return; loading = true;
    try {
      const [uSnap, dSnap, cSnap] = await Promise.all([
        window.db.collection('users').get(),
        window.db.collection('docDecisions').get(),
        window.db.collection('docCertifications').get().catch(() => null)
      ]);
      decisions = {};
      certs = []; if (cSnap) cSnap.forEach(c => certs.push(Object.assign({ id: c.id }, c.data())));
      dSnap.forEach(d => { decisions[d.id] = d.data(); });
      items = [];
      uSnap.forEach(s => {
        const u = s.data() || {};
        if (u.isDemo || u.status === 'deleted') return;
        const docs = Array.isArray(u.documents) ? u.documents : [];
        const name = [u.prenom, u.nom].filter(Boolean).join(' ') || u.nomOrganisation || u.email || s.id;
        docs.forEach(d => {
          if (!d || !d.url) return;
          const key = docKey(d.url);
          items.push({ uid: s.id, name, prenom: u.prenom || u.nomOrganisation || '', role: u.role || '—', tel: u.telephone || u.whatsapp || '', doc: d, key, id: s.id + '_' + key });
        });
      });
    } catch (e) {
      console.warn('[DocReception] chargement', e);
      if (e && e.code === 'permission-denied') {} else say('❌ Chargement impossible : ' + (e.message || e), 'error');
    }
    loading = false;
  }

  function badge(dec) {
    if (!dec) return '<span style="background:#fff3cd;color:#8a6d00;padding:2px 8px;border-radius:10px;font-size:11px;">⏳ En attente</span>';
    if (dec.status === 'valide') return '<span style="background:#d4edda;color:#155724;padding:2px 8px;border-radius:10px;font-size:11px;">✅ Validé</span>';
    return '<span style="background:#f8d7da;color:#721c24;padding:2px 8px;border-radius:10px;font-size:11px;">❌ Non conforme</span>';
  }

  const nrm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  function ts(v) { try { return (v && v.toDate ? v.toDate() : new Date(v)).toLocaleString('fr-FR'); } catch (e) { return ''; } }
  function certFor(it) {
    const l = certs.filter(c => c.uid === it.uid && (c.docUrl === it.doc.url || nrm(c.docLabel) === nrm(it.doc.label)));
    l.sort((a, b) => (b.docUrl === it.doc.url) - (a.docUrl === it.doc.url) || String(b.acceptedAtClient).localeCompare(String(a.acceptedAtClient)));
    return l[0] || null;
  }
  function certBtn(it) {
    return certFor(it)
      ? '<button type="button" data-dr="print" data-id="' + esc(it.id) + '" style="padding:7px 12px;border:1px solid #555;border-radius:8px;background:#fff;color:#222;font-weight:700;">🖨️ Attestation</button>'
      : '<span style="font-size:11px;color:#8a6d00;align-self:center;">⚠️ Sans attestation</span>';
  }
  function printCert(id) {
    const it = items.find(x => x.id === id); const c = it && certFor(it); if (!c) return;
    const w = window.open('', '_blank'); if (!w) { say('Autorisez les fenêtres pop-up pour imprimer.', 'error'); return; }
    const row = (k, v) => '<tr><th>' + esc(k) + '</th><td>' + esc(v || '—') + '</td></tr>';
    w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Attestation ' + esc(c.id) + '</title><style>body{font-family:Arial,sans-serif;color:#111;max-width:760px;margin:0 auto;padding:16px;font-size:13px}h1{font-size:17px;border-bottom:2px solid #111;padding-bottom:6px}h2{font-size:14px;margin:16px 0 6px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top;word-break:break-word}th{width:34%;background:#f1f1f1}.t{border:1px solid #999;padding:8px;background:#fafafa}.s{font-size:11px;color:#444;margin-top:14px}.b{padding:10px 16px;font-weight:700;margin-bottom:10px}@media print{.b{display:none}}</style></head><body>' +
      '<button class="b" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>' +
      '<h1>GABON SPORT CONNECT — Attestation de dépôt et de certification de document</h1>' +
      '<h2>1. Identification du déposant</h2><table>' + row('Nom', c.memberName) + row('Rôle', c.role) + row('Identifiant GSC', c.gscId) + row('Identifiant technique', c.uid) + row('E-mail', c.email) + row('Téléphone', c.telephone) + '</table>' +
      '<h2>2. Document déposé</h2><table>' + row('Titre', c.docLabel) + row('Nom du fichier', c.fileName) + row('Taille (octets)', c.fileSize) + row('Empreinte SHA-256', c.sha256) + row('Lien du fichier', c.docUrl) + '</table>' +
      '<h2>3. Texte accepté par le déposant (version ' + esc(c.certVersion) + ')</h2><div class="t">' + esc(c.certTexte) + '</div>' +
      '<h2>4. Horodatage et traces techniques</h2><table>' + row('Acceptation (horloge de l\'appareil)', c.acceptedAtClient) + row('Enregistrement (horloge du serveur)', ts(c.createdAt)) + row('Navigateur / appareil', c.userAgent) + row('Référence de l\'attestation', c.id) + '</table>' +
      '<p class="s">Document généré le ' + esc(new Date().toLocaleString('fr-FR')) + ' depuis l\'espace administrateur GSC. L\'empreinte SHA-256 permet de vérifier que le fichier n\'a pas été modifié depuis le dépôt : elle doit être identique à celle du fichier téléchargé.</p></body></html>');
    w.document.close();
  }

  function cardHtml(it) {
    const dec = decisions[it.id];
    const res = results[it.id];
    const isOpen = open && open.id === it.id;
    let form = '';
    if (isOpen) {
      const nc = open.mode === 'non_conforme';
      form = `<div style="margin-top:10px;padding:10px;background:#f6f7f9;border-radius:8px;">
        ${nc ? `<div style="font-size:12px;font-weight:700;margin-bottom:6px;">Motifs (cochez ce qui s'applique)</div>
        ${MOTIFS.map((m, i) => `<label style="display:block;font-size:13px;margin:3px 0;"><input type="checkbox" class="dr-motif" value="${esc(m)}"> ${esc(m)}</label>`).join('')}
        <input type="text" class="dr-comment" placeholder="Autre motif (facultatif)" style="width:100%;margin-top:6px;padding:7px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">` : `<div style="font-size:13px;">Confirmer la validation de ce document ?</div>`}
        <div style="margin-top:8px;font-size:12px;font-weight:700;">Numéro WhatsApp du membre</div>
        <input type="tel" class="dr-tel" value="${esc(it.tel)}" placeholder="Ex. 24106123456" style="width:100%;padding:7px;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;">
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button type="button" data-dr="confirm" data-id="${esc(it.id)}" style="padding:8px 14px;border:0;border-radius:8px;background:${nc ? '#c0392b' : '#1e8e3e'};color:#fff;font-weight:700;">Confirmer</button>
          <button type="button" data-dr="cancel" style="padding:8px 14px;border:1px solid #bbb;border-radius:8px;background:#fff;">Annuler</button>
        </div></div>`;
    }
    const resHtml = res ? `<div style="margin-top:8px;font-size:13px;">✔ Enregistré et notifié. ${res.wa ? `<a href="${esc(res.wa)}" target="_blank" rel="noopener" style="font-weight:700;color:#128c7e;">📲 Ouvrir WhatsApp</a>` : '<em>(aucun numéro : pas de lien WhatsApp)</em>'}</div>` : '';
    return `<div style="border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:10px;background:#fff;">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div><strong>${esc(it.name)}</strong> <span style="font-size:12px;color:#666;">· ${esc(it.role)}</span></div>${badge(dec)}
      </div>
      <div style="margin:6px 0;"><a href="${esc(it.doc.url)}" target="_blank" rel="noopener">📎 ${esc(it.doc.label || 'Document')}</a></div>
      ${dec && dec.status === 'non_conforme' && dec.motifs && dec.motifs.length ? `<div style="font-size:12px;color:#721c24;">${dec.motifs.map((m, i) => 'Motif ' + (i + 1) + ' : ' + esc(m)).join('<br>')}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">
        <button type="button" data-dr="open" data-mode="valide" data-id="${esc(it.id)}" style="padding:7px 12px;border:0;border-radius:8px;background:#1e8e3e;color:#fff;font-weight:700;">✅ Valider</button>
        <button type="button" data-dr="open" data-mode="non_conforme" data-id="${esc(it.id)}" style="padding:7px 12px;border:0;border-radius:8px;background:#c0392b;color:#fff;font-weight:700;">❌ Document non conforme</button>
        ${certBtn(it)}
      </div>${form}${resHtml}</div>`;
  }

  function render() {
    let ov = document.getElementById('gsc-docrec-overlay');
    updateFab();
    if (!ov) return;
    const list = items.filter(it => showAll || !decisions[it.id]);
    ov.querySelector('#gsc-docrec-body').innerHTML =
      `<label style="font-size:13px;display:block;margin-bottom:10px;"><input type="checkbox" data-dr="toggle" ${showAll ? 'checked' : ''}> Afficher aussi les documents déjà traités</label>` +
      (list.length ? list.map(cardHtml).join('') : '<p style="color:#666;">Aucun document en attente. 🎉</p>');
    if (open) {
      const it = items.find(x => x.id === open.id);
      if (it && !it.tel) {
        window.db.collection('users').doc(it.uid).collection('private').doc('contact').get().then(s => {
          const t = s.exists ? (s.data().telephone || '') : '';
          if (t) { it.tel = t; const inp = ov.querySelector('.dr-tel'); if (inp && !inp.value) inp.value = t; }
        }).catch(() => {});
      }
    }
  }

  async function confirm(id) {
    const it = items.find(x => x.id === id); if (!it || !open) return;
    const ov = document.getElementById('gsc-docrec-overlay');
    const me = adminUid();
    if (!me) { say('❌ Session admin introuvable.', 'error'); return; }
    const status = open.mode;
    const motifs = status === 'non_conforme' ? Array.from(ov.querySelectorAll('.dr-motif:checked')).map(c => c.value) : [];
    const extra = status === 'non_conforme' ? (ov.querySelector('.dr-comment') || {}).value : '';
    if (extra && extra.trim()) motifs.push(extra.trim());
    if (status === 'non_conforme' && !motifs.length) { say('Indiquez au moins un motif.', 'error'); return; }
    const tel = normPhone((ov.querySelector('.dr-tel') || {}).value);
    const label = it.doc.label || 'Document';
    const dec = { uid: it.uid, docKey: it.key, url: it.doc.url, label, status, motifs, decidedAt: new Date(), decidedBy: me };
    try {
      await window.db.collection('docDecisions').doc(id).set(dec);
    } catch (e) { say('❌ Enregistrement refusé : ' + (e.message || e), 'error'); return; }
    decisions[id] = dec;

    const motifTxt = motifs.map((m, i) => 'Motif ' + (i + 1) + ' : ' + m);
    const title = status === 'valide' ? `✅ Document validé — ${label}` : `❌ Document non conforme — ${label}`;
    const body = status === 'valide'
      ? `Votre document "${label}" a été validé par l'administration.`
      : `Votre document "${label}" n'est pas conforme. ${motifTxt.join(' | ')}`;
    try {
      await window.db.collection('notifications').add({
        type: 'doc_decision', title, body, recipientId: it.uid, read: false,
        createdAt: new Date(), link: { section: 'profil' }, senderId: me
      });
    } catch (e) { console.warn('[DocReception] notification non envoyée', e); say('⚠️ Décision enregistrée, notification non envoyée.', 'info'); }

    const hello = 'Bonjour' + (it.prenom ? ' ' + it.prenom : '') + ',\n\n';
    const msg = status === 'valide'
      ? hello + `Votre document « ${label} » a été validé. ✅\n\nMerci,\nGSC — Administration`
      : hello + `Votre document « ${label} » n'est pas conforme. ❌\n\n${motifTxt.join('\n')}\n\nMerci de déposer un nouveau document corrigé.\nGSC — Administration`;
    results[id] = { wa: tel ? 'https://wa.me/' + tel + '?text=' + encodeURIComponent(msg) : '' };
    open = null;
    render();
  }

  function updateFab() {
    const fab = document.getElementById('gsc-docrec-fab'); if (!fab) return;
    const n = items.filter(it => !decisions[it.id]).length;
    fab.textContent = '📥 Documents reçus' + (n ? ' (' + n + ')' : '');
  }

  function build() {
    if (document.getElementById('gsc-docrec-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'gsc-docrec-overlay';
    ov.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);overflow:auto;padding:12px;box-sizing:border-box;';
    ov.innerHTML = `<div style="max-width:720px;margin:0 auto;background:#fff;color:#222;border-radius:12px;padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h3 style="margin:0;">📥 Documents reçus</h3>
        <button type="button" data-dr="close" style="border:0;background:#eee;border-radius:8px;padding:6px 12px;font-size:16px;">✕</button>
      </div><div id="gsc-docrec-body">Chargement…</div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', ev => {
      const b = ev.target.closest('[data-dr]'); if (!b) return;
      const a = b.getAttribute('data-dr');
      if (a === 'close') ov.style.display = 'none';
      else if (a === 'open') { open = { id: b.getAttribute('data-id'), mode: b.getAttribute('data-mode') }; render(); }
      else if (a === 'cancel') { open = null; render(); }
      else if (a === 'print') { printCert(b.getAttribute('data-id')); }
      else if (a === 'confirm') { b.disabled = true; confirm(b.getAttribute('data-id')).finally(() => { b.disabled = false; }); }
    });
    ov.addEventListener('change', ev => {
      if (ev.target.getAttribute && ev.target.getAttribute('data-dr') === 'toggle') { showAll = ev.target.checked; render(); }
    });

    const fab = document.createElement('button');
    fab.type = 'button'; fab.id = 'gsc-docrec-fab';
    fab.textContent = '📥 Documents reçus';
    fab.style.cssText = 'position:fixed;left:12px;bottom:76px;z-index:9998;padding:10px 14px;border:0;border-radius:24px;background:#1b5e20;color:#fff;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.3);';
    fab.onclick = async () => { ov.style.display = 'block'; ov.querySelector('#gsc-docrec-body').textContent = 'Chargement…'; await load(); render(); };
    document.body.appendChild(fab);

    // Clic sur une notification « Documents reçus » dans la cloche : ouvre le panneau
    window.GSCDocReception = { open: () => fab.onclick() };
    const prev = window.handleNotifLink;
    window.handleNotifLink = function (link) {
      if (link && link.section === 'docs_recus') { fab.onclick(); return; }
      if (typeof prev === 'function') return prev.apply(this, arguments);
      try { window.dispatchEvent(new CustomEvent('gsc-navigate', { detail: { link: link } })); } catch (e) {}
    };
    // Compteur de documents en attente sur le bouton
    setTimeout(async () => { await load(); updateFab(); }, 3000);
  }

  function init() {
    if (!window.db || !window.firebase) { setTimeout(init, 800); return; }
    build();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
