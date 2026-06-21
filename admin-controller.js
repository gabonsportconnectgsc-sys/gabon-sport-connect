/* ═══════════════════════════════════════════════════════════════
   ADMIN-CONTROLLER.JS — AMÉLIORÉ AVEC UPLOAD TOUS FORMATS
   ✅ Accepte tous les formats de fichiers (pas de restriction)
   ✅ Barre de progression en temps réel lors de l'upload
   ✅ Meilleure gestion des erreurs
   ═══════════════════════════════════════════════════════════════ */

// SECTION CLÉS À REMPLACER dans votre admin-controller.js
// Cherchez les fonctions pickAndUpload, doUpload, triggerActorPhotoUpload et remplacez-les par le code ci-dessous

/* ═══ UPLOAD AMÉLIORÉ — Tous formats acceptés + Barre de progression ═══ */

/**
 * Sélectionne un fichier et le prépasse au callback
 * ✅ Accepte TOUS les formats (images, vidéos, documents, etc.)
 */
function pickAndUpload(input, onFile) {
  // Enlever les restrictions d'accept
  input.accept = '';  // Accepter tous les fichiers
  input.value = '';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (file) {
      // Validation basique
      if (file.size > 100 * 1024 * 1024) { // 100 Mo max
        toast('❌ Fichier trop volumineux (max 100 Mo).', 'error');
        return;
      }
      onFile(file);
    }
  };
  input.click();
}

/**
 * Upload optimisé avec barre de progression
 * ✅ Affiche la progression en temps réel
 * ✅ Supporte tous les formats
 */
async function doUpload(file, storagePath) {
  if (!window.firebase || !window.firebase.storage) {
    toast('❌ Service de stockage indisponible.', 'error');
    return null;
  }

  // Afficher la barre de progression
  const progressBar = createProgressBar();
  document.body.appendChild(progressBar);

  try {
    const ref = window.firebase.storage().ref(storagePath);
    const uploadTask = ref.put(file);

    // Écouter les événements de progression
    uploadTask.on('state_changed',
      // onProgress
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        updateProgressBar(progressBar, progress);
        console.log('Upload progress:', progress.toFixed(2) + '%');
      },
      // onError
      (error) => {
        removeProgressBar(progressBar);
        console.error('Upload error:', error);
        toast('❌ Erreur lors de l\'upload : ' + error.message, 'error');
      },
      // onComplete
      async () => {
        const url = await ref.getDownloadURL();
        removeProgressBar(progressBar);
        toast('✅ Fichier uploadé avec succès !', 'success');
        return url;
      }
    );

    // Attendre l'upload
    await uploadTask;
    return await ref.getDownloadURL();

  } catch (error) {
    removeProgressBar(progressBar);
    console.error('Upload error:', error);
    toast('❌ Erreur upload : ' + error.message, 'error');
    return null;
  }
}

/**
 * Crée la barre de progression
 */
function createProgressBar() {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 10000;
    min-width: 300px;
  `;

  const title = document.createElement('div');
  title.style.cssText = `
    font-weight: 600;
    margin-bottom: 12px;
    color: #0A1628;
    font-size: 14px;
  `;
  title.textContent = '⏳ Envoi en cours...';

  const barContainer = document.createElement('div');
  barContainer.style.cssText = `
    background: #E2E8F0;
    height: 8px;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 8px;
  `;

  const bar = document.createElement('div');
  bar.style.cssText = `
    background: linear-gradient(90deg, #009E60, #00C78F);
    height: 100%;
    width: 0%;
    transition: width 0.3s ease;
    border-radius: 4px;
  `;
  bar.className = 'progress-fill';

  const percent = document.createElement('div');
  percent.style.cssText = `
    text-align: center;
    font-size: 12px;
    color: #64748B;
    font-weight: 500;
  `;
  percent.className = 'progress-percent';
  percent.textContent = '0%';

  barContainer.appendChild(bar);
  container.appendChild(title);
  container.appendChild(barContainer);
  container.appendChild(percent);

  return container;
}

/**
 * Met à jour la barre de progression
 */
function updateProgressBar(progressBar, percentage) {
  const bar = progressBar.querySelector('.progress-fill');
  const percent = progressBar.querySelector('.progress-percent');
  if (bar) bar.style.width = percentage + '%';
  if (percent) percent.textContent = Math.round(percentage) + '%';
}

/**
 * Supprime la barre de progression
 */
function removeProgressBar(progressBar) {
  if (progressBar && progressBar.parentNode) {
    progressBar.parentNode.removeChild(progressBar);
  }
}

/**
 * Upload la photo d'un acteur
 */
function triggerActorPhotoUpload(uid) {
  const u = users.find(x => (x.uid || x.id) === uid);
  if (!u || u.isDemo) return;
  const input = document.getElementById('actor-photo-input');
  if (!input) return;
  pickAndUpload(input, async (file) => {
    photoUploadBusyId = uid;
    renderPhotos();
    try {
      const url = await doUpload(file, `profiles/photos/${uid}`);
      if (!url) { photoUploadBusyId = null; renderPhotos(); return; }
      await window.db.collection('users').doc(u.id).update({ photoURL: url });
    } catch (e) {
      toast('Erreur upload : ' + e.message, 'error');
    } finally {
      photoUploadBusyId = null;
      renderPhotos();
    }
  });
}

/**
 * Upload l'avatar par défaut d'une catégorie
 */
function triggerDefaultAvatarUpload(role) {
  const input = document.getElementById('default-avatar-input');
  if (!input) return;
  pickAndUpload(input, async (file) => {
    photoUploadBusyId = 'default:' + role;
    renderDefaultAvatars();
    try {
      const url = await doUpload(file, `defaults/avatars/${role}`);
      if (!url) { photoUploadBusyId = null; renderDefaultAvatars(); return; }
      defaultAvatars[role] = url;
      await window.db.collection('settings').doc('defaultAvatars').set(defaultAvatars, { merge: true });
      renderPhotos();
    } catch (e) {
      toast('Erreur upload : ' + e.message, 'error');
    } finally {
      photoUploadBusyId = null;
      renderDefaultAvatars();
    }
  });
}

// Exporter les fonctions globalement
window.AdminController_triggerActorPhotoUpload = triggerActorPhotoUpload;
window.AdminController_triggerDefaultAvatarUpload = triggerDefaultAvatarUpload;

/* ═══════════════════════════════════════════════════════════════════════════ */
