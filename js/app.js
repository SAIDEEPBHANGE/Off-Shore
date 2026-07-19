let currentStructure = null;
let currentGraphData = null;
let isLoadingStructure = false;

function getDllName(dll) {
  return dll?.DllName ?? dll?.dllName ?? "";
}

function getDllVersion(dll) {
  return dll?.Version ?? dll?.version ?? "";
}

function showGraphLoading(message = "Loading structure...") {
  const overlay = document.getElementById("graphLoader");
  const loaderText = document.getElementById("graphLoaderText");
  const selector = document.getElementById("structureSelect");

  if (overlay) {
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
  }

  if (loaderText) {
    loaderText.textContent = message;
  }

  if (selector) {
    selector.disabled = true;
  }
}

function hideGraphLoading() {
  const overlay = document.getElementById("graphLoader");
  const selector = document.getElementById("structureSelect");

  if (overlay) {
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
  }

  if (selector) {
    selector.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const selector = document.getElementById("structureSelect");

  if (!selector) {
    return;
  }

  selector.addEventListener("change", async (event) => {
    await loadStructure(event.target.value);
  });

  await loadStructureFromManifest();
});

async function loadStructureFromManifest() {
  try {
    const response = await fetch("data/structure-manifest.json");

    if (!response.ok) {
      throw new Error(`Failed to load structure manifest (${response.status})`);
    }

    const manifest = await response.json();
    const selector = document.getElementById("structureSelect");

    selector.innerHTML = "";

    manifest.forEach((structure) => {
      const option = document.createElement("option");
      option.value = structure.id;
      option.textContent = structure.folderName;
      selector.appendChild(option);
    });

    if (manifest.length > 0) {
      selector.value = manifest[0].id;
      await loadStructure(manifest[0].id);
    }
  } catch (error) {
    console.error(error);
    showDetailsError("Unable to load structure list.");
  }
}

async function loadStructure(structureId) {
  const selector = document.getElementById("structureSelect");
  const graphStatus = document.getElementById("graphStatus");

  if (isLoadingStructure) {
    return;
  }

  isLoadingStructure = true;
  showGraphLoading(`Loading ${structureId}...`);

  try {
    const manifestResponse = await fetch("data/structure-manifest.json");
    const manifest = await manifestResponse.json();
    const structure =
      manifest.find((entry) => entry.id === structureId) || manifest[0];

    if (!structure) {
      throw new Error("No structure definition found.");
    }

    currentStructure = structure;
    selector.value = structure.id;

    if (graphStatus) {
      graphStatus.textContent = `Viewing ${structure.folderName}`;
    }

    const graphResponse = await fetch(structure.graphPath);

    if (!graphResponse.ok) {
      throw new Error(`Failed to load ${structure.graphPath}`);
    }

    currentGraphData = await graphResponse.json();

    if (typeof buildDependencyGraph === "function") {
      buildDependencyGraph(currentGraphData, structure);
    }

    showEmptyState();
  } catch (error) {
    console.error(error);
    showDetailsError(`Unable to load ${structureId}.`);
  } finally {
    isLoadingStructure = false;
    hideGraphLoading();
  }
}

