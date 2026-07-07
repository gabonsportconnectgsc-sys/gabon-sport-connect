/**
 * migrate-private-contact.js
 * ─────────────────────────────────────────────────────────────────────────
 * Migration ponctuelle (point C de la synthèse sécurité) :
 *   - Copie email/telephone des comptes EXISTANTS (créés avant la refonte)
 *     vers users/{uid}/private/contact.
 *   - Calcule telephoneHash (même algorithme que côté client — SHA-256 des
 *     chiffres normalisés) et l'écrit sur le doc public à la place du
 *     numéro en clair.
 *   - Supprime les champs email/telephone en clair du doc public.
 *   - Ne touche PAS au champ `status` public (nécessaire à l'annuaire).
 *
 * Nécessite le SDK Admin (clé de service), qui contourne les règles
 * Firestore — c'est le seul moyen de faire cette opération en masse pour
 * TOUS les comptes : les règles interdisent volontairement à quiconque
 * (même admin) de créer le sous-document private/contact d'un autre uid.
 *
 * ── UTILISATION ──
 *   npm install firebase-admin
 *   node migrate-private-contact.js --dry-run     # aperçu, aucune écriture
 *   node migrate-private-contact.js --confirm      # exécution réelle
 *
 * Variable d'environnement requise :
 *   GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccountKey.json
 *   (le même fichier JSON que celui utilisé pour FIREBASE_SERVICE_ACCOUNT_JSON
 *   dans le pipeline GitHub Actions — à télécharger depuis Firebase Console
 *   → Paramètres du projet → Comptes de service, si besoin d'un exemplaire
 *   local pour lancer ce script depuis votre machine).
 * ─────────────────────────────────────────────────────────────────────────
 */
const crypto = require('crypto');
const admin = require('firebase-admin');

const DRY_RUN = !process.argv.includes('--confirm');
const BATCH_LIMIT = 400; // marge sous la limite Firestore de 500 écritures/batch

if (DRY_RUN) {
  console.log('🔎 MODE DRY-RUN — aucune écriture ne sera effectuée.');
  console.log('   Relancez avec --confirm pour exécuter réellement la migration.\n');
} else {
  console.log('🚨 MODE RÉEL — les écritures/suppressions vont être appliquées.\n');
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();

function hashPhone(tel) {
  const norm = (tel || '').replace(/[^\d+]/g, '');
  if (!norm) return '';
  return crypto.createHash('sha256').update(norm, 'utf8').digest('hex');
}

async function run() {
  const usersSnap = await db.collection('users').get();
  console.log(`Total comptes trouvés : ${usersSnap.size}\n`);

  let migrated = 0, skipped = 0, errors = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  async function commitBatchIfNeeded(force = false) {
    if (opsInBatch === 0) return;
    if (force || opsInBatch >= BATCH_LIMIT) {
      if (!DRY_RUN) await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();
    const hasLegacyEmail = typeof data.email === 'string' && data.email !== '';
    const hasLegacyTel = typeof data.telephone === 'string' && data.telephone !== '';

    if (!hasLegacyEmail && !hasLegacyTel) {
      skipped++;
      continue;
    }

    try {
      const privRef = userDoc.ref.collection('private').doc('contact');
      const privSnap = await privRef.get();
      const privExists = privSnap.exists;
      const privData = privExists ? privSnap.data() : {};

      const privUpdates = {};
      if (hasLegacyEmail && !privData.email) privUpdates.email = data.email;
      if (hasLegacyTel && !privData.telephone) privUpdates.telephone = data.telephone;
      if (!privExists) {
        // Champ obligatoire à la création selon les règles Firestore.
        privUpdates.status = ['pending', 'active'].includes(data.status) ? data.status : 'active';
        privUpdates.migratedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      const publicUpdates = {};
      if (hasLegacyTel && !data.telephoneHash) {
        publicUpdates.telephoneHash = hashPhone(data.telephone);
      }
      if (hasLegacyEmail) publicUpdates.email = admin.firestore.FieldValue.delete();
      if (hasLegacyTel) publicUpdates.telephone = admin.firestore.FieldValue.delete();

      console.log(
        `${DRY_RUN ? '[dry-run] ' : ''}→ ${uid} : ` +
        `private+=${JSON.stringify(Object.keys(privUpdates))} ` +
        `public~=${JSON.stringify(Object.keys(publicUpdates))}`
      );

      if (!DRY_RUN) {
        if (Object.keys(privUpdates).length) {
          batch.set(privRef, privUpdates, { merge: true });
          opsInBatch++;
        }
        if (Object.keys(publicUpdates).length) {
          batch.update(userDoc.ref, publicUpdates);
          opsInBatch++;
        }
        await commitBatchIfNeeded();
      }

      migrated++;
    } catch (e) {
      errors++;
      console.error(`✗ Erreur sur ${uid} :`, e.message);
    }
  }

  await commitBatchIfNeeded(true);

  console.log('\n── Résumé ──');
  console.log(`Migrés   : ${migrated}`);
  console.log(`Ignorés  : ${skipped} (aucun email/telephone en clair trouvé)`);
  console.log(`Erreurs  : ${errors}`);
  if (DRY_RUN) console.log('\nAucune écriture effectuée (dry-run). Relancez avec --confirm pour appliquer.');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
