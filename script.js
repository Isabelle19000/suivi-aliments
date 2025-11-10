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
  installBtn.style.display = "none";
  deferredPrompt = null;
});

// ----------- Service Worker Registration -----------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(() => {
    console.log("Service Worker registered");
  });
}

/* ----- LE RESTE DE TON SCRIPT, IDENTIQUE ----- */
