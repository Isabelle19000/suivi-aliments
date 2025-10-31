/* App complète : consommation, historique, base edition, localStorage, auto-day, import/export CSV, PWA-ready */

// ---------- Données initiales + load ----------
const DEFAULT_BASE = [
  { nom: "Pomme", pointsPour100g: 0.5 },
  { nom: "Pain", pointsPour100g: 2 },
  { nom: "Poulet", pointsPour100g: 3 },
  { nom: "Fromage", pointsPour100g: 5 },
  { nom: "Chocolat", pointsPour100g: 8 }
];

let baseAliments = JSON.parse(localStorage.getItem("baseAliments")) || DEFAULT_BASE.slice();
let consommation = JSON.parse(localStorage.getItem("consommation")) || [];
let historique = JSON.parse(localStorage.getItem("historique")) || [];
let reserve = parseFloat(localStorage.getItem("reserve")) || 21;
let pointsJour = 0;

// DOM
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

// ---------- Helpers ----------
function sauvegarder(){
  localStorage.setItem("consommation", JSON.stringify(consommation));
  localStorage.setItem("historique", JSON.stringify(historique));
  localStorage.setItem("reserve", reserve);
  localStorage.setItem("baseAliments", JSON.stringify(baseAliments));
}

function toFixedSafe(n){ return parseFloat(n.toFixed(1)); }

// ---------- Remplir select aliments ----------
function refreshSelect(){
  selectAliment.innerHTML = "";
  baseAliments.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.nom;
    opt.textContent = `${a.nom} (${a.pointsPour100g} pts/100g)`;
    selectAliment.appendChild(opt);
  });
}
refreshSelect();

// ---------- CRUD base aliments (UI) ----------
function refreshBaseTable(filter=""){
  baseBody.innerHTML = "";
  baseAliments
    .filter(a => a.nom.toLowerCase().includes(filter.toLowerCase()))
    .forEach((a, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:left">${a.nom}</td>
        <td>${a.pointsPour100g}</td>
        <td>
          <button onclick="editBase(${i})">✏️</button>
          <button onclick="deleteBase(${i})">🗑️</button>
        </td>
      `;
      baseBody.appendChild(tr);
  });
}
refreshBaseTable();

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

// Ajouter / Mettre à jour base
baseAjouterBtn.addEventListener("click", () => {
  const nom = baseNom.value.trim();
  const pts = parseFloat(basePoints.value);
  if(!nom || isNaN(pts)){
    alert("Nom et points valides requis.");
    return;
  }
  const idx = baseAliments.findIndex(b => b.nom.toLowerCase()===nom.toLowerCase());
  if(idx >= 0){
    baseAliments[idx].pointsPour100g = pts;
  } else {
    baseAliments.push({nom, pointsPour100g: pts});
    baseAliments.sort((a,b) => a.nom.localeCompare(b.nom));
  }
  baseNom.value = ""; basePoints.value = "";
  sauvegarder();
  refreshBaseTable(baseSearch.value);
  refreshSelect();
});

// Search
baseSearch.addEventListener("input", () => {
  refreshBaseTable(baseSearch.value);
});

// Export CSV
baseExportBtn.addEventListener("click", () => {
  const header = "nom,pointsPour100g\n";
  const csv = header + baseAliments.map(b => `${b.nom.replace(/,/g,'')},${b.pointsPour100g}`).join("\n");
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "base_aliments.csv"; a.click();
  URL.revokeObjectURL(url);
});

// Import CSV (simple)
baseImportInput.addEventListener("change", (e) => {
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split(/\r?\n/).slice(1).filter(Boolean);
    lines.forEach(line => {
      const [nom, pts] = line.split(",");
      if(nom && pts){
        const existing = baseAliments.find(b => b.nom.toLowerCase()===nom.trim().toLowerCase());
        const ptsNum = parseFloat(pts);
        if(existing) existing.pointsPour100g = ptsNum;
        else baseAliments.push({nom: nom.trim(), pointsPour100g: ptsNum});
      }
    });
    baseAliments.sort((a,b)=>a.nom.localeCompare(b.nom));
    sauvegarder();
    refreshBaseTable();
    refreshSelect();
    alert("Import terminé.");
  };
  reader.readAsText(f);
});

// ---------- Consommation: ajout / suppression ----------
document.getElementById("ajouter-btn").addEventListener("click", () => {
  const nom = selectAliment.value;
  const quantite = parseFloat(quantiteEl.value);
  if(!nom || isNaN(quantite) || quantite <= 0) return alert("Choisis un aliment et quantité valide.");
  const aliment = baseAliments.find(a => a.nom === nom);
  if(!aliment) return alert("Aliment introuvable.");
  const points = (aliment.pointsPour100g * quantite) / 100;
  consommation.push({ nom, quantite, points });
  sauvegarder();
  majTableau();
  majResume();
});

window.supprimer = function(index){
  consommation.splice(index,1);
  sauvegarder();
  majTableau();
  majResume();
}

document.getElementById("vider-jour").addEventListener("click", ()=>{
  if(confirm("Vider tous les aliments saisis aujourd'hui ?")){
    consommation = []; sauvegarder(); majTableau(); majResume();
  }
});

// ---------- Table + résumé + historique ----------
function majTableau(){
  tableBody.innerHTML = "";
  consommation.forEach((item,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:left">${item.nom}</td>
      <td>${item.quantite}</td>
      <td>${toFixedSafe(item.points)}</td>
      <td><button onclick="supprimer(${i})">🗑️</button></td>
    `;
    tableBody.appendChild(tr);
  });
}

