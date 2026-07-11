async function loadAuditFlow() {
  try {
    // 1. Fetch the index file mapping
    const indexResponse = await fetch("./data/api/latest-audit.json");
    if (!indexResponse.ok)
      throw new Error("Could not read index tracking file.");
    const indexData = await indexResponse.json();

    if (!indexData || indexData.length === 0) {
      throw new Error("Index file is empty.");
    }

    // 2. Extract DisplayName for UI and FileName for data request
    const latestAudit = indexData[0];
    document.getElementById("current-display-name").textContent =
      latestAudit.DisplayName;

    // 3. Fetch data content payload using the filename string
    const dataResponse = await fetch(`./data/${latestAudit.FileName}`);
    if (!dataResponse.ok)
      throw new Error(`Could not load log payload: ${latestAudit.FileName}`);
    const auditPayload = await dataResponse.json();

    renderDashboard(auditPayload);
  } catch (error) {
    console.error(error);
    document.getElementById("folders-container").innerHTML = `
          <div class="bg-rose-950/20 border border-rose-900/50 rounded-xl p-6 text-center text-rose-300">
            <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-2 text-rose-400"></i>
            <p class="font-semibold">Log Parsing Interrupted</p>
            <p class="text-xs text-rose-400/70 mt-1">${error.message}</p>
          </div>
        `;
    lucide.createIcons();
  }
}

function renderDashboard(data) {
  document.getElementById("target-framework").textContent =
    data.TargetFramework || "N/A";
  document.getElementById("machine-name").textContent = data.Machine || "N/A";
  document.getElementById("run-id").textContent = data.RunId || "N/A";

  document.getElementById("stat-folders").textContent =
    data.Summary.FoldersScanned;
  document.getElementById("stat-total").textContent = data.Summary.TotalDlls;
  document.getElementById("stat-processed").textContent =
    data.Summary.Processed;
  document.getElementById("stat-failed").textContent = data.Summary.Failed;
  document.getElementById("stat-duration").textContent =
    `${data.TotalDurationMs} ms`;

  document.getElementById("config-sol-path").textContent =
    data.Config.SolutionPath;
  document.getElementById("config-audit-path").textContent =
    data.Config.AuditFolder;

  const container = document.getElementById("folders-container");
  container.innerHTML = "";

  data.Folders.forEach((folder) => {
    const folderCard = document.createElement("div");
    folderCard.className =
      "bg-slate-800/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-slate-950/20";

    const processedBadge =
      folder.Counts.Processed > 0
        ? `<span class="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs border border-emerald-500/20">${folder.Counts.Processed} OK</span>`
        : "";
    const failedBadge =
      folder.Counts.Failed > 0
        ? `<span class="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded text-xs border border-rose-500/20">${folder.Counts.Failed} Failed</span>`
        : "";

    let dllRows = "";
    folder.Dlls.forEach((dll) => {
      const statusStyle =
        dll.Status === "Failed"
          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

      dllRows += `
            <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
              <td class="px-6 py-4 font-medium text-slate-200">
                <div class="flex items-center gap-2">
                  <i data-lucide="file-code" class="w-4 h-4 text-slate-500"></i>
                  ${dll.DllName}
                </div>
                <div class="text-xs text-slate-500 font-mono mt-0.5 break-all max-w-lg">${dll.DllPath}</div>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyle}">
                  ${dll.Status}
                </span>
              </td>
              <td class="px-6 py-4 text-slate-300 font-medium text-sm">
                ${dll.Reason || "—"}
              </td>
              <td class="px-6 py-4 text-right font-mono text-xs text-slate-400">
                ${dll.DurationMs} ms
              </td>
            </tr>
          `;
    });

    folderCard.innerHTML = `
          <div class="bg-slate-800/40 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <i data-lucide="folder-open" class="w-5 h-5 text-indigo-400"></i>
                <h3 class="text-lg font-bold text-white">${folder.FolderName}</h3>
              </div>
              <p class="text-xs font-mono text-slate-500 mt-0.5">${folder.FolderPath}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-400 font-mono">${folder.DurationMs} ms total</span>
              <div class="flex gap-1">${processedBadge}${failedBadge}</div>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-900/40 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th class="px-6 py-3">Assembly Name</th>
                  <th class="px-6 py-3 text-center w-24">Status</th>
                  <th class="px-6 py-3">Failure Diagnosis</th>
                  <th class="px-6 py-3 text-right w-24">Delta</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-850">
                ${dllRows}
              </tbody>
            </table>
          </div>
        `;
    container.appendChild(folderCard);
  });

  lucide.createIcons();
}

window.addEventListener("DOMContentLoaded", loadAuditFlow);