async function loadDllDetails(dll) {
  if (!currentStructure) {
    return;
  }

  const dllName = getDllName(dll);

  if (!dllName) {
    return;
  }

  try {
    const response = await fetch(
      `${currentStructure.detailsBasePath}/${dllName}.json`,
    );

    if (!response.ok) {
      throw new Error(`Failed to load ${dllName}.json`);
    }

    const dllData = await response.json();
    showDllDetails(dllData, dll);
  } catch (error) {
    console.error(error);
    showDetailsError(`Failed to load details for ${dllName}.`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDetailValue(value) {
  if (value === null || typeof value === "undefined") {
    return '<span class="text-slate-500">null</span>';
  }

  if (typeof value === "string") {
    return `<span>${escapeHtml(value)}</span>`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return `<span>${escapeHtml(String(value))}</span>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '<span class="text-slate-500">[]</span>';
    }

    return `
      <ul class="mt-2 space-y-2">
        ${value
          .map(
            (item) =>
              `<li class="rounded border border-slate-200 bg-white px-2 py-2">${renderDetailValue(item)}</li>`,
          )
          .join("")}
      </ul>
    `;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return '<span class="text-slate-500">{}</span>';
    }

    return `
      <div class="mt-2 space-y-2">
        ${entries
          .map(
            ([key, nestedValue]) => `
              <div class="rounded border border-slate-200 bg-white p-2">
                <div class="font-medium text-slate-800">${escapeHtml(key)}</div>
                <div class="mt-1 text-sm text-slate-700">${renderDetailValue(nestedValue)}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  return '<span class="text-slate-500">unknown</span>';
}

function showEmptyState() {
  const panel = document.getElementById("detailsPanel");

  panel.innerHTML = `
    <div class="rounded-lg border border-slate-200 bg-white p-4 text-slate-600 shadow-sm">
      Select a DLL or dependency to view its information.
    </div>
  `;
}

function showDetailsError(message) {
  const panel = document.getElementById("detailsPanel");

  panel.innerHTML = `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
      ${message}
    </div>
  `;
}

function showDllDetails(dllData, dll) {
  const panel = document.getElementById("detailsPanel");
  const name = dllData.DllName ?? dllData.dllName ?? getDllName(dll) ?? "DLL";
  const version =
    getDllVersion(dll) || dllData.Version || dllData.version || "";
  const filePath =
    dll?.FilePath ||
    dllData.FilePath ||
    dll?.filePath ||
    dllData.filePath ||
    "";
  const assemblyName = dllData.AssemblyName || dllData.assemblyName || "";

  const metadataEntries = Object.entries(dllData || {}).filter(
    ([key]) =>
      ![
        "Classes",
        "classes",
        "Interfaces",
        "interfaces",
        "Structs",
        "structs",
        "Enums",
        "enums",
        "Delegates",
        "delegates",
        "Dependencies",
        "dependencies",
      ].includes(key),
  );

  panel.innerHTML = `
    <div class="space-y-4 text-slate-900">
      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="text-xl font-semibold">${escapeHtml(name)}</h3>
        ${version ? `<p class="mt-1 text-sm text-slate-600">Version: ${escapeHtml(version)}</p>` : ""}
        ${filePath ? `<p class="mt-1 text-sm text-slate-600">Path: ${escapeHtml(filePath)}</p>` : ""}
        ${assemblyName ? `<p class="mt-1 text-sm text-slate-600">Assembly: ${escapeHtml(assemblyName)}</p>` : ""}
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h4 class="font-semibold">Full information</h4>
        <div class="mt-3 space-y-3">
          ${metadataEntries
            .map(
              ([key, value]) => `
                <div class="rounded border border-slate-200 bg-slate-50 p-3">
                  <div class="font-medium text-slate-800">${escapeHtml(key)}</div>
                  <div class="mt-1 text-sm text-slate-700">${renderDetailValue(value)}</div>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>

      ${[
        ["Classes", dllData.Classes ?? dllData.classes],
        ["Interfaces", dllData.Interfaces ?? dllData.interfaces],
        ["Structs", dllData.Structs ?? dllData.structs],
        ["Enums", dllData.Enums ?? dllData.enums],
        ["Delegates", dllData.Delegates ?? dllData.delegates],
        [
          "Dependencies",
          dll?.Dependencies || dllData.Dependencies || dllData.dependencies,
        ],
      ]
        .filter(
          ([, value]) =>
            value && (Array.isArray(value) ? value.length > 0 : true),
        )
        .map(
          ([label, value]) => `
            <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h4 class="font-semibold">${escapeHtml(label)}</h4>
              ${renderDetailValue(value)}
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function showDependencyDetails(sourceDll, targetDll, dependencyInfo) {
  const panel = document.getElementById("detailsPanel");

  panel.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="text-xl font-semibold">Dependency</h3>
        <p class="mt-2 text-sm text-slate-600">
          ${sourceDll ? getDllName(sourceDll) : "Unknown DLL"} → ${targetDll ? getDllName(targetDll) : "Unknown DLL"}
        </p>
      </div>

      <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h4 class="font-semibold">Details</h4>
        <ul class="mt-2 space-y-2 text-sm text-slate-600">
          <li><strong>Assembly:</strong> ${dependencyInfo?.AssemblyName || "Unknown"}</li>
          <li><strong>Version:</strong> ${dependencyInfo?.Version || ""}</li>
          <li><strong>Local DLL:</strong> ${dependencyInfo?.IsLocalDll ? "Yes" : "No"}</li>
        </ul>
      </div>
    </div>
  `;
}
