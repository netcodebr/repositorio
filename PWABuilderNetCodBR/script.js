const form = document.getElementById("apkForm");
const statusEl = document.getElementById("status");
const apkLinkDiv = document.getElementById("apkLink");
const downloadLink = document.getElementById("downloadLink");

// Configurações
const OWNER = "netcodebr";
const REPO = "storage";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  apkLinkDiv.style.display = "none";
  statusEl.innerHTML = "⏳ Enviando requisição ao GitHub Actions...";

  const pwaUrl = document.getElementById("pwaUrl").value.trim();
  const appName = document.getElementById("appName").value.trim();
  const packageId = document.getElementById("packageId").value.trim();

  // 🔐 Dispara o evento repository_dispatch (sem token visível)
  try {
    const dispatchBody = {
      event_type: "gerar_apk",
      client_payload: { pwa_url: pwaUrl, app_name: appName, package_id: packageId }
    };

    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/dispatches`, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dispatchBody)
    });

    if (!response.ok) {
      throw new Error("Falha ao enviar requisição (código " + response.status + ")");
    }

    statusEl.innerHTML = "🚀 Build iniciado com sucesso! Aguardando término...";

    // ⏳ Espera o APK ser gerado
    await esperarFinalizarBuild();
  } catch (error) {
    statusEl.innerHTML = "❌ Erro: " + error.message;
    console.error(error);
  }
});

async function esperarFinalizarBuild() {
  const runsUrl = `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?per_page=1`;
  let apkUrl = null;

  statusEl.innerHTML = "⚙️ Gerando APK (pode levar até 3 minutos)...";

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(runsUrl);
    const data = await res.json();
    const run = data.workflow_runs?.[0];

    if (run && run.status === "completed" && run.conclusion === "success") {
      const artifactsRes = await fetch(run.artifacts_url);
      const artifactsData = await artifactsRes.json();

      if (artifactsData.total_count > 0) {
        apkUrl = artifactsData.artifacts[0].archive_download_url;
        break;
      }
    }
  }

  if (apkUrl) {
    statusEl.innerHTML = "✅ APK gerado com sucesso!";
    downloadLink.href = apkUrl;
    apkLinkDiv.style.display = "block";
  } else {
    statusEl.innerHTML = "⚠️ Não foi possível obter o link do APK. Verifique o GitHub Actions.";
  }
}
