function buildDependencyGraph(graphData, structure) {
  const graphContainer = document.getElementById("graph");

  if (!graphContainer) {
    return;
  }

  const elements = [];
  const dlls = graphData.Dlls || graphData.dlls || [];

  dlls.forEach((dll) => {
    elements.push({
      data: {
        id: dll.Id,
        label: dll.DllName || dll.dllName,
        type: "dll",
        dll,
      },
    });
  });

  const localDllNames = new Map(
    dlls.map((dll) => [String(dll.DllName || dll.dllName).toLowerCase(), dll]),
  );

  dlls.forEach((dll) => {
    (dll.Dependencies || []).forEach((dependency, index) => {
      const dependencyName = dependency.AssemblyName || dependency.Name || "";
      const matchingDll = localDllNames.get(
        String(dependencyName).toLowerCase(),
      );

      if (!matchingDll || !dll.Id || !matchingDll.Id) {
        return;
      }

      elements.push({
        data: {
          id: `${dll.Id}-${matchingDll.Id}-${index}`,
          source: dll.Id,
          target: matchingDll.Id,
          dependencyName,
          version: dependency.Version,
          isLocalDll: Boolean(dependency.IsLocalDll),
          sourceDll: dll,
          targetDll: matchingDll,
          type: "dependency",
        },
      });
    });
  });

  const cy = cytoscape({
    container: graphContainer,
    elements,
    style: [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-wrap": "wrap",
          "text-max-width": 120,
          "font-size": 10,
          "text-valign": "center",
          "text-halign": "center",
          width: 70,
          height: 70,
          shape: "round-rectangle",
          "background-color": "#ffffff",
          color: "#111827",
          "border-width": 1.5,
          "border-color": "#cbd5e1",
          "font-weight": "600",
          "text-outline-width": 0,
          padding: "8px",
        },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": "#94a3b8",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "#94a3b8",
          "curve-style": "bezier",
          "arrow-scale": 0.8,
          "line-style": "solid",
        },
      },
    ],
    layout: {
      name: "cose",
      animate: false,
      fit: true,
      padding: 40,
      idealEdgeLength: 180,
      nodeRepulsion: 22000,
      gravity: 0.25,
      componentSpacing: 90,
      nodeOverlap: 0,
      randomize: false,
      nestingFactor: 0.7,
    },
  });

  cy.on("tap", "node", function (event) {
    const node = event.target;
    const dll = node.data("dll");

    if (!dll) {
      return;
    }

    if (typeof loadDllDetails === "function") {
      loadDllDetails(dll);
    }
  });

  cy.on("tap", "edge", function (event) {
    const edge = event.target;

    if (typeof showDependencyDetails === "function") {
      showDependencyDetails(edge.data("sourceDll"), edge.data("targetDll"), {
        AssemblyName: edge.data("dependencyName"),
        Version: edge.data("version"),
        IsLocalDll: edge.data("isLocalDll"),
      });
    }
  });

  window.cyGraph = cy;
}
