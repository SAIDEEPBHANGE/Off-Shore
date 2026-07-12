// Global State Variable to store fetched information for runfiltering
let globalAuditData = null;
let activeFolderIndex = 0;
let uiTimeout = null;

async function loadAuditFlow() {
  const loader = document.getElementById("loading-spinner");
  try {
    if (loader) loader.classList.remove("opacity-0", "pointer-events-none");

    // 1. Fetch index file mapping
    const indexResponse = await fetch("./data/api/latest-audit.json");
    if (!indexResponse.ok)
      throw new Error("Could not read index tracking file.");
    const indexData = await indexResponse.json();

    if (!indexData || indexData.length === 0) {
      throw new Error("Index file is empty.");
    }

    // 2. Extract Names for UI
    const latestAudit = indexData[0];
    document.getElementById("current-display-name").textContent =
      latestAudit.DisplayName;

    // 3. Fetch data content payload using payload string
    const dataResponse = await fetch(`./data/${latestAudit.FileName}`);
    if (!dataResponse.ok)
      throw new Error(`Could not load log payload: ${latestAudit.FileName}`);

    globalAuditData = await dataResponse.json();

    // Initialize Dashboard UI Components
    setupStaticData(globalAuditData);
    processAndRenderUI();

    // Bind Realtime Input Filtering Elements listeners with Dropdown/Search indicators
    document
      .getElementById("search-input")
      .addEventListener("input", triggerFilterLoader);
    document
      .getElementById("status-filter")
      .addEventListener("change", triggerFilterLoader);
  } catch (error) {
    console.error(error);
    const mainArea = document.getElementById("detail-panel") || document.body;
    mainArea.innerHTML = `
      <div class="bg-rose-950/20 border border-rose-900/50 rounded-xl p-6 text-center text-rose-300 m-4">
        <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-2 text-rose-400"></i>
        <p class="font-semibold">Log Parsing Interrupted</p>
        <p class="text-xs text-rose-400/70 mt-1">${error.message}</p>
      </div>
    `;
    lucide.createIcons();
  } finally {
    if (loader) {
      loader.classList.add("opacity-0", "pointer-events-none");
      setTimeout(() => loader.remove(), 400); // Clean completely from viewport DOM
    }
  }
}

// Shows the micro spinner in the Left Panel title when user edits fields or selects standard options
function triggerFilterLoader() {
  const filterLoader = document.getElementById("filter-loader");
  if (filterLoader) filterLoader.classList.remove("hidden");

  // Debounce/Microtask schedule to allow the layout spinner thread visibility before freezing DOM
  clearTimeout(uiTimeout);
  uiTimeout = setTimeout(() => {
    processAndRenderUI();
    if (filterLoader) filterLoader.classList.add("hidden");
  }, 150);
}

function setupStaticData(data) {
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

  const solEl = document.getElementById("config-sol-path");
  const audEl = document.getElementById("config-audit-path");
  solEl.textContent = data.Config.SolutionPath;
  solEl.setAttribute("title", data.Config.SolutionPath);
  audEl.textContent = data.Config.AuditFolder;
  audEl.setAttribute("title", data.Config.AuditFolder);
}

function processAndRenderUI() {
  const searchQuery = document
    .getElementById("search-input")
    .value.toLowerCase()
    .trim();
  const statusFilter = document.getElementById("status-filter").value; // 'all', 'success', 'failed'

  // Transform and filter structural dataset deep tree hierarchies
  let filteredFolders = [];

  globalAuditData.Folders.forEach((folder, originalIdx) => {
    // Check if the folder itself matches basic search criteria
    const folderMatchesSearch =
      folder.FolderName.toLowerCase().includes(searchQuery) ||
      folder.FolderPath.toLowerCase().includes(searchQuery);

    // Deep Filter assemblies list nested within folder structure
    const matchingDlls = folder.Dlls.filter((dll) => {
      // 1. Evaluate Status Dropdown criteria matches first
      if (statusFilter === "success" && dll.Status === "Failed") return false;
      if (statusFilter === "failed" && dll.Status !== "Failed") return false;

      // 2. Evaluate Search input patterns
      if (searchQuery !== "") {
        const nameMatch = dll.DllName.toLowerCase().includes(searchQuery);
        const pathMatch = dll.DllPath.toLowerCase().includes(searchQuery);
        const diagnosticMatch =
          dll.Reason && dll.Reason.toLowerCase().includes(searchQuery);
        return nameMatch || pathMatch || diagnosticMatch || folderMatchesSearch;
      }
      return true;
    });

    // Capture valid elements
    if (
      matchingDlls.length > 0 ||
      (searchQuery === "" && statusFilter === "all")
    ) {
      filteredFolders.push({
        ...folder,
        originalIndex: originalIdx,
        Dlls: matchingDlls,
      });
    }
  });

  // Update left-hand counter metrics badge numbers dynamically
  document.getElementById("folder-count-badge").textContent =
    filteredFolders.length;

  renderNavigationList(filteredFolders);

  // Ensure we fall back or render the active selection details safely
  if (filteredFolders.length > 0) {
    // Look for previous selection persistent configurations context
    let selectedFolder =
      filteredFolders.find((f) => f.originalIndex === activeFolderIndex) ||
      filteredFolders[0];
    renderFolderDetails(selectedFolder);
  } else {
    renderEmptyState();
  }
}

