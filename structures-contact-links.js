/**
 * ══════════════════════════════════════════════════════════════════════
 *  STRUCTURES-CONTACT-LINKS.JS — Google Maps + WhatsApp
 *  Gabon Sport Connect · 2026
 *
 *  Détecte les coordonnées GPS et le téléphone d'une structure (quels que
 *  soient les noms de champs utilisés par structures-form-builder.js) et
 *  génère des boutons d'action prêts à l'emploi :
 *    - 📍 Ouvrir dans Google Maps (coordonnées GPS, sinon adresse/ville)
 *    - 💬 Contacter sur WhatsApp (numéro de téléphone détecté)
 *
 *  Lecture seule, aucune dépendance Firebase. À appeler après le rendu du
 *  profil (GSCStructureProfile.renderFullProfile) côté admin ET côté public :
 *    container.insertAdjacentHTML('beforeend', window.GSCContactLinks.render(structure));
 * ══════════════════════════════════════════════════════════════════════
 */
(function (window) {
  'use strict';

  function esc(s) { return (s || '').toString().replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function firstDefined() {
    for (let i = 0; i < arguments.length; i++) {
      const v = arguments[i];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return null;
  }

  function getLat(s) {
    return firstDefined(s.latitude, s.lat, s.gpsLat, s.gps && s.gps.lat, s.coordonnees && s.coordonnees.lat, s.coordinates && s.coordinates.lat);
  }
  function getLng(s) {
    return firstDefined(s.longitude, s.lng, s.lon, s.gpsLng, s.gps && s.gps.lng, s.coordonnees && s.coordonnees.lng, s.coordinates && s.coordinates.lng);
  }
  function getPhone(s) {
    return firstDefined(
      s.telephone, s.phone, s.tel,
      s.contact && s.contact.telephone, s.contact && s.contact.phone,
      s.coordonnees && s.coordonnees.telephone
    );
  }
  function getAddress(s) {
    return firstDefined(s.adresse, s.siegeSocial, s.address, s.ville, s.city);
  }

  // Normalise un numéro pour wa.me : chiffres uniquement, indicatif Gabon (241)
  // ajouté par défaut si le numéro est saisi en local (9 chiffres commençant
  // par 0 ou 6/7).
  function normalizePhoneForWhatsapp(raw) {
    if (!raw) return null;
    let digits = raw.toString().replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    digits = digits.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('241')) return digits;
    if (digits.startsWith('0')) digits = digits.slice(1);
    return '241' + digits;
  }

  function render(structure) {
    if (!structure) return '';
    const lat = getLat(structure);
    const lng = getLng(structure);
    const address = getAddress(structure);
    const phone = getPhone(structure);
    const wa = normalizePhoneForWhatsapp(phone);

    let mapsUrl = null;
    if (lat !== null && lng !== null && lat !== '' && lng !== '') {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    } else if (address) {
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ' Gabon')}`;
    }

    if (!mapsUrl && !wa) return '';

    return `
      <div class="adm-section" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
        ${mapsUrl ? `<a class="btn-sm" href="${esc(mapsUrl)}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">📍 Google Maps</a>` : ''}
        ${wa ? `<a class="btn-sm" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;">💬 WhatsApp</a>` : ''}
      </div>`;
  }

  window.GSCContactLinks = { render, normalizePhoneForWhatsapp };
})(window);
