export type Lane = {
  id: string;
  label: string;
  color?: string;
  sortOrder: number;
};

export type StepNode = {
  id: string;
  label: string;
  laneId: string;
  type?: "system" | "app" | "process" | "screen" | "data";
  description?: string;
  position?: { x: number; y: number };
};

export type FlowEdge = {
  id?: string;
  from: string;
  to: string;
  label?: string;
  flowType?: "process" | "document" | "status" | "reference";
  documentName?: string;
  description?: string;
  sortOrder?: number;
  branch?: "left" | "right";
};

export type ManualSection = {
  id: string;
  title: string;
  purpose?: string;
  nodeIds: string[];
  sortOrder: number;
};

export type FlowDefinition = {
  title: string;
  direction: "LR" | "TD";
  lanes: Lane[];
  nodes: StepNode[];
  edges: FlowEdge[];
  manualSections?: ManualSection[];
  overview?: string;
};

export type ValidationResult = {
  errors: string[];
  warnings: string[];
};

export const initialFlow: FlowDefinition = {
  title: "Order to Ship — Manufacturing Flow",
  direction: "LR",
  lanes: [
    { id: "SALES", label: "Sales", sortOrder: 10, color: "#CBD5E1" },
    { id: "PLAN", label: "Planning", sortOrder: 20, color: "#93C5FD" },
    { id: "PROD", label: "Production", sortOrder: 30, color: "#86EFAC" },
    { id: "QC", label: "Quality Control", sortOrder: 40, color: "#FDE047" },
    { id: "LOGI", label: "Logistics", sortOrder: 50, color: "#FDBA74" },
  ],
  nodes: [
    { id: "ORDER", label: "Customer Order", laneId: "SALES", type: "process", description: "Receive and confirm customer order." },
    { id: "PLAN_ORDER", label: "Production Planning", laneId: "PLAN", type: "process", description: "Create production plan based on order." },
    { id: "MAT_CHECK", label: "Material Check", laneId: "PLAN", type: "process", description: "Verify material availability." },
    { id: "PRODUCE", label: "Production", laneId: "PROD", type: "screen", description: "Execute manufacturing operations." },
    { id: "INSPECT", label: "Inspection", laneId: "QC", type: "screen", description: "Inspect finished goods against spec." },
    { id: "PACK", label: "Packing", laneId: "LOGI", type: "process", description: "Pack and label finished products." },
    { id: "SHIP", label: "Shipping", laneId: "LOGI", type: "process", description: "Dispatch shipment to customer." },
  ],
  edges: [
    { from: "ORDER", to: "PLAN_ORDER", label: "Order" },
    { from: "PLAN_ORDER", to: "MAT_CHECK" },
    { from: "MAT_CHECK", to: "PRODUCE", label: "Start" },
    { from: "PRODUCE", to: "INSPECT" },
    { from: "INSPECT", to: "PACK", label: "Pass" },
    { from: "PACK", to: "SHIP" },
  ],
  manualSections: [
    {
      id: "SEC_ORDER",
      title: "Order & Planning",
      purpose: "Receive customer order and prepare production plan.",
      nodeIds: ["ORDER", "PLAN_ORDER", "MAT_CHECK"],
      sortOrder: 10,
    },
    {
      id: "SEC_PROD",
      title: "Production & Quality",
      purpose: "Manufacture and inspect finished goods.",
      nodeIds: ["PRODUCE", "INSPECT"],
      sortOrder: 20,
    },
    {
      id: "SEC_SHIP",
      title: "Logistics & Shipping",
      purpose: "Pack and dispatch products to the customer.",
      nodeIds: ["PACK", "SHIP"],
      sortOrder: 30,
    },
  ],
};

