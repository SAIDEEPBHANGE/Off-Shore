function clearSelection() {
  const nodes = document.querySelectorAll(".dll-node");

  nodes.forEach((node) =>
    node.classList.remove("bg-blue-200", "border-blue-500"),
  );
}

function selectNode(element) {
  clearSelection();

  element.classList.add("bg-blue-200", "border-blue-500");
}

function createDllNode(dll, onClick) {
  const node = document.createElement("div");

  node.className =
    "dll-node cursor-pointer rounded border border-transparent px-2 py-2 mb-1 hover:bg-blue-100";

  node.innerHTML = `
        <div class="font-medium">
            ${dll.dllName}
        </div>

        <div class="text-xs text-slate-500">
            ${dll.version ?? ""}
        </div>
        `;

  node.addEventListener("click", (e) => {
    selectNode(node);

    if (onClick) {
      onClick(dll);
    }
  });

  return node;
}
