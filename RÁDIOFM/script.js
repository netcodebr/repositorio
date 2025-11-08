// =============================
// 🎧 Rádio Metropolitana FM
// =============================

const STREAMS = [
  "https://e-spo-102.fabricahost.com.br/metropolitana985sp?f=1762546679N01K9FZFZXSCDFS8J2GTJ3SW3M8&tid=01K9FZFZXSEZFWABNHTBP02SHF",
  "https://ice-br.fabricahost.com.br/play/metropolitana985sp?1762546703715",
  "https://ice.fabricahost.com.br/metropolitana985sp?1762546703715"
];

// 🎚️ Criação do áudio e contexto
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const player = new Audio();
player.crossOrigin = "anonymous";
player.preload = "none";
const source = audioCtx.createMediaElementSource(player);
const gainNode = audioCtx.createGain();
source.connect(gainNode).connect(audioCtx.destination);
gainNode.gain.value = 1.0; // volume inicial 100%

// 🎛️ Elementos
const btn = document.getElementById("btnPlayPause");
const iconPlay = document.getElementById("iconPlay");
const iconPause = document.getElementById("iconPause");
const estadoEl = document.getElementById("estado");
const painel = document.querySelector(".painel");
const volumeSlider = document.getElementById("volume");

let tocando = false;
let current = parseInt(localStorage.getItem("ultimoServidor")) || 0;

// 🔊 Controle de volume real via GainNode
volumeSlider.addEventListener("input", () => {
  gainNode.gain.value = parseFloat(volumeSlider.value);
});

// 🎶 Tentar conectar aos servidores
async function tentarStream() {
  const url = STREAMS[current];
  player.src = url;

  try {
    await audioCtx.resume(); // necessário em mobile
    await player.play();
    tocando = true;
    iconPlay.style.display = "none";
    iconPause.style.display = "inline";
    painel.classList.add("tocando");
    estadoEl.textContent = `✅ Conectado (Servidor ${current + 1})`;
    document.title = "🎶 Tocando - Metropolitana FM 98.5";
    localStorage.setItem("ultimoServidor", current);
  } catch {
    estadoEl.textContent = `⚠️ Falha no servidor ${current + 1}`;
    current = (current + 1) % STREAMS.length;
    setTimeout(tentarStream, 1200);
  }
}

// ▶️ Play/Pause
btn.onclick = async () => {
  if (!tocando) {
    await audioCtx.resume();
    tentarStream();
  } else {
    player.pause();
    tocando = false;
    iconPlay.style.display = "inline";
    iconPause.style.display = "none";
    painel.classList.remove("tocando");
    estadoEl.textContent = "⏸️ Pausado";
    document.title = "Metropolitana FM 98.5";
  }
};

// 🧩 Erros e fallback
player.onerror = () => {
  tocando = false;
  painel.classList.remove("tocando");
  iconPlay.style.display = "inline";
  iconPause.style.display = "none";
  estadoEl.textContent = "🚫 Rádio fora do ar, tentando outro servidor...";
  current = (current + 1) % STREAMS.length;
  setTimeout(tentarStream, 3000);
};

// 🌐 Monitorar conexão
window.addEventListener("offline", () => {
  estadoEl.textContent = "📴 Sem internet";
});
window.addEventListener("online", () => {
  estadoEl.textContent = "🔁 Reconectando...";
  tentarStream();
});
