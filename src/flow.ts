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
  title: "YAHATA USA Manufacturing Operating System",
  direction: "LR",
  lanes: [
    { id: "EXT", label: "External Systems", sortOrder: 10, color: "#CBD5E1" },
    { id: "PLAN", label: "Planning", sortOrder: 20, color: "#93C5FD" },
    { id: "PC", label: "Production Control", sortOrder: 30, color: "#86EFAC" },
    { id: "PROD", label: "Production", sortOrder: 40, color: "#5EEAD4" },
    { id: "QC", label: "Quality Control", sortOrder: 50, color: "#FDE047" },
    { id: "LOGI", label: "Inventory / Logistics", sortOrder: 60, color: "#FDBA74" },
    { id: "PUR", label: "Purchasing", sortOrder: 70, color: "#C4B5FD" },
  ],
  nodes: [
    { id: "ERP", label: "ERP\nSO / Forecast / Group PO", laneId: "EXT", type: "system", description: "Source system for demand data." },
    { id: "SO_IMPORT", label: "SO / Forecast Import", laneId: "PLAN", type: "process", description: "Import demand files for planning." },
    { id: "PREVIEW", label: "Planning / Preview", laneId: "PLAN", type: "process", description: "Review demand before order creation." },
    { id: "WO", label: "WO\nWork Order", laneId: "PC", type: "app", description: "Manage manufacturing work orders." },
    { id: "WOO", label: "WOO\nOperations", laneId: "PC", type: "app", description: "Track operation-level progress." },
    { id: "WI", label: "WI\nWork Instruction", laneId: "PC", type: "app", description: "Prepare shop floor instructions." },
    { id: "TICKET", label: "Ticket\nLabel / QR", laneId: "PC", type: "app", description: "Issue labels used for scanning." },
    { id: "PRODUCTION", label: "Production Terminal", laneId: "PROD", type: "screen", description: "Scan tickets on the shop floor." },
    { id: "MFG_RESULT", label: "Manufacturing Result", laneId: "PROD", type: "data", description: "Record production result quantities." },
    { id: "QC_SCAN", label: "QC Scan", laneId: "QC", type: "screen", description: "Scan products for quality checks." },
    { id: "QC_LOG", label: "QC Log", laneId: "QC", type: "data", description: "Store inspection records." },
    { id: "INV", label: "Inventory Snapshot", laneId: "LOGI", type: "app", description: "Show current inventory status." },
    { id: "SHIP", label: "Shipping", laneId: "LOGI", type: "process", description: "Prepare finished goods shipment." },
    { id: "MRP", label: "MRP Run", laneId: "PUR", type: "app", description: "Calculate material requirements." },
    { id: "PO_SUGGEST", label: "Purchase Suggestion", laneId: "PUR", type: "process", description: "Suggest purchase orders." },
  ],
  edges: [
    { from: "ERP", to: "SO_IMPORT", label: "CSV", flowType: "document", documentName: "SO / Forecast CSV" },
    { from: "SO_IMPORT", to: "PREVIEW" },
    { from: "PREVIEW", to: "WO", label: "Generate" },
    { from: "WO", to: "WOO", label: "Expand" },
    { from: "WOO", to: "WI", label: "Generate" },
    { from: "WI", to: "TICKET", label: "Generate Label", flowType: "document", documentName: "Ticket Label / QR" },
    { from: "TICKET", to: "PRODUCTION", label: "Scan", flowType: "document", documentName: "Ticket QR" },
    { from: "PRODUCTION", to: "MFG_RESULT", flowType: "status", documentName: "OK Qty / NG Qty" },
    { from: "TICKET", to: "QC_SCAN", label: "Scan", flowType: "document", documentName: "Ticket QR" },
    { from: "QC_SCAN", to: "QC_LOG", flowType: "document", documentName: "QC Record" },
    { from: "QC_SCAN", to: "INV", label: "QC Final", flowType: "status", documentName: "Inventory Status" },
    { from: "INV", to: "SHIP" },
    { from: "PREVIEW", to: "MRP" },
    { from: "INV", to: "MRP" },
    { from: "MRP", to: "PO_SUGGEST" },
  ],
  manualSections: [
    {
      id: "SEC_PLAN",
      title: "Planning",
      purpose: "Confirm demand and prepare work orders.",
      nodeIds: ["ERP", "SO_IMPORT", "PREVIEW", "WO"],
      sortOrder: 10,
    },
    {
      id: "SEC_EXECUTION",
      title: "Production Execution",
      purpose: "Prepare instructions, scan tickets, and record results.",
      nodeIds: ["WOO", "WI", "TICKET", "PRODUCTION", "MFG_RESULT"],
      sortOrder: 20,
    },
    {
      id: "SEC_QC_LOGI_PUR",
      title: "Quality, Logistics, and Purchasing",
      purpose: "Inspect products, manage inventory, and support purchasing.",
      nodeIds: ["QC_SCAN", "QC_LOG", "INV", "SHIP", "MRP", "PO_SUGGEST"],
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
