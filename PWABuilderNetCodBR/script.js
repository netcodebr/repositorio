const form = document.getElementById("apkForm");
const statusEl = document.getElementById("status");
const progressBar = document.getElementById("progress");
const apkLinkDiv = document.getElementById("apkLink");
const downloadLink = document.getElementById("downloadLink");

const OWNER = "netcodebr";
const REPO = "storage";

// ✅ Token limitado para uso público (sem acesso total)
const token = "ghp_xxxxxxxxxxxxxxxxxxx"; // ⚠️ use um token só com workflow scope (não admin)

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  apkLinkDiv.style.display = "none";
  atualizarStatus("⏳ Enviando requisição segura ao GitHub...", 10);

  const pwaUrl = document.getElementById("pwaUrl").value.trim();
  const appName = document.getElementById("appName").value.trim();
  const packageId = document.getElementById("packageId").value.trim();

  try {
    // 🔹 Envia requisição para acionar o workflow trigger-workflow.yml
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/trigger-workflow.yml/dispatches`,
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            pwa_url: pwaUrl,
            app_name: appName,
            package_id: packageId
          }
        })
      }
    );

    if (!res.ok) {
      throw new Error(`Falha ao enviar evento (código ${res.status})`);
    }

    atualizarStatus("🚀 Workflow iniciado! Aguardando compilação...", 25);
    await monitorarProgresso();
  } catch (error) {
    atualizarStatus(`❌ Erro: ${error.message}`, 0, true);
  }
});

async function monitorarProgresso() {
  const runsUrl = `https://api.github.com/repos/${OWNER}/${REPO}/actions/runs?per_page=1`;
  let apkUrl = null;
  let progresso = 30;

  for (let i = 0; i < 90; i++) {
    await esperar(4000);
    const res = await fetch(runsUrl, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    const run = data.workflow_runs?.[0];

    if (run && run.status === "in_progress") {
      progresso = Math.min(90, progresso + 2);
      atualizarStatus("⚙️ Compilando APK no GitHub Actions...", progresso);
    }

    if (run && run.status === "completed") {
      if (run.conclusion === "success") {
        const artifactsRes = await fetch(run.artifacts_url, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const artifactsData = await artifactsRes.json();

        if (artifactsData.total_count > 0) {
          apkUrl = artifactsData.artifacts[0].archive_download_url;
          atualizarStatus("✅ APK gerado com sucesso!", 100);
          break;
        }
      } else {
        atualizarStatus("❌ Erro na compilação. Verifique o workflow.", 100, true);
        return;
      }
    }
  }

  if (apkUrl) {
    downloadLink.href = apkUrl;
    apkLinkDiv.style.display = "block";
  } else {
    atualizarStatus("⚠️ Timeout: Não foi possível obter o link do APK.", 100, true);
  }
}

function atualizarStatus(mensagem, progresso, erro = false) {
  statusEl.innerHTML = mensagem;
  progressBar.style.background = erro ? "#ff5555" : "#00aaff";
  progressBar.style.width = `${progresso}%`;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
