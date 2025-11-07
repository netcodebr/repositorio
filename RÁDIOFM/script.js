const STREAMS = [
  "https://e-spo-102.fabricahost.com.br/metropolitana985sp?f=1762546679N01K9FZFZXSCDFS8J2GTJ3SW3M8&tid=01K9FZFZXSEZFWABNHTBP02SHF",
  "https://ice-br.fabricahost.com.br/play/metropolitana985sp?1762546703715",
  "https://ice.fabricahost.com.br/metropolitana985sp?1762546703715"
];

const player = new Audio();
player.preload = "none";
player.volume = 1.0;

const btn = document.getElementById("btnPlayPause");
const iconPlay = document.getElementById("iconPlay");
const iconPause = document.getElementById("iconPause");
const estadoEl = document.getElementById("estado");
const painel = document.querySelector(".painel");
let tocando = false;
let current = 0;

async function tentarStream() {
  const url = STREAMS[current];
  player.src = url;
  try {
    await player.play();
    tocando = true;
    iconPlay.style.display = "none";
    iconPause.style.display = "inline";
    painel.classList.add("tocando");
    estadoEl.textContent = `✅ Conectado (Servidor ${current + 1})`;
  } catch {
    estadoEl.textContent = `⚠️ Falha no servidor ${current + 1}`;
    current = (current + 1) % STREAMS.length;
    setTimeout(tentarStream, 1200);
  }
}

btn.onclick = () => {
  if (!tocando) {
    tentarStream();
  } else {
    player.pause();
    tocando = false;
    iconPlay.style.display = "inline";
    iconPause.style.display = "none";
    painel.classList.remove("tocando");
    estadoEl.textContent = "⏸️ Pausado";
  }
};

player.onerror = () => {
  tocando = false;
  painel.classList.remove("tocando");
  iconPlay.style.display = "inline";
  iconPause.style.display = "none";
  estadoEl.textContent = "🚫 Rádio fora do ar, tentando outro servidor...";
  current = (current + 1) % STREAMS.length;
  setTimeout(tentarStream, 3000);
};
