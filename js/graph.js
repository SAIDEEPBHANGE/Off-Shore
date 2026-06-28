function buildDependencyGraph(graphData) {

    const graphContainer =
        document.getElementById("graph");

    if (!graphContainer)
        return;

    const elements = [];

    //
    // DLL Nodes
    //
    const dlls =
        graphData.Dlls ||
        graphData.dlls ||
        [];

    dlls.forEach(dll => {

        elements.push({
            data: {
                id: dll.Id,
                label: dll.DllName
            }
        });
    });

    //
    // Dependency Edges
    //
    const references =
        graphData.References ||
        graphData.references ||
        [];

    references.forEach(ref => {

        elements.push({
            data: {
                source: ref.SourceDllId,
                target: ref.TargetDllId
            }
        });
    });

    const cy = cytoscape({

        container: graphContainer,

        elements: elements,

        style: [

            {
                selector: "node",
                style: {
                    "label": "data(label)",
                    "text-wrap": "wrap",
                    "text-max-width": 120,
                    "font-size": 11,
                    "text-valign": "center",
                    "text-halign": "center",
                    "width": 45,
                    "height": 45
                }
            },

            {
                selector: "edge",
                style: {
                    "curve-style": "bezier",
                    "target-arrow-shape": "triangle",
                    "arrow-scale": 0.8,
                    "width": 1.5
                }
            }

        ],

        layout: {
            name: "cose",
            animate: true,
            fit: true,
            padding: 25
        }
    });

    //
    // Click Node
    //
    cy.on("tap", "node", function (event) {

        const node =
            event.target;

        const dllId =
            node.id();

        const dll =
            dlls.find(x =>
                x.Id === dllId);

        if (!dll)
            return;

        loadDllDetails(dll);
    });

    //
    // Store globally
    //
    window.cyGraph = cy;
}