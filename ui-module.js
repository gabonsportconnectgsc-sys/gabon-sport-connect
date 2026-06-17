/**
 * 🎨 UI MODULE - Composants d'Interface Utilisateur
 * Toasts, modales, dialogues, notifications
 */

class UIModule {
  constructor() {
    this.toastContainer = null;
    this.modalStack = [];
    this.dialogInstance = null;
  }

  /**
   * 🔧 Initialiser le module UI
   */
  init() {
    console.log('🎨 Initializing UI Module...');
    this.createToastContainer();
    this.setupEventListeners();
    return this;
  }

  /**
   * 🍞 Créer le conteneur de toasts
   */
  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      pointer-events: none;
      max-width: 400px;
    `;
    document.body.appendChild(container);
    this.toastContainer = container;
  }

  /**
   * 📢 Afficher un toast (notification)
   */
  toast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    const icons = {
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };
    
    const colors = {
      'success': '#10b981',
      'error': '#ef4444',
      'warning': '#f59e0b',
      'info': '#3b82f6'
    };

    toast.style.cssText = `
      background: white;
      border-left: 4px solid ${colors[type]};
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
      pointer-events: auto;
      cursor: pointer;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 18px;">${icons[type]}</span>
        <span>${message}</span>
      </div>
    `;

    this.toastContainer.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);

    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.style.animation = 'slideOut 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    });

    this.addAnimations();
  }

  /**
   * ✅ Toast succès
   */
  success(message, duration = 3000) {
    this.toast(message, 'success', duration);
  }

  /**
   * ❌ Toast erreur
   */
  error(message, duration = 5000) {
    this.toast(message, 'error', duration);
  }

  /**
   * ⚠️ Toast avertissement
   */
  warning(message, duration = 4000) {
    this.toast(message, 'warning', duration);
  }

  /**
   * ℹ️ Toast info
   */
  info(message, duration = 3000) {
    this.toast(message, 'info', duration);
  }

  /**
   * 🪟 Afficher une modale
   */
  showModal(title, content, options = {}) {
    const modalId = `modal-${Date.now()}`;
    
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'admin-modal';
    modal.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 5000;
      animation: fadeIn 0.3s ease-out;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 25px rgba(0,0,0,0.15);
      max-width: ${options.width || '500px'};
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease-out;
    `;

    // En-tête
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    header.innerHTML = `
      <h2 style="margin: 0; font-size: 18px; font-weight: 600;">${title}</h2>
      <button style="
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
      ">&times;</button>
    `;

    // Corps
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 20px;
    `;

    if (typeof content === 'string') {
      body.innerHTML = content;
    } else {
      body.appendChild(content);
    }

    // Footer
    let footer = '';
    if (options.showFooter !== false) {
      footer = `
        <div style="
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        ">
          <button class="modal-btn-cancel" style="
            padding: 8px 16px;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Annuler</button>
          <button class="modal-btn-confirm" style="
            padding: 8px 16px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">${options.confirmText || 'Confirmer'}</button>
        </div>
      `;
    }

    modalContent.innerHTML = `
      ${header.outerHTML}
      <div style="padding: 20px;">${body.innerHTML}</div>
      ${footer}
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    this.modalStack.push(modalId);

    // Événements
    const closeButton = modalContent.querySelector('button');
    const cancelBtn = modalContent.querySelector('.modal-btn-cancel');
    const confirmBtn = modalContent.querySelector('.modal-btn-confirm');

    const closeModal = () => {
      modal.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        modal.remove();
        this.modalStack = this.modalStack.filter(id => id !== modalId);
      }, 300);
    };

    if (closeButton) closeButton.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (confirmBtn && options.onConfirm) {
      confirmBtn.addEventListener('click', () => {
        options.onConfirm();
        closeModal();
      });
    }

    // Click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    this.addAnimations();

    return { closeModal, modalId };
  }

  /**
   * ⁉️ Dialogue de confirmation
   */
  confirm(title, message, options = {}) {
    return new Promise((resolve) => {
      const content = `<p style="margin: 0; color: #374151;">${message}</p>`;
      
      this.showModal(title, content, {
        width: options.width || '400px',
        confirmText: options.confirmText || 'Oui',
        onConfirm: () => {
          if (options.onConfirm) options.onConfirm();
          resolve(true);
        }
      });
    });
  }

  /**
   * 🚨 Dialogue d'erreur
   */
  alert(title, message, options = {}) {
    return new Promise((resolve) => {
      const content = `
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">❌</div>
          <p style="margin: 0; color: #374151;">${message}</p>
        </div>
      `;

      this.showModal(title, content, {
        width: options.width || '400px',
        confirmText: 'OK',
        onConfirm: () => {
          resolve();
        }
      });
    });
  }

  /**
   * 💬 Prompt (demander input)
   */
  prompt(title, message, options = {}) {
    return new Promise((resolve) => {
      const inputId = `prompt-input-${Date.now()}`;
      const content = `
        <div>
          <p style="margin: 0 0 12px 0; color: #374151;">${message}</p>
          <input 
            id="${inputId}" 
            type="text" 
            placeholder="${options.placeholder || ''}"
            style="
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #d1d5db;
              border-radius: 4px;
              font-size: 14px;
              box-sizing: border-box;
            "
          />
        </div>
      `;

      this.showModal(title, content, {
        width: options.width || '400px',
        confirmText: 'OK',
        onConfirm: () => {
          const input = document.getElementById(inputId);
          resolve(input?.value || '');
        }
      });

      // Auto-focus
      setTimeout(() => {
        document.getElementById(inputId)?.focus();
      }, 100);
    });
  }

  /**
   * 🔄 Afficher un loader
   */
  showLoader(message = 'Chargement...') {
    const loader = document.createElement('div');
    loader.id = 'ui-loader';
    loader.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      z-index: 9998;
      text-align: center;
      animation: slideUp 0.3s ease-out;
    `;

    loader.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        margin: 0 auto 12px;
        animation: spin 1s linear infinite;
      "></div>
      <p style="margin: 0; color: #374151;">${message}</p>
    `;

    document.body.appendChild(loader);
    this.addAnimations();

    return {
      close: () => {
        loader.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => loader.remove(), 300);
      }
    };
  }

  /**
   * 🎬 Ajouter les animations CSS
   */
  addAnimations() {
    if (document.getElementById('ui-animations')) return;

    const style = document.createElement('style');
    style.id = 'ui-animations';
    style.innerHTML = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 📊 Barre de progression
   */
  showProgress(title = 'Progression') {
    const progress = document.createElement('div');
    progress.id = 'ui-progress';
    progress.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 4px;
      background: linear-gradient(90deg, #3b82f6 0%, #10b981 100%);
      z-index: 9997;
      animation: progress 2s ease-in-out infinite;
    `;

    document.body.appendChild(progress);

    return {
      setProgress: (percent) => {
        progress.style.width = Math.min(percent, 95) + '%';
      },
      complete: () => {
        progress.style.width = '100%';
        setTimeout(() => progress.remove(), 300);
      }
    };
  }

  /**
   * 📋 Setup event listeners
   */
  setupEventListeners() {
    // Fermer modales avec Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalStack.length > 0) {
        const lastModalId = this.modalStack[this.modalStack.length - 1];
        const modal = document.getElementById(lastModalId);
        if (modal) modal.remove();
      }
    });
  }
}

// Export
export default UIModule;
