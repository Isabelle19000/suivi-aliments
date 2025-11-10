// --- PWA Install ---
let deferredPrompt;
const installBtn = document.createElement("button");
installBtn.id = "installBtn";
installBtn.textContent = "Installer l'application";
installBtn.style.display = "none";
installBtn.style.position = "fixed";
installBtn.style.bottom = "20px";
installBtn.style.right = "20px";
installBtn.style.padding = "10px 15px";
installBtn.style.background = "#4CAF50";
installBtn.style.color = "white";
installBtn.style.border = "none";
installBtn.style.borderRadius = "8px";
installBtn.style.zIndex = "999";

document.body.appendChild(installBtn);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "block";
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;

  if (result.outcome === "accepted") {
    installBtn.style.display = "none";
  }

  deferredPrompt = null;
});

// --- Service Worker Registration ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}



/* script.js
   - Base aliments editable
   - Consommation journalière + historique (7 jours)
   - sauvegarde localStorage
   - auto-day rollover
   - theme dark/auto + toggle
   - PWA install prompt + service worker registration
*/

// ---------- Données par défaut ----------
const DEFAULT_BASE = [
  { nom: "Pomme", pointsPour100g: 0.5 },
  { nom: "Pain", pointsPour100g: 2 },
  { nom: "Poulet", pointsPour100g: 3 },
  { nom: "Fromage", pointsPour100g: 5 },
  { nom: "Chocolat", pointsPour100g: 8 }
];

// ---------- State ----------
let baseAliments = JSON.parse(localStorage.getItem("baseAliments")) || DEFAULT_BASE.slice();
let consommation = JSON.parse(localStorage.getItem("consommation")) || [];
let historique = JSON.parse(localStorage.getItem("historique")) || [];
let reserve = parseFloat(localStorage.getItem("reserve")) || 21;
let pointsJour = 0;

// ---------- DOM ----------
const selectAliment = document.getElementById("aliment");
const quantiteEl = document.getElementById("quantite");
const tableBody = document.getElementById("table-body");
const pointsJourEl = document.getElementById("points-jour");
const reserveEl = document.getElementById("reserve");
const historiqueBody = document.getElementById("historique-body");

const baseBody = document.getElementById("base-body");
const baseNom = document.getElementById("base-nom");
const basePoints = document.getElementById("base-points");
const baseAjouterBtn = document.getElementById("base-ajouter");
const baseExportBtn = document.getElementById("base-export");
const baseImportInput = document.getElementById("base-import");
const baseSearch = document.getElementById("base-search");

const ajouterBtn = document.getElementById("ajouter-btn");
const viderBtn = document.getElementById("vider-jour");
const validerBtn = document.getElementById("valider-journee");

const themeToggle = document.getElementById("theme-toggle");
const installBtn = document.getElementById("install-btn");

// ---------- Helpers ----------
function sauvegarder(){
  localStorage.setItem("consommation", JSON.stringify(consommation));
  localStorage.setItem("historique", JSON.stringify(historique));
  localStorage.setItem("reserve", reserve);
  localStorage.setItem("baseAliments", JSON.stringify(baseAliments));
}

function toFixedSafe(n){ return parseFloat(n.toFixed(1)); }

