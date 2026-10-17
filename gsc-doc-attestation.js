/* gsc-doc-attestation.js — Membre : attestation sur l'honneur avant l'envoi d'un document
   - Ajoute une case à cocher (texte en miniature) dans le panneau « Titrer vos documents »
   - Bloque « Envoyer » tant qu'elle n'est pas cochée
   - Préremplit le titre quand le dépôt vient d'un bouton « Ajouter <type> »
   - Après l'envoi, enregistre une preuve non modifiable dans docCertifications
     (identité, titre, lien, empreinte SHA-256 du fichier, texte accepté, date et heure) */
(function () {
  'use strict';
  if (window.__gscAttestation) return;
  window.__gscAttestation = true;

  // Texte juridique : à faire relire par un juriste gabonais. Changer la version si le texte change.
  const CERT_VERSION = 'v1';
  const CERT_TEXT = "Je certifie sur l'honneur que le ou les documents fournis ici sont authentiques, originaux ou copies conformes, et qu'ils sont déposés dans le respect des lois gabonaises. Je reconnais être seul(e) responsable de leur contenu et de toute fraude, falsification ou anomalie qui serait détectée, et j'accepte que GSC et son administration soient dégagés de toute responsabilité à ce titre.";

  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let running = false;

  function say(msg, type) {
    if (typeof window.toast === 'function') { try { window.toast(msg, type || 'info'); return; } catch (e) {} }
    alert(msg);
  }
  function currentUid() {
    return (window.currentUser && window.currentUser.uid) ||
      (window.firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid) || null;
  }

  async function getDocData(path) {
    // path : tableau de segments, ex ['users', uid] ou ['users', uid, 'private', 'contact']
    try {
      if (window.getDoc && window.doc && window.db) {
        const s = await window.getDoc(window.doc.apply(null, [window.db].concat(path)));
        return s.exists() ? s.data() : null;
      }
      if (window.db && window.db.collection) {
        let ref = window.db.collection(path[0]).doc(path[1]);
        for (let i = 2; i < path.length; i += 2) ref = ref.collection(path[i]).doc(path[i + 1]);
        const s = await ref.get();
        return s.exists ? s.data() : null;
      }
    } catch (e) { console.warn('[Attestation] lecture', path.join('/'), e); }
    return null;
  }

  async function addCert(data) {
    if (window.addDoc && window.collection && window.db) {
      data.createdAt = window.serverTimestamp ? window.serverTimestamp() : new Date();
      return window.addDoc(window.collection(window.db, 'docCertifications'), data);
    }
    if (window.db && window.db.collection && window.firebase) {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      return window.db.collection('docCertifications').add(data);
    }
    throw new Error('API Firestore indisponible');
  }

  async function getAdminUids(self) {
    try {
      let ids = [];
      if (window.getDocs && window.query && window.where && window.collection && window.db) {
        const s = await window.getDocs(window.query(window.collection(window.db, 'users'), window.where('role', '==', 'admin')));
        ids = s.docs.map(d => d.id);
      } else if (window.db && window.db.collection) {
        const s = await window.db.collection('users').where('role', '==', 'admin').get();
        ids = s.docs.map(d => d.id);
      }
      return ids.filter(x => x && x !== self);
    } catch (e) { console.warn('[Attestation] liste des admins', e); return []; }
  }

  /* __gscNotifEnrich */
  function __gscEnrich(data) {
    var pv = window.__gscPrev, t = String(data.title || '');
    var when = new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    var ex;
    if (/remplac/i.test(t)) {
      data.title = t.replace('Document remplacé', 'Document modifié');
      var old = (pv && Date.now() - pv.ts < 1200000 && pv.label && t.indexOf(pv.label) >= 0) ? pv.status : '';
      ex = ' Ancien statut : ' + (old === 'valide' ? 'Validé' : (old ? 'Non conforme' : 'En attente')) + ' · Nouveau statut : En attente · ' + when + '.';
    } else {
      ex = ' Statut : En attente · ' + when + '.';
    }
    data.body = String(data.body || '') + ex;
  }

  async function addNotif(data) {
    try { if (data && data.type === 'doc_recu') __gscEnrich(data); } catch (e) {}
    if (window.addDoc && window.collection && window.db) {
      data.createdAt = window.serverTimestamp ? window.serverTimestamp() : new Date();
      return window.addDoc(window.collection(window.db, 'notifications'), data);
    }
    if (window.db && window.db.collection && window.firebase) {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      return window.db.collection('notifications').add(data);
    }
    throw new Error('API Firestore indisponible');
  }

  // Une notification (type doc_recu) par admin et par document : fait sonner la cloche de l'admin
  async function notifyAdmins(uid, name, role, labels, replaced) {
    if (!labels.length) return;
    const admins = await getAdminUids(uid);
    for (const a of admins) {
      for (const l of labels) {
        try {
          await addNotif({
            type: 'doc_recu',
            title: (replaced ? '🔄 Document remplacé — ' : '📥 Nouveau document reçu — ') + l,
            body: (name || 'Un membre') + (role ? ' (' + role + ')' : '') + (replaced ? ' a remplacé' : ' a déposé') + ' « ' + l + ' ». À examiner dans « Documents reçus ».',
            recipientId: a, read: false, senderId: uid, link: { section: 'docs_recus' }
          });
        } catch (e) { console.warn('[Attestation] notification admin', e); }
      }
    }
  }

  async function sha256(file) {
    try {
      const buf = await file.arrayBuffer();
      const h = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return ''; }
  }

  // --- Injection dans le panneau « Titrer vos documents » ---
  function inject() {
    const panel = document.getElementById('own-doc-pending-panel');
    if (!panel || panel.querySelector('#gsc-cert-box')) return;
    const send = panel.querySelector('#own-doc-pending-send');
    if (!send) return;

    // Préremplissage du titre (bouton « Ajouter <type> »)
    const pend = window.__gscDocTitle;
    if (pend && Date.now() - pend.ts < 15 * 60 * 1000) {
      const inputs = panel.querySelectorAll('.own-doc-title-input');
      inputs.forEach((inp, i) => {
        inp.value = inputs.length > 1 ? pend.t + ' (' + (i + 1) + ')' : pend.t;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    window.__gscDocTitle = null;

    const box = document.createElement('label');
    box.id = 'gsc-cert-box';
    box.style.cssText = 'display:flex;gap:8px;align-items:flex-start;margin-top:12px;padding:8px;border:1px solid #d4d4d4;border-radius:8px;background:#fafafa;';
    box.innerHTML = '<input type="checkbox" id="gsc-cert-check" style="margin-top:2px;flex-shrink:0;width:18px;height:18px;">' +
      '<span style="font-size:10px;line-height:1.35;color:#444;">' + esc(CERT_TEXT) + '</span>';
    send.parentElement.parentElement.insertBefore(box, send.parentElement);

    const chk = box.querySelector('#gsc-cert-check');
    const sync = () => { send.disabled = !chk.checked; send.style.opacity = chk.checked ? '1' : '.45'; };
    chk.addEventListener('change', sync);
    sync();
  }

  // --- Interception du bouton « Envoyer » ---
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('#own-doc-pending-send');
    if (!b) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    const chk = document.getElementById('gsc-cert-check');
    if (!chk || !chk.checked) { say('Cochez l\'attestation pour envoyer.', 'info'); return; }
    if (running) return;
    run();
  }, true);

  async function run() {
    running = true;
    try {
      const panel = document.getElementById('own-doc-pending-panel');
      const input = document.getElementById('own-document-input');
      const files = Array.from((input && input.files) || []);
      const acceptedAtClient = new Date().toISOString();
      const infos = [];
      const rows = panel ? Array.from(panel.querySelectorAll('.own-doc-title-input')) : [];
      for (const inp of rows) {
        const title = (inp.value || '').trim();
        const sp = inp.parentElement && inp.parentElement.querySelector('span[title]');
        const fname = sp ? sp.getAttribute('title') : '';
        const f = files.find(x => x.name === fname);
        infos.push({ title: title || fname, fileName: fname, fileSize: f ? f.size : 0, sha: f ? await sha256(f) : '' });
      }

      // Envoi par le code existant (téléversement + enregistrement dans users/{uid}.documents)
      if (typeof window.confirmUploadOwnDocs === 'function') await window.confirmUploadOwnDocs();

      // Preuve : une fiche par document réellement enregistré dans le profil du membre
      const uid = currentUid(); if (!uid) return;
      const u = await getDocData(['users', uid]);
      if (!u) return;
      const priv = await getDocData(['users', uid, 'private', 'contact']) || {};
      const docs = Array.isArray(u.documents) ? u.documents : [];
      const memberName = [u.prenom, u.nom].filter(Boolean).join(' ') || u.nomOrganisation || '';
      const gscId = u.gscId || u.idGsc || u.gscCode || u.codeGsc || u.matricule || u.actorId || '';
      let saved = 0; const newLabels = [];
      for (const it of infos) {
        const mine = docs.filter(d => norm(d.label) === norm(it.title))
          .sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt)))[0];
        if (!mine) continue;
        newLabels.push(mine.label || it.title);
        const cert = {
          uid, memberName, role: u.role || '', gscId: String(gscId),
          email: priv.email || (window.currentUser && window.currentUser.email) || '', telephone: priv.telephone || '',
          docLabel: mine.label || it.title, docUrl: mine.url || '', fileName: it.fileName, fileSize: it.fileSize, sha256: it.sha,
          certTexte: CERT_TEXT, certVersion: CERT_VERSION, acceptedAtClient,
          userAgent: String(navigator.userAgent || '').slice(0, 250)
        };
        try { await addCert(cert); saved++; }
        catch (e) { try { await addCert(cert); saved++; } catch (e2) { console.warn('[Attestation] non enregistrée', e2); } }
      }
      // Remplacement : retire l'ancien document non conforme une fois le nouveau bien enregistré
      const rp = window.__gscReplace; window.__gscReplace = null;
      if (rp && rp.url && Date.now() - rp.ts < 15 * 60 * 1000) {
        const idx = docs.findIndex(d => d.url === rp.url);
        const fresh = docs.some(d => d.url !== rp.url && norm(d.label) === norm(rp.label) && String(d.addedAt) >= rp.startIso);
        if (idx >= 0 && fresh && typeof window.removeOwnDocument === 'function') {
          const oc = window.confirm; window.confirm = () => true;
          try { await window.removeOwnDocument(uid, idx); } catch (e) { console.warn('[Attestation] retrait ancien document', e); }
          finally { window.confirm = oc; }
        }
      }
      await notifyAdmins(uid, memberName, u.role || '', newLabels, !!(rp && rp.url));
      if (infos.length && saved < infos.length) say('⚠️ Document envoyé, mais l\'attestation n\'a pas pu être enregistrée pour ' + (infos.length - saved) + ' fichier(s).', 'info');
    } catch (e) {
      console.warn('[Attestation]', e);
    } finally { running = false; }
  }

  // Annulation du sélecteur de fichier : on oublie le titre prérempli
  document.addEventListener('cancel', ev => {
    if (ev.target && ev.target.id === 'own-document-input') window.__gscDocTitle = null; window.__gscReplace = null;
  }, true);

  setInterval(inject, 400);
})();
