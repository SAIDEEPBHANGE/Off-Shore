let assemblyGraph = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadAssemblyGraph();
});

async function loadAssemblyGraph() {
  try {
    const response = await fetch(
      "../Dll-Structure/SmartPlantPID/SmartPlantPID.json",
    );

    if (!response.ok) {
      throw new Error(`Failed to load SmartPlantPID.json (${response.status})`);
    }

    assemblyGraph = await response.json();

    console.log("Assembly Graph Loaded");

    console.log(assemblyGraph);

    renderDllTree();

    initializeGraph();
  } catch (error) {
    console.error(error);

    document.getElementById("dllTree").innerHTML = `
            <div class="text-red-500 p-2">
                Failed to load SmartPlantPID.json
            </div>
            `;
  }
}

function renderDllTree() {
  const treeContainer = document.getElementById("dllTree");

  treeContainer.innerHTML = "";

  const dlls = assemblyGraph.Dlls || assemblyGraph.dlls || [];

  if (dlls.length === 0) {
    treeContainer.innerHTML = `
            <div class="text-slate-400">
                No DLLs Found
            </div>
            `;

    return;
  }

  dlls
    .sort((a, b) =>
      (a.DllName || a.dllName).localeCompare(b.DllName || b.dllName),
    )
    .forEach((dll) => {
      const node = createDllNode(
        {
          dllName: dll.DllName ?? dll.dllName,

          version: dll.Version ?? dll.version,
        },
        () => loadDllDetails(dll),
      );

      treeContainer.appendChild(node);
    });
}

async function loadDllDetails(dll) {
  try {
    const dllName = dll.DllName ?? dll.dllName;

    const response = await fetch(
      `..//Dll-Structure/SmartPlantPID/Dlls/${dllName}.json`,
    );

    if (!response.ok) {
      throw new Error(`Failed to load ${dllName}.json`);
    }

    const dllData = await response.json();

    showDllDetails(dllData);
  } catch (error) {
    console.error(error);

    document.getElementById("detailsPanel").innerHTML = `
            <div class="text-red-500">
                Failed to load DLL details.
            </div>
            `;
  }
}

function showDllDetails(dllData) {
  const panel = document.getElementById("detailsPanel");

  const classCount = dllData.Classes?.length ?? dllData.classes?.length ?? 0;

  const interfaceCount =
    dllData.Interfaces?.length ?? dllData.interfaces?.length ?? 0;

  const structCount = dllData.Structs?.length ?? dllData.structs?.length ?? 0;

  const enumCount = dllData.Enums?.length ?? dllData.enums?.length ?? 0;

  const delegateCount =
    dllData.Delegates?.length ?? dllData.delegates?.length ?? 0;

  panel.innerHTML = `
        <div class="space-y-4">

            <div>

                <h2 class="text-2xl font-bold">
                    ${dllData.DllName ?? dllData.dllName}
                </h2>

                <div class="text-slate-500">
                    Version:
                    ${dllData.Version ?? dllData.version ?? ""}
                </div>

            </div>

            <div class="grid grid-cols-2 gap-4">

                <div class="bg-white p-3 rounded shadow">
                    <strong>Classes</strong>
                    <div>${classCount}</div>
                </div>

                <div class="bg-white p-3 rounded shadow">
                    <strong>Interfaces</strong>
                    <div>${interfaceCount}</div>
                </div>

                <div class="bg-white p-3 rounded shadow">
                    <strong>Structs</strong>
                    <div>${structCount}</div>
                </div>

                <div class="bg-white p-3 rounded shadow">
                    <strong>Enums</strong>
                    <div>${enumCount}</div>
                </div>

                <div class="bg-white p-3 rounded shadow">
                    <strong>Delegates</strong>
                    <div>${delegateCount}</div>
                </div>

            </div>

        </div>
        `;
}

function initializeGraph() {
  if (typeof buildDependencyGraph === "function") {
    buildDependencyGraph(assemblyGraph);
  }
}