// ---------- UI refreshers ----------
function refreshSelect(){
  selectAliment.innerHTML = "";
  baseAliments.forEach(a=>{
    const opt = document.createElement("option");
    opt.value = a.nom;
    opt.textContent = `${a.nom} (${a.pointsPour100g} pts/100g)`;
    selectAliment.appendChild(opt);
  });
}
function refreshBaseTable(filter=""){
  baseBody.innerHTML = "";
  baseAliments
    .filter(a => a.nom.toLowerCase().includes(filter.toLowerCase()))
    .forEach((a,i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style="text-align:left">${a.nom}</td><td>${a.pointsPour100g}</td><td>
        <button onclick="editBase(${i})">✏️</button>
        <button onclick="deleteBase(${i})">🗑️</button>
      </td>`;
      baseBody.appendChild(tr);
    });
}
function majTableau(){
  tableBody.innerHTML = "";
  consommation.forEach((item,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="text-align:left">${item.nom}</td><td>${item.quantite}</td><td>${toFixedSafe(item.points)}</td><td><button onclick="supprimer(${i})">🗑️</button></td>`;
    tableBody.appendChild(tr);
  });
}
function majResume(){
  pointsJour = consommation.reduce((s,it)=>s+it.points,0);
  if(pointsJour > 23){
    const dep = pointsJour - 23;
    reserve = Math.max(0, 21 - dep);
  } else {
    // conserve réserve stockée si présente, sinon 21
    reserve = parseFloat(localStorage.getItem("reserve")) || 21;
  }
  pointsJourEl.textContent = toFixedSafe(pointsJour);
  reserveEl.textContent = toFixedSafe(reserve);
  sauvegarder();
}
function majHistorique(){
  historiqueBody.innerHTML = "";
  historique.forEach(j=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${j.date}</td><td>${toFixedSafe(j.total)}</td><td>${toFixedSafe(j.reserveRestante)}</td>`;
    historiqueBody.appendChild(tr);
  });
}

// expose functions used in HTML-generated buttons
window.editBase = function(i){
  baseNom.value = baseAliments[i].nom;
  basePoints.value = baseAliments[i].pointsPour100g;
  baseNom.focus();
}
window.deleteBase = function(i){
  if(!confirm(`Supprimer "${baseAliments[i].nom}" ?`)) return;
  baseAliments.splice(i,1);
  sauvegarder();
  refreshBaseTable(baseSearch.value);
  refreshSelect();
}
window.supprimer = function(i){
  consommation.splice(i,1);
  sauvegarder();
  majTableau(); majResume();
}

// ---------- Base aliments: ajouter / import / export ----------
baseAjouterBtn.addEventListener("click", ()=>{
  const nom = baseNom.value.trim();
  const pts = parseFloat(basePoints.value);
  if(!nom || isNaN(pts)){ alert("Nom et points valides requis."); return; }
  const idx = baseAliments.findIndex(b => b.nom.toLowerCase()===nom.toLowerCase());
  if(idx >= 0) baseAliments[idx].pointsPour100g = pts;
  else baseAliments.push({nom, pointsPour100g: pts});
  baseAliments.sort((a,b)=>a.nom.localeCompare(b.nom));
  baseNom.value=""; basePoints.value="";
  sauvegarder();
  refreshBaseTable(baseSearch.value);
  refreshSelect();
});

baseSearch.addEventListener("input", ()=> refreshBaseTable(baseSearch.value));

baseExportBtn.addEventListener("click", ()=>{
  const header = "nom,pointsPour100g\n";
  const csv = header + baseAliments.map(b=>`${b.nom.replace(/,/g,'')},${b.pointsPour100g}`).join("\n");
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="base_aliments.csv"; a.click();
  URL.revokeObjectURL(url);
});

baseImportInput.addEventListener("change",(e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{
    const lines = r.result.split(/\r?\n/).slice(1).filter(Boolean);
    lines.forEach(line=>{
      const [nom, pts] = line.split(",");
      if(nom && pts){
        const existing = baseAliments.find(b=>b.nom.toLowerCase()===nom.trim().toLowerCase());
        const ptsNum = parseFloat(pts);
        if(existing) existing.pointsPour100g = ptsNum;
        else baseAliments.push({nom: nom.trim(), pointsPour100g: ptsNum});
      }
    });
    baseAliments.sort((a,b)=>a.nom.localeCompare(b.nom));
    sauvegarder(); refreshBaseTable(); refreshSelect(); alert("Import terminé.");
  };
  r.readAsText(f);
});

// ---------- Consommation: ajouter / vider / valider ----------
ajouterBtn.addEventListener("click", ()=>{
  const nom = selectAliment.value;
  const quantite = parseFloat(quantiteEl.value);
  if(!nom || isNaN(quantite) || quantite <= 0) return alert("Choisis un aliment et quantité valide.");
  const aliment = baseAliments.find(a=>a.nom===nom);
  if(!aliment) return alert("Aliment introuvable.");
  const points = (aliment.pointsPour100g * quantite) / 100;
  consommation.push({nom, quantite, points});
  sauvegarder(); majTableau(); majResume();
});
viderBtn.addEventListener("click", ()=> {
  if(confirm("Vider tous les aliments saisis aujourd'hui ?")){ consommation=[]; sauvegarder(); majTableau(); majResume(); }
});
validerBtn.addEventListener("click", ()=>{
  if(consommation.length === 0) return alert("Aucun aliment saisi aujourd’hui !");
  const date = new Date().toLocaleDateString("fr-FR");
  const total = pointsJour;
  const reserveRestante = reserve;
  historique.push({date, total, reserveRestante});
  if(historique.length > 7) historique.shift();
  consommation=[]; pointsJour=0; reserve=21;
  sauvegarder(); majTableau(); majResume(); majHistorique();
  alert("Journée enregistrée !");
});

// ---------- Auto-day rollover ----------
(function autoDay(){
  const today = new Date().toLocaleDateString("fr-FR");
  const lastDate = localStorage.getItem("derniereDate");
  if(lastDate && lastDate !== today && consommation.length > 0){
    const total = consommation.reduce((s,it)=>s+it.points,0);
    const reserveRestante = reserve;
    historique.push({date: lastDate, total, reserveRestante});
    if(historique.length > 7) historique.shift();
    consommation=[]; pointsJour=0; reserve=21;
    sauvegarder();
  }
  localStorage.setItem("derniereDate", today);
})();

// ---------- Theme dark: auto + toggle ----------
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
}
(function initTheme(){
  const saved = localStorage.getItem('theme');
  if(saved){ applyTheme(saved); return; }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
})();
themeToggle.addEventListener('click', ()=>{
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ---------- PWA install prompt ----------
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = 'inline-block';
});
installBtn.addEventListener('click', async ()=>{
  if(!deferredPrompt) return alert('Pas d\'invite d\'installation disponible pour le moment.');
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.style.display = 'none';
});

// ---------- Service worker registration ----------
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js')
    .then(()=>console.log('SW registered'))
    .catch(err=>console.warn('SW registration failed', err));
}

// ---------- Init UI ----------
refreshSelect();
refreshBaseTable();
majTableau(); majResume(); majHistorique();

// --- Bouton Installation Universel ---
const universalBtn = document.createElement("button");
universalBtn.textContent = "Installer l'application";
universalBtn.style.position = "fixed";
universalBtn.style.bottom = "20px";
universalBtn.style.right = "20px";
universalBtn.style.padding = "10px 15px";
universalBtn.style.background = "#4CAF50";
universalBtn.style.color = "white";
universalBtn.style.border = "none";
universalBtn.style.borderRadius = "8px";
universalBtn.style.zIndex = "999";
document.body.appendChild(universalBtn);

universalBtn.addEventListener("click", () => {
  // ✅ Android : ouvre la fenêtre native
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
    });
  } else {
    // ✅ iPhone ou Android sans prompt : instructions guidées
    alert(
"Pour installer l'application :\n\n" +
"📌 Sur Android :\n1. Ouvre le menu (⋮)\n2. Choisis 'Ajouter à l'écran d'accueil'\n\n" +
"📌 Sur iPhone :\n1. Touchez l'icône 'Partager'\n2. 'Ajouter à l'écran d'accueil'\n"
    );
  }
});

