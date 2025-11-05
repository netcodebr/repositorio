const form = document.getElementById("apkForm");
const statusEl = document.getElementById("status");
const apkLinkDiv = document.getElementById("apkLink");
const downloadLink = document.getElementById("downloadLink");

// ⚠️ Coloque seu TOKEN com permissão `repo` e `workflow`
const GITHUB_TOKEN = "GITHUB_TOKEN_AQUI";
const OWNER = "netcodebr";
const REPO = "storage";
const WORKFLOW = "build-apk.yml";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  apkLinkDiv.style.display = "none";
  statusEl.innerHTML = "⏳ Enviando requisição ao GitHub Actions...";

  const pwaUrl = document.getElementById("pwaUrl").value;
  const appName = document.getElementById("appName").value;
  const packageId = document.getElementById("packageId").value;

  const payload = {
    ref: "main",
    inputs: {
      pwa_url: pwaUrl,
      app_name: appName,
      package_id: packageId
    }
  };

  try {
    // Dispara workflow
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) throw new Error("Falha ao iniciar o build");

    statusEl.innerHTML = "🚀 Build iniciado! Aguardando término...";

    // Aguarda execução
    await esperarFinalizarBuild();
  } catch (err) {
    statusEl.innerHTML = "❌ Erro: " + err.message;
  }
});

async function esperarFinalizarBuild() {
  const runsUrl = `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?per_page=1`;
  let apkUrl = null;

  statusEl.innerHTML = "⏳ Compilando APK no GitHub Actions... (pode levar até 3 minutos)";

  for (let i = 0; i < 60; i++) { // tenta por até ~3 minutos
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(runsUrl, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
    const data = await res.json();
    const run = data.workflow_runs?.[0];

    if (run && run.status === "completed" && run.conclusion === "success") {
      const artifactsUrl = run.artifacts_url;
      const artifactsRes = await fetch(artifactsUrl, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
      });
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