function majResume(){
  pointsJour = consommation.reduce((s,it)=>s+it.points,0);
  // calcul réserve : si dépassement
  if(pointsJour > 23){
    const dep = pointsJour - 23;
    reserve = Math.max(0, 21 - dep);
  } else {
    // si on vient de démarrer et avons reserve en storage, on garde la valeur stockée
    // sinon remettre à 21 (comportement de sauvegarde est permissif)
    reserve = parseFloat(localStorage.getItem("reserve")) || 21;
  }
  pointsJourEl.textContent = toFixedSafe(pointsJour);
  reserveEl.textContent = toFixedSafe(reserve);
  sauvegarder();
}

function majHistorique(){
  historiqueBody.innerHTML = "";
  historique.forEach(j => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${j.date}</td><td>${toFixedSafe(j.total)}</td><td>${toFixedSafe(j.reserveRestante)}</td>`;
    historiqueBody.appendChild(tr);
  });
}

// Valider journée
document.getElementById("valider-journee").addEventListener("click", () => {
  if(consommation.length === 0) return alert("Aucun aliment saisi aujourd’hui !");
  const date = new Date().toLocaleDateString("fr-FR");
  const total = pointsJour;
  const reserveRestante = reserve;
  historique.push({ date, total, reserveRestante });
  if(historique.length > 7) historique.shift(); // garder 7 derniers jours
  consommation = []; pointsJour = 0; reserve = 21;
  sauvegarder(); majTableau(); majResume(); majHistorique();
  alert("Journée enregistrée !");
});

// ---------- Auto-day rollover ----------
(function autoDay(){
  const today = new Date().toLocaleDateString("fr-FR");
  const lastDate = localStorage.getItem("derniereDate");
  if(lastDate && lastDate !== today && consommation.length > 0){
    // archive la veille
    const total = consommation.reduce((s,it)=>s+it.points,0);
    const reserveRestante = reserve;
    historique.push({ date: lastDate, total, reserveRestante });
    if(historique.length > 7) historique.shift();
    consommation = []; pointsJour = 0; reserve = 21;
    sauvegarder();
  }
  localStorage.setItem("derniereDate", today);
})();

// ---------- Init affichage ----------
majTableau(); majResume(); majHistorique();

// ---------- Service worker registration (PWA) ----------
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js')
    .then(()=>console.log('SW registered'))
    .catch(()=>console.log('SW registration failed'));
}