export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function escapeLabel(label: string): string {
  return label.replace(/"/g, "&quot;").replace(/\n/g, "<br/>");
}

export function generateMermaid(flow: FlowDefinition): string {
  const lines: string[] = [];
  lines.push(`flowchart ${flow.direction}`);
  lines.push("");

  const sortedLanes = [...flow.lanes].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const lane of sortedLanes) {
    const laneId = sanitizeId(lane.id);
    lines.push(`subgraph ${laneId}["${escapeLabel(lane.label)}"]`);

    flow.nodes
      .filter((node) => node.laneId === lane.id)
      .forEach((node) => {
        const nodeId = sanitizeId(node.id);
        lines.push(`  ${nodeId}["${escapeLabel(node.label)}"]`);
      });

    lines.push("end");
    lines.push("");
  }

  for (const edge of flow.edges.filter((item) => (item.flowType ?? "process") === "process")) {
    const from = sanitizeId(edge.from);
    const to = sanitizeId(edge.to);
    const edgeLabel = edge.label?.trim() || edge.documentName?.trim();
    if (edgeLabel) {
      lines.push(`${from} -->|${escapeLabel(edgeLabel)}| ${to}`);
    } else {
      lines.push(`${from} --> ${to}`);
    }
  }

  return lines.join("\n");
}

export function edgeId(edge: FlowEdge, index: number): string {
  return edge.id ?? `${edge.from}-${edge.to}-${index}`;
}

export function validateFlow(flow: FlowDefinition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const laneIds = new Set<string>();
  const nodeIds = new Set<string>();
  const connectedNodeIds = new Set<string>();

  for (const lane of flow.lanes) {
    if (!lane.id.trim()) errors.push("Lane ID is required.");
    if (laneIds.has(lane.id)) errors.push(`Duplicate lane ID: ${lane.id}`);
    laneIds.add(lane.id);
  }

  for (const node of flow.nodes) {
    if (!node.id.trim()) errors.push("Step ID is required.");
    if (nodeIds.has(node.id)) errors.push(`Duplicate step ID: ${node.id}`);
    if (!laneIds.has(node.laneId)) errors.push(`Step ${node.id} references missing lane: ${node.laneId}`);
    nodeIds.add(node.id);
  }

  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.from)) errors.push(`Connection references missing From step: ${edge.from}`);
    if (!nodeIds.has(edge.to)) errors.push(`Connection references missing To step: ${edge.to}`);
    connectedNodeIds.add(edge.from);
    connectedNodeIds.add(edge.to);
  }

  for (const node of flow.nodes) {
    if (!connectedNodeIds.has(node.id)) warnings.push(`Isolated step: ${node.id}`);
  }

  if (hasCycle(flow)) {
    warnings.push("Cycle detected in connections.");
  }

  return { errors, warnings };
}

function hasCycle(flow: FlowDefinition): boolean {
  const graph = new Map<string, string[]>();
  flow.nodes.forEach((node) => graph.set(node.id, []));
  flow.edges.forEach((edge) => graph.get(edge.from)?.push(edge.to));

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of graph.get(id) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return flow.nodes.some((node) => visit(node.id));
}

export function normalizeFlow(input: FlowDefinition): FlowDefinition {
  return {
    title: input.title ?? "",
    direction: input.direction === "TD" ? "TD" : "LR",
    lanes: Array.isArray(input.lanes)
      ? input.lanes.map((lane, index) => ({
          id: String(lane.id ?? ""),
          label: String(lane.label ?? ""),
          color: lane.color,
          sortOrder: Number(lane.sortOrder ?? index * 10),
        }))
      : [],
    nodes: Array.isArray(input.nodes)
      ? input.nodes.map((node) => ({
          id: String(node.id ?? ""),
          label: String(node.label ?? "").replace(/<br\/?>/g, "\n"),
          laneId: String(node.laneId ?? ""),
          type: node.type,
          description: node.description,
          position: node.position,
        }))
      : [],
    edges: Array.isArray(input.edges)
      ? input.edges.map((edge, index) => ({
          id: edge.id ?? `edge-${index + 1}`,
          from: String(edge.from ?? ""),
          to: String(edge.to ?? ""),
          label: edge.label,
          flowType: edge.flowType ?? "process",
          documentName: edge.documentName,
          description: edge.description,
        }))
      : [],
    manualSections: Array.isArray(input.manualSections)
      ? input.manualSections.map((section, index) => ({
          id: String(section.id ?? `SECTION_${index + 1}`),
          title: String(section.title ?? ""),
          purpose: section.purpose,
          nodeIds: Array.isArray(section.nodeIds) ? section.nodeIds.map(String) : [],
          sortOrder: Number(section.sortOrder ?? index * 10),
        }))
      : [],
  };
}