function renderNavigationList(folders) {
  const container = document.getElementById("folders-list");
  container.innerHTML = "";

  folders.forEach((folder) => {
    const isSelected = folder.originalIndex === activeFolderIndex;
    const item = document.createElement("div");
    item.className = `p-3 rounded-lg cursor-pointer transition-all border ${
      isSelected
        ? "bg-indigo-600/20 border-indigo-500/50 text-white font-medium"
        : "bg-slate-800/10 border-transparent hover:bg-slate-800/40 text-slate-300"
    }`;

    const okBadge =
      folder.Counts.Processed > 0
        ? `<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded text-[10px]">${folder.Counts.Processed} OK</span>`
        : "";
    const failBadge =
      folder.Counts.Failed > 0
        ? `<span class="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1 rounded text-[10px]">${folder.Counts.Failed} X</span>`
        : "";

    item.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <i data-lucide="${isSelected ? "folder-open" : "folder"}" class="w-3.5 h-3.5 flex-none ${isSelected ? "text-indigo-400" : "text-slate-400"}"></i>
          <span class="text-xs font-semibold truncate" title="${folder.FolderName}">${folder.FolderName}</span>
        </div>
        <span class="text-[10px] text-slate-500 font-mono flex-none">${folder.DurationMs}ms</span>
      </div>
      <div class="flex items-center justify-between mt-1.5">
        <p class="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">${folder.FolderPath}</p>
        <div class="flex gap-1">${okBadge}${failBadge}</div>
      </div>
    `;

    // Handles the switching operation loader context specifically when clicking lists
    item.addEventListener("click", () => {
      if (activeFolderIndex === folder.originalIndex) return;

      const switchLoader = document.getElementById("folder-switch-loader");
      if (switchLoader) switchLoader.classList.remove("hidden");

      activeFolderIndex = folder.originalIndex;

      setTimeout(() => {
        processAndRenderUI();
        if (switchLoader) switchLoader.classList.add("hidden");
      }, 80);
    });

    container.appendChild(item);
  });

  lucide.createIcons();
}

function renderFolderDetails(folder) {
  document.getElementById("selected-folder-title").innerHTML = `
    <i data-lucide="folder-open" class="w-4 h-4 text-indigo-400"></i> ${folder.FolderName}
  `;
  document.getElementById("selected-folder-subtitle").textContent =
    folder.FolderPath;
  document.getElementById("selected-folder-meta").innerHTML = `
    <span class="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 border border-slate-700 rounded-md">${folder.DurationMs} ms total delta</span>
  `;

  const tableBody = document.getElementById("dlls-table-body");
  tableBody.innerHTML = "";

  if (folder.Dlls.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-12 text-slate-500 text-xs">No assembly records matched criteria filters for this folder path.</td></tr>`;
    return;
  }

  folder.Dlls.forEach((dll) => {
    const statusStyle =
      dll.Status === "Failed"
        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

    const tr = document.createElement("tr");
    tr.className =
      "border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors";
    tr.innerHTML = `
      <td class="px-4 py-2.5 font-medium text-slate-200">
        <div class="flex items-center gap-1.5">
          <i data-lucide="file-code" class="w-3.5 h-3.5 text-slate-500 flex-none"></i>
          <span class="truncate max-w-xs block" title="${dll.DllName}">${dll.DllName}</span>
        </div>
        <div class="text-[10px] text-slate-500 font-mono mt-0.5 break-all max-w-md">${dll.DllPath}</div>
      </td>
      <td class="px-4 py-2.5 text-center">
        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${statusStyle}">
          ${dll.Status}
        </span>
      </td>
      <td class="px-4 py-2.5 text-slate-300 text-xs max-w-xs break-words">
        ${dll.Reason || '<span class="text-slate-600">—</span>'}
      </td>
      <td class="px-4 py-2.5 text-right font-mono text-[11px] text-slate-400">
        ${dll.DurationMs} ms
      </td>
    `;
    tableBody.appendChild(tr);
  });

  lucide.createIcons();
}

function renderEmptyState() {
  document.getElementById("selected-folder-title").textContent =
    "No Records Found";
  document.getElementById("selected-folder-subtitle").textContent =
    "Try modifying filtering fields context parameters";
  document.getElementById("selected-folder-meta").innerHTML = "";
  document.getElementById("dlls-table-body").innerHTML = `
    <tr>
      <td colspan="4" class="text-center py-16 text-slate-500">
        <i data-lucide="search-code" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
        <p class="text-sm">No folders or assemblies match your current filter parameters.</p>
      </td>
    </tr>
  `;
  lucide.createIcons();
}

window.addEventListener("DOMContentLoaded", loadAuditFlow);
