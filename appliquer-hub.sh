#!/bin/bash
# Applique : accueil admin en tuiles, menu par theme, badges, bouton "Voir", cache v44
set -e
cd ~/gabon-sport-connect
D=~/storage/downloads
pick() { ls -t "$D"/$1* 2>/dev/null | head -1; }

H=$(pick gsc-admin-hub)
R=$(pick gsc-roster-admin)
if [ -z "$H" ] || [ -z "$R" ]; then
  echo "ERREUR : gsc-admin-hub.js / gsc-roster-admin.js introuvables dans Telechargements"
  exit 1
fi

git pull -q || true
cp admin.html admin.html.bak-hub
cp gsc-roster-badge-app.js gsc-roster-badge-app.js.bak-voir
cp "$H" gsc-admin-hub.js
cp "$R" gsc-roster-admin.js

node - <<'NODE'
const fs = require('fs');

let s = fs.readFileSync('gsc-roster-badge-app.js', 'utf8');
if (s.includes('function bindVoir')) {
  console.log('badge-app : deja patche');
} else {
  const a = "  /* Liens de notification";
  const b = "    if (isAdminUi()) { start(); ensureUi(); refresh(); }";
  if (!s.includes(a) || !s.includes(b)) throw new Error('ancre introuvable (badge-app)');
  const fn =
"  function bindVoir() {\n" +
"    var b = document.querySelector('#pending-banner button');\n" +
"    if (!b || b._gscVoir) return;\n" +
"    b._gscVoir = true;\n" +
"    b.onclick = function () {\n" +
"      try { if (typeof switchAdminTab === 'function') switchAdminTab('users'); } catch (e) {}\n" +
"      var sel = document.getElementById('srch-status'); if (sel) sel.value = 'pending';\n" +
"      try { if (typeof filterAdminUsers === 'function') filterAdminUsers(); } catch (e) {}\n" +
"      setTimeout(function () {\n" +
"        var t = document.getElementById('admin-users-tbody');\n" +
"        var box = t && (t.closest('table') || t);\n" +
"        if (box) { box.style.scrollMarginTop = '90px'; box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }\n" +
"      }, 150);\n" +
"    };\n" +
"  }\n\n";
  s = s.replace(a, () => fn + a)
       .replace(b, () => "    if (isAdminUi()) { start(); ensureUi(); refresh(); bindVoir(); }");
  fs.writeFileSync('gsc-roster-badge-app.js', s);
  console.log('badge-app : OK');
}

let h = fs.readFileSync('admin.html', 'utf8');
if (h.includes('gsc-admin-hub.js')) {
  console.log('admin.html : deja patche');
} else {
  const tag = '<script src="gsc-roster-admin.js"></script>';
  if (!h.includes(tag)) throw new Error('script gsc-roster-admin.js introuvable dans admin.html');
  h = h.replace(tag, () => tag + '\n<script src="gsc-admin-hub.js"></script>');
  fs.writeFileSync('admin.html', h);
  console.log('admin.html : OK');
}
NODE

sed -i "s/const CACHE_NAME = 'gsc-v43'/const CACHE_NAME = 'gsc-v44'/" sw.js
node --check gsc-roster-admin.js
node --check gsc-admin-hub.js
node --check gsc-roster-badge-app.js
echo "SYNTAXE OK"
grep -n "const CACHE_NAME" sw.js

git add gsc-roster-admin.js gsc-admin-hub.js gsc-roster-badge-app.js admin.html sw.js
git commit -q -m "Admin: accueil en tuiles, menu par theme, badges compat, bouton Voir, cache v44"
git push
echo "=== PUBLIE ==="

# Diagnostic "Module conformite indisponible"
{
  echo "=== COMPLIANCE ==="
  node --check gsc-structures-compliance.js && echo "syntaxe OK"
  node -e "global.window=global;global.document={addEventListener(){},getElementById(){return null},createElement(){return{style:{}}},head:{appendChild(){}},querySelector(){return null},querySelectorAll(){return[]}};global.localStorage={getItem(){return null},setItem(){}};try{require('./gsc-structures-compliance.js');console.log('GSCComplianceModule:',typeof window.GSCComplianceModule)}catch(e){console.log('ERREUR au chargement:',e.message)}" 2>&1 | head -5
  sed -n '430,445p' gsc-structures-compliance.js | cut -c1-160
  echo "=== GED catalogue ==="
  grep -nE "getElementById|querySelector|insertAdjacent|appendChild|insertBefore" ged-catalogue-manager.js | cut -c1-170 | head -15
  echo "=== section documents ==="
  sed -n '1807,1832p' admin.html | cut -c1-170
} > ~/verif8.txt 2>&1
wc -c ~/verif8.txt
termux-clipboard-set < ~/verif8.txt
echo "Diagnostic conformite copie dans le presse-papier : colle-le moi."
