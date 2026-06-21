/* ═══════════════════════════════════════════════════════════════
   ADMIN CONTROLLER QR INTEGRATION
   • Ajoute le bouton QR au modal joueur
   • Ajoute les actions batch de QR codes
   • Intègre les QR codes dans la vue liste des acteurs
   ═══════════════════════════════════════════════════════════════ */

(function() {
  // Attendre que admin-controller.js soit chargé
  const checkAdminController = setInterval(() => {
    if (window.QRCodeManager) {
      clearInterval(checkAdminController);
      initQRIntegration();
    }
  }, 100);

  function initQRIntegration() {
    // ─── Ajouter le bouton QR au modal joueur ───
    patchPlayerModal();
    
    // ─── Ajouter la section batch QR codes ───
    patchPlayersList();
    
    // ─── Ajouter les event listeners ───
    wireQRActions();
  }

  /**
   * Ajoute le bouton "Afficher QR Code" dans le modal joueur
   */
  function patchPlayerModal() {
    // On overwrite la fonction openPlayerModal du admin-controller
    const originalOpenPlayerModal = window.openPlayerModal;
    
    window.openPlayerModal = function(id) {
      // Appeler la fonction originale
      originalOpenPlayerModal.call(this, id);
      
      // Ajouter le bouton QR après un délai (pour s'assurer que le modal est ouvert)
      setTimeout(() => {
        const modal = document.getElementById('player-modal');
        const user = window.users?.find(u => u.id === id);
        
        if (modal && user && !document.getElementById('qr-button-player')) {
          const photoSection = modal.querySelector('[data-label="Photo"]')?.parentElement || 
                              modal.querySelector('.modal-body');
          
          if (photoSection) {
            const qrButton = document.createElement('button');
            qrButton.id = 'qr-button-player';
            qrButton.className = 'qr-button-player';
            qrButton.innerHTML = '📱 Afficher QR Code';
            qrButton.onclick = (e) => {
              e.preventDefault();
              window.QRCodeManager.showQRModal(user);
            };
            
            // Insérer après la section photo ou au début du formulaire
            const insertAfter = photoSection.querySelector('.modal-photo-box');
            if (insertAfter) {
              insertAfter.parentElement.insertBefore(qrButton, insertAfter.nextSibling);
            } else {
              photoSection.insertBefore(qrButton, photoSection.firstChild);
            }
          }
        }
      }, 100);
    };
  }

  /**
   * Ajoute une section de génération batch de QR codes
   */
  function patchPlayersList() {
    // On overwrite renderPlayers du admin-controller
    const originalRenderPlayers = window.renderPlayers;
    
    window.renderPlayers = function() {
      // Appeler la fonction originale
      originalRenderPlayers.call(this);
      
      // Ajouter la section batch après le tableau
      setTimeout(() => {
        const tbody = document.getElementById('players-grid');
        if (tbody && !document.getElementById('batch-qr-section')) {
          const batchSection = document.createElement('div');
          batchSection.id = 'batch-qr-section';
          batchSection.className = 'batch-qr-section';
          batchSection.innerHTML = `
            <h3>📱 Codes QR en Masse</h3>
            <div class="batch-qr-buttons">
              <button class="btn btn-outline" id="btn-qr-preview" title="Aperçu des codes QR pour impression">
                👁️ Aperçu
              </button>
              <button class="btn btn-outline" id="btn-qr-print" title="Imprimer les codes QR (planches 3x2)">
                🖨️ Imprimer
              </button>
              <button class="btn btn-primary" id="btn-qr-export" title="Télécharger les codes QR en HTML">
                ⬇️ Exporter HTML
              </button>
            </div>
            <div style="width: 100%; text-align: center; margin-top: 12px; font-size: 12px; color: #64748b;">
              <span id="qr-count-info">—</span>
            </div>
          `;
          
          // Insérer après le tableau
          tbody.parentElement.parentElement.insertBefore(batchSection, tbody.parentElement.nextSibling);
        }
        
        // Mettre à jour le comptage
        updateQRCountInfo();
      }, 100);
    };
  }

  /**
   * Met à jour le compteur de codes QR
   */
  function updateQRCountInfo() {
    const countEl = document.getElementById('qr-count-info');
    if (!countEl) return;
    
    const visibleUsers = window.users?.filter(u => u.status !== 'deleted') || [];
    const count = visibleUsers.length;
    
    if (count === 0) {
      countEl.textContent = 'Aucun acteur à traiter';
      return;
    }
    
    const pages = Math.ceil(count / 6);
    countEl.textContent = `${count} acteur(s) · ${pages} page(s) à imprimer (3×2)`;
  }

  /**
   * Enregistre les event listeners pour les actions QR
   */
  function wireQRActions() {
    // Aperçu des codes QR
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-qr-preview') {
        const visibleUsers = window.users?.filter(u => u.status !== 'deleted') || [];
        if (visibleUsers.length === 0) {
          alert('Aucun acteur à afficher');
          return;
        }
        previewBatchQRs(visibleUsers);
      }
    });

    // Imprimer les codes QR
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-qr-print') {
        const visibleUsers = window.users?.filter(u => u.status !== 'deleted') || [];
        if (visibleUsers.length === 0) {
          alert('Aucun acteur à imprimer');
          return;
        }
        window.QRCodeManager.printBatchQRs(visibleUsers);
      }
    });

    // Exporter les codes QR
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-qr-export') {
        const visibleUsers = window.users?.filter(u => u.status !== 'deleted') || [];
        if (visibleUsers.length === 0) {
          alert('Aucun acteur à exporter');
          return;
        }
        window.QRCodeManager.downloadBatchQRs(visibleUsers);
      }
    });
  }

  /**
   * Prévisualise les codes QR en batch
   */
  function previewBatchQRs(users) {
    const batches = window.QRCodeManager.generateBatchQRs(users);
    const allHTML = batches.map(b => b.html).join('');
    
    const previewWindow = window.open('', '_blank', 'width=1200,height=800');
    previewWindow.document.write(allHTML);
    previewWindow.document.close();
  }

  /**
   * Rafraîchit les informations QR quand les acteurs changent
   */
  window.addEventListener('gsc-users-updated', () => {
    updateQRCountInfo();
  });
})();
