const analisarBtn = document.getElementById("analisarBtn");
const gerarZipBtn = document.getElementById("gerarZipBtn");
const gitBtn = document.getElementById("gerarGitBtn");
const info = document.getElementById("manifestoInfo");
const preview = document.getElementById("preview");
const resultado = document.getElementById("resultado");

analisarBtn.addEventListener("click", async () => {
  const url = document.getElementById("pwaUrl").value.trim();
  if (!url) return Swal.fire("⚠️ Informe a URL do PWA primeiro.");

  const manifestUrl = url.endsWith("/")
    ? url + "manifest.webmanifest"
    : url + "/manifest.webmanifest";

  info.innerHTML = "🔍 Analisando manifesto...";
  resultado.classList.remove("hidden");

  try {
    const res = await fetch(manifestUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Manifesto não encontrado");
    const manifest = await res.json();

    const iconSrc = manifest.icons?.[0]?.src
      ? new URL(manifest.icons[0].src, url).href
      : `https://www.google.com/s2/favicons?domain=${url}`;

    info.innerHTML = `
      <img src="${iconSrc}" width="72" height="72" alt="icon" style="border-radius:10px;">
      <h2>${manifest.name || "Sem nome"}</h2>
      <p>
        <b>Start URL:</b> ${manifest.start_url || "/"}<br>
        <b>Display:</b> ${manifest.display || "-"}<br>
        <b>Theme:</b> ${manifest.theme_color || "-"}<br>
        <b>Background:</b> ${manifest.background_color || "-"}
      </p>
    `;

    preview.classList.remove("hidden");
    preview.innerHTML = `
      <h3>Prévia Android</h3>
      <div class="mockup">
        <img src="${iconSrc}" alt="preview" />
      </div>
    `;

    gerarZipBtn.classList.remove("hidden");
    gitBtn.classList.remove("hidden");

    gerarZipBtn.onclick = () => gerarZip(url, manifest, iconSrc);
    gitBtn.onclick = () => gerarViaGit(url, manifest);

  } catch (err) {
    info.innerHTML = `<p style="color:#f66;">❌ Erro: ${err.message}</p>`;
  }
});

async function gerarZip(url, manifest, iconUrl) {
  const zip = new JSZip();
  const appName = manifest.name || "MeuPWA";
  const folder = zip.folder(appName.replace(/\s+/g, "_"));

  folder.file("README.txt", `
# Projeto Android gerado automaticamente
PWA: ${url}

Para compilar:
1. npm install -g @bubblewrap/cli
2. bubblewrap init --manifest=${url}/manifest.webmanifest
3. bubblewrap build
`);

  folder.file("AndroidManifest.xml", `
<manifest package="dev.${appName.toLowerCase().replace(/\s+/g, '')}"
    xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="${appName}">
        <activity android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:exported="true">
            <meta-data android:name="android.support.customtabs.trusted.DEFAULT_URL"
                android:value="${url}" />
        </activity>
    </application>
</manifest>
  `);

  try {
    const imgBlob = await fetch(iconUrl).then(r => r.blob());
    folder.file("icon.png", imgBlob);
  } catch {
    folder.file("icon.txt", "Ícone não pôde ser baixado automaticamente.");
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${appName.replace(/\s+/g, "_")}_Android_Project.zip`;
  link.click();
}

// 🔧 Gerar via GitHub Actions
function gerarViaGit(url, manifest) {
  const appName = manifest.name || "MeuPWA";
  const packageId = `br.com.netcodebr.${appName.toLowerCase().replace(/\s+/g, "")}`;
  const workflowUrl = `https://github.com/netcodebr/repositorio/actions/workflows/build-apk.yml`;

  Swal.fire({
    title: "Gerar APK automático?",
    html: `
      <b>PWA:</b> ${url}<br>
      <b>Nome:</b> ${appName}<br>
      <b>Pacote:</b> ${packageId}<br><br>
      O GitHub Actions será executado para gerar o APK (.apk e .aab).
    `,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sim, abrir GitHub",
    cancelButtonText: "Cancelar",
    background: "#0a1128",
    color: "#e2e8f0"
  }).then(result => {
    if (result.isConfirmed) window.open(workflowUrl, "_blank");
  });
}
