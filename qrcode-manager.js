/* ═══════════════════════════════════════════════════════════════
   QR CODE MANAGER — Module de gestion QR professionnelle
   • Génération de QR codes pour chaque acteur
   • Données complètes stockées dans le QR (ou URL externe)
   • Téléchargement, impression, partage
   • Batch export de tous les QR codes
   ═══════════════════════════════════════════════════════════════ */

(function () {
  const QR_API_URL = 'https://api.qrserver.com/v1/create-qr-code/';
  const QR_SIZE = 300;
  const BATCH_SIZE = 6; // Grille 3x2 pour impression
  
  window.QRCodeManager = {
    /**
     * Génère une URL pour un QR code contenant les données de l'acteur
     * Peut utiliser:
     * 1. Un UUID court encodé en JSON (si stockage côté serveur)
     * 2. Une URL directe avec query params
     * 3. Un lien vers fiche GSC avec ID
     */
    generateQRData: function(user) {
      if (!user || !user.id) return null;
      
      // Format: gsc.app/member/{ID}?name={nom}&role={role}
      // Ou directement JSON:  {"uid":"...", "name":"...", ...}
      
      const baseURL = window.location.origin;
      const memberURL = `${baseURL}/?member=${user.id}`;
      
      // Donnees completes (peut être compressées)
      const fullData = {
        uid: user.id,
        name: [user.prenom, user.nom].filter(Boolean).join(' ') || user.nomOrganisation || user.nomEtablissement || user.name || 'Unknown',
        role: user.role || 'unknown',
        org: user.club || user.nomOrganisation || user.nomEtablissement || '',
        email: user.email || '',
        phone: user.telephone || user.phone || '',
        photo: user.photoURL || '',
        created: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : ''
      };
      
      return {
        url: memberURL,
        data: fullData,
        json: JSON.stringify(fullData).substring(0, 100) // Limiter pour QR
      };
    },

    /**
     * Génère l'URL de l'image QR code (via service tiers)
     */
    getQRCodeImageURL: function(dataStr, size = QR_SIZE) {
      if (!dataStr) return null;
      const encoded = encodeURIComponent(dataStr);
      return `${QR_API_URL}?size=${size}x${size}&data=${encoded}&format=svg&margin=10`;
    },

    /**
     * Affiche le modal QR code avec toutes les options
     */
    showQRModal: function(user) {
      if (!user) return;
      
      const modal = document.getElementById('qr-modal') || this.createQRModal();
      const qrData = this.generateQRData(user);
      
      if (!qrData) {
        console.error('Cannot generate QR data for user', user);
        return;
      }

      // Remplir les infos utilisateur
      document.getElementById('qr-modal-name').textContent = qrData.data.name;
      document.getElementById('qr-modal-role').textContent = qrData.data.role;
      document.getElementById('qr-modal-org').textContent = qrData.data.org || '—';
      
      // Générer et afficher le QR code
      const qrImageURL = this.getQRCodeImageURL(qrData.url);
      const qrContainer = document.getElementById('qr-modal-image');
      qrContainer.innerHTML = `<img src="${qrImageURL}" alt="QR Code" style="width:100%;max-width:280px;height:auto;border-radius:12px;border:2px solid #e2e8f0;">`;
      
      // Data pour les actions
      modal.dataset.userId = user.id;
      modal.dataset.userName = qrData.data.name;
      modal.dataset.qrUrl = qrData.url;
      modal.dataset.qrImageUrl = qrImageURL;
      
      // Afficher le modal
      modal.classList.add('open');
    },

    /**
     * Télécharge le QR code en SVG/PNG
     */
    downloadQR: function(format = 'svg') {
      const modal = document.getElementById('qr-modal');
      if (!modal) return;
      
      const userId = modal.dataset.userId;
      const userName = modal.dataset.userName || 'QRCode';
      const qrImageUrl = modal.dataset.qrImageUrl;
      
      if (!qrImageUrl) return;
      
      const link = document.createElement('a');
      link.href = qrImageUrl;
      link.download = `GSC_QR_${userName.replace(/\s+/g, '_')}_${userId}.svg`;
      link.click();
    },

    /**
     * Imprimer le QR code en haute qualité
     */
    printQR: function() {
      const modal = document.getElementById('qr-modal');
      if (!modal) return;
      
      const qrImage = modal.querySelector('#qr-modal-image img');
      if (!qrImage) return;
      
      const printWindow = window.open('', '', 'width=800,height=600');
      const name = document.getElementById('qr-modal-name').textContent;
      const role = document.getElementById('qr-modal-role').textContent;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code - ${name}</title>
          <style>
            body { 
              margin: 20px; 
              font-family: Arial, sans-serif; 
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: white;
            }
            .qr-container {
              text-align: center;
              page-break-inside: avoid;
            }
            h2 { margin: 0 0 10px 0; }
            p { margin: 5px 0; color: #666; }
            img { width: 300px; height: 300px; margin: 20px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>${name}</h2>
            <p>${role}</p>
            <img src="${qrImage.src}" alt="QR Code">
            <p style="margin-top: 20px; font-weight: bold;">GSC - Global Sports Community</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    },

    /**
     * Copier le lien du QR code en presse-papiers
     */
    copyQRLink: function() {
      const modal = document.getElementById('qr-modal');
      if (!modal) return;
      
      const qrUrl = modal.dataset.qrUrl;
      if (!qrUrl) return;
      
      navigator.clipboard.writeText(qrUrl).then(() => {
        this.showToast('Lien copié ✓', 'success');
      }).catch(() => {
        this.showToast('Erreur lors de la copie', 'error');
      });
    },

    /**
     * Partager le QR code
     */
    shareQR: function() {
      const modal = document.getElementById('qr-modal');
      if (!modal) return;
      
      const name = document.getElementById('qr-modal-name').textContent;
      const qrUrl = modal.dataset.qrUrl;
      const qrImageUrl = modal.dataset.qrImageUrl;
      
      if (navigator.share) {
        navigator.share({
          title: `QR Code - ${name}`,
          text: `Scannez ce QR code pour accéder au profil de ${name} sur GSC`,
          url: qrUrl
        }).catch(() => {});
      } else {
        // Fallback: copier le lien
        this.copyQRLink();
      }
    },

    /**
     * Crée le modal QR code HTML
     */
    createQRModal: function() {
      if (document.getElementById('qr-modal')) {
        return document.getElementById('qr-modal');
      }
      
      const modal = document.createElement('div');
      modal.id = 'qr-modal';
      modal.className = 'modal qr-modal';
      modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>📱 Code QR - Acteur GSC</h2>
            <button class="modal-close" onclick="QRCodeManager.closeQRModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="qr-info-section">
              <div class="qr-info-row">
                <span class="qr-info-label">Acteur :</span>
                <span id="qr-modal-name" class="qr-info-value">—</span>
              </div>
              <div class="qr-info-row">
                <span class="qr-info-label">Rôle :</span>
                <span id="qr-modal-role" class="qr-info-value">—</span>
              </div>
              <div class="qr-info-row">
                <span class="qr-info-label">Organisation :</span>
                <span id="qr-modal-org" class="qr-info-value">—</span>
              </div>
            </div>

            <div class="qr-image-section">
              <div id="qr-modal-image" class="qr-image-container">
                <div class="loading-spinner">Génération du QR code...</div>
              </div>
            </div>

            <div class="qr-details">
              <p class="qr-description">
                <strong>Informations codées :</strong> Identifiant unique, nom, rôle, organisation, email et téléphone.
              </p>
            </div>
          </div>

          <div class="modal-footer qr-actions">
            <button class="btn btn-secondary" onclick="QRCodeManager.closeQRModal()">Fermer</button>
            <button class="btn btn-outline" onclick="QRCodeManager.copyQRLink()" title="Copier le lien du profil">
              📋 Copier lien
            </button>
            <button class="btn btn-outline" onclick="QRCodeManager.printQR()" title="Imprimer le QR code">
              🖨️ Imprimer
            </button>
            <button class="btn btn-outline" onclick="QRCodeManager.downloadQR()" title="Télécharger l'image QR">
              ⬇️ Télécharger
            </button>
            <button class="btn btn-primary" onclick="QRCodeManager.shareQR()" title="Partager le QR code">
              📤 Partager
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Événement de fermeture
      modal.querySelector('.modal-overlay').addEventListener('click', () => this.closeQRModal());
      modal.querySelector('.modal-close').addEventListener('click', () => this.closeQRModal());
      
      return modal;
    },

    /**
     * Ferme le modal QR
     */
    closeQRModal: function() {
      const modal = document.getElementById('qr-modal');
      if (modal) modal.classList.remove('open');
    },

    /**
     * Affiche un toast notification
     */
    showToast: function(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        font-weight: 600;
        z-index: 10001;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    },

    /**
     * Génère des QR codes en batch pour impression (planche de 6)
     */
    generateBatchQRs: function(users, onProgress) {
      if (!users || users.length === 0) return [];
      
      const batches = [];
      for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        const page = {
          pageNum: Math.floor(i / BATCH_SIZE) + 1,
          users: batch,
          html: this.generateBatchPageHTML(batch)
        };
        batches.push(page);
        if (onProgress) onProgress(i + batch.length, users.length);
      }
      return batches;
    },

    /**
     * HTML pour une page de QR codes (3x2)
     */
    generateBatchPageHTML: function(users) {
      const userCards = users.map(u => {
        const qrData = this.generateQRData(u);
        const qrImageUrl = this.getQRCodeImageURL(qrData.url, 250);
        const name = qrData.data.name;
        const role = qrData.data.role;
        
        return `
          <div class="qr-batch-card">
            <div class="qr-batch-image">
              <img src="${qrImageUrl}" alt="${name}" />
            </div>
            <div class="qr-batch-info">
              <div class="qr-batch-name">${name}</div>
              <div class="qr-batch-role">${role}</div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>QR Codes GSC - Impression</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', Arial, sans-serif;
              background: white;
              padding: 20px;
            }
            .qr-page {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              page-break-after: always;
              page-break-inside: avoid;
            }
            .qr-batch-card {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              background: #fafafa;
            }
            .qr-batch-image {
              width: 200px;
              height: 200px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              border: 2px solid #ddd;
              border-radius: 8px;
              margin-bottom: 12px;
            }
            .qr-batch-image img {
              max-width: 190px;
              max-height: 190px;
            }
            .qr-batch-info {
              text-align: center;
              width: 100%;
            }
            .qr-batch-name {
              font-weight: 700;
              font-size: 13px;
              color: #1f2937;
              margin-bottom: 4px;
              word-break: break-word;
            }
            .qr-batch-role {
              font-size: 11px;
              color: #6b7280;
            }
            .page-header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 15px;
              border-bottom: 2px solid #009E60;
            }
            .page-header h1 {
              font-size: 20px;
              margin-bottom: 5px;
              color: #0a1628;
            }
            .page-header p {
              font-size: 12px;
              color: #64748b;
            }
            @media print {
              body { padding: 10mm; }
              .qr-page { gap: 15px; }
              .qr-batch-card { padding: 10px; }
              .qr-batch-image { width: 180px; height: 180px; }
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            <h1>📱 Codes QR - Global Sports Community</h1>
            <p>Imprimez et distribuez ces codes aux acteurs GSC</p>
          </div>
          <div class="qr-page">
            ${userCards}
          </div>
        </body>
        </html>
      `;
    },

    /**
     * Imprime une planche de QR codes
     */
    printBatchQRs: function(users) {
      if (!users || users.length === 0) return;
      
      const batches = this.generateBatchQRs(users);
      if (batches.length === 0) return;

      const allHTML = batches.map(b => b.html).join('');
      const printWindow = window.open('', '_blank', 'width=1000,height=1200');
      
      printWindow.document.write(allHTML);
      printWindow.document.close();
      
      setTimeout(() => printWindow.print(), 500);
    },

    /**
     * Télécharge un fichier HTML avec tous les QR codes
     */
    downloadBatchQRs: function(users) {
      if (!users || users.length === 0) return;
      
      const batches = this.generateBatchQRs(users);
      const allHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>QR Codes GSC</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', Arial, sans-serif;
              background: #f5f5f5;
              padding: 20px;
            }
            .qr-page {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              page-break-after: always;
              page-break-inside: avoid;
              background: white;
              padding: 20px;
              margin-bottom: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .qr-batch-card {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              background: #fafafa;
            }
            .qr-batch-image {
              width: 200px;
              height: 200px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
              border: 2px solid #ddd;
              border-radius: 8px;
              margin-bottom: 12px;
            }
            .qr-batch-image img {
              max-width: 190px;
              max-height: 190px;
            }
            .qr-batch-info {
              text-align: center;
              width: 100%;
            }
            .qr-batch-name {
              font-weight: 700;
              font-size: 13px;
              color: #1f2937;
              margin-bottom: 4px;
            }
            .qr-batch-role {
              font-size: 11px;
              color: #6b7280;
            }
            .page-header {
              text-align: center;
              margin-bottom: 30px;
              padding: 20px;
              background: white;
              border-bottom: 2px solid #009E60;
              border-radius: 8px;
            }
            .page-header h1 {
              font-size: 24px;
              margin-bottom: 10px;
              color: #0a1628;
            }
            .page-header p {
              font-size: 14px;
              color: #64748b;
            }
            .page-number {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #999;
            }
            @media print {
              body { background: white; }
              .qr-page { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            <h1>📱 Codes QR GSC</h1>
            <p>Global Sports Community - Répertoire des Acteurs</p>
          </div>
          ${batches.map((batch, idx) => `
            <div class="qr-page">
              ${batch.users.map(u => {
                const qrData = this.generateQRData(u);
                const qrImageUrl = this.getQRCodeImageURL(qrData.url, 250);
                return `
                  <div class="qr-batch-card">
                    <div class="qr-batch-image">
                      <img src="${qrImageUrl}" alt="${qrData.data.name}" />
                    </div>
                    <div class="qr-batch-info">
                      <div class="qr-batch-name">${qrData.data.name}</div>
                      <div class="qr-batch-role">${qrData.data.role}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="page-number">Page ${idx + 1} / ${batches.length}</div>
          `).join('')}
        </body>
        </html>
      `;

      const blob = new Blob([allHTML], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `GSC_QRCodes_Batch_${new Date().toISOString().split('T')[0]}.html`;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  };

  // Auto-créer le modal au chargement
  window.addEventListener('DOMContentLoaded', () => {
    QRCodeManager.createQRModal();
  });
})();
