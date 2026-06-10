import dagre from "@dagrejs/dagre";
import { Edge, MarkerType, Node, Position } from "@xyflow/react";
import { FlowDefinition, FlowEdge, Lane, StepNode, edgeId } from "./flow";

export type BusinessNodeData = {
  label: string;
  laneLabel: string;
  nodeType?: StepNode["type"];
  description?: string;
  laneColor?: string;
};

export type LaneBandNodeData = {
  label: string;
  color?: string;
};

export type LayoutMode = "topDown" | "swimlane";

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 82;
export const SWIMLANE_NODE_WIDTH = 210;
export const SWIMLANE_NODE_HEIGHT = 90;
export const SWIMLANE_LANE_WIDTH = 270;
export const SWIMLANE_LANE_GAP = 24;
export const SWIMLANE_ROW_HEIGHT = 145;
export const SWIMLANE_HEADER_HEIGHT = 62;
export const SWIMLANE_PADDING_X = 50;
export const SWIMLANE_PADDING_Y = 52;

const edgeVisuals: Record<NonNullable<FlowEdge["flowType"]>, { stroke: string; strokeWidth: number; strokeDasharray?: string }> = {
  process: { stroke: "#64748B", strokeWidth: 1.8 },
  document: { stroke: "#2563EB", strokeWidth: 2.1, strokeDasharray: "7 5" },
  status: { stroke: "#16A34A", strokeWidth: 3.6 },
  reference: { stroke: "#9333EA", strokeWidth: 1.5, strokeDasharray: "2 5" },
};

function sortedLanes(flow: FlowDefinition): Lane[] {
  return [...flow.lanes].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function toReactFlowNodes(flow: FlowDefinition, layoutMode: LayoutMode = "topDown"): Node<BusinessNodeData | LaneBandNodeData>[] {
  if (layoutMode === "swimlane") {
    return toSwimlaneReactFlowNodes(flow);
  }

  const horizontal = flow.direction === "LR";
  return flow.nodes.map((node) => {
    const lane = flow.lanes.find((item) => item.id === node.laneId);
    return {
      id: node.id,
      type: "businessNode",
      position: node.position ?? { x: 0, y: 0 },
      sourcePosition: horizontal ? Position.Right : Position.Bottom,
      targetPosition: horizontal ? Position.Left : Position.Top,
      data: {
        label: node.label,
        laneLabel: lane?.label ?? node.laneId,
        nodeType: node.type,
        description: node.description,
        laneColor: lane?.color,
      },
    };
  });
}

function toSwimlaneReactFlowNodes(flow: FlowDefinition): Node<BusinessNodeData | LaneBandNodeData>[] {
  const lanes = sortedLanes(flow);
  const laneIndex = new Map(lanes.map((lane, index) => [lane.id, index]));
  const maxNodeY = Math.max(...flow.nodes.map((node) => node.position?.y ?? SWIMLANE_PADDING_Y + SWIMLANE_HEADER_HEIGHT), SWIMLANE_PADDING_Y + SWIMLANE_HEADER_HEIGHT);
  const laneHeight = Math.max(620, maxNodeY + SWIMLANE_NODE_HEIGHT + SWIMLANE_PADDING_Y);

  const laneBands: Node<LaneBandNodeData>[] = lanes.map((lane, index) => ({
    id: `lane-band-${lane.id}`,
    type: "laneBand",
    position: {
      x: SWIMLANE_PADDING_X + index * (SWIMLANE_LANE_WIDTH + SWIMLANE_LANE_GAP),
      y: SWIMLANE_PADDING_Y,
    },
    data: {
      label: lane.label,
      color: lane.color,
    },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: -1,
    style: {
      width: SWIMLANE_LANE_WIDTH,
      height: laneHeight,
    },
  }));

  const stepNodes: Node<BusinessNodeData>[] = flow.nodes.map((node) => {
    const lane = flow.lanes.find((item) => item.id === node.laneId);
    const index = laneIndex.get(node.laneId) ?? 0;
    const defaultX = SWIMLANE_PADDING_X + index * (SWIMLANE_LANE_WIDTH + SWIMLANE_LANE_GAP) + (SWIMLANE_LANE_WIDTH - SWIMLANE_NODE_WIDTH) / 2;
    const defaultY = SWIMLANE_PADDING_Y + SWIMLANE_HEADER_HEIGHT + SWIMLANE_PADDING_Y;

    return {
      id: node.id,
      type: "businessNode",
      position: node.position ?? { x: defaultX, y: defaultY },
      data: {
        label: node.label,
        laneLabel: lane?.label ?? node.laneId,
        nodeType: node.type,
        description: node.description,
        laneColor: lane?.color,
      },
      zIndex: 2,
      style: {
        width: SWIMLANE_NODE_WIDTH,
      },
    };
  });

  return [...laneBands, ...stepNodes];
}

export function toReactFlowEdges(flow: FlowDefinition, layoutMode: LayoutMode = "topDown"): Edge[] {
  const laneByStep = new Map(flow.nodes.map((node) => [node.id, node.laneId]));
  const laneOrder = new Map(sortedLanes(flow).map((lane, index) => [lane.id, index]));

  return flow.edges.filter((edge) => edge.to && (edge.flowType ?? "process") === "process").map((edge, index) => {
    const visual = edgeVisuals[edge.flowType ?? "process"];
    const label = edge.documentName || edge.label;
    const sourceLane = laneByStep.get(edge.from);
    const targetLane = laneByStep.get(edge.to);
    const sourceLaneOrder = sourceLane ? laneOrder.get(sourceLane) ?? 0 : 0;
    const targetLaneOrder = targetLane ? laneOrder.get(targetLane) ?? 0 : 0;
    const sameLane = sourceLane === targetLane;
    const isSwimlane = layoutMode === "swimlane";
    const sourceHandle = isSwimlane ? (sameLane ? "bottom" : targetLaneOrder >= sourceLaneOrder ? "right" : "left") : flow.direction === "LR" ? "right" : "bottom";
    const targetHandle = isSwimlane ? (sameLane ? "top" : targetLaneOrder >= sourceLaneOrder ? "left" : "right") : flow.direction === "LR" ? "left" : "top";

    return {
      id: edgeId(edge, index),
      source: edge.from,
      target: edge.to,
      sourceHandle,
      targetHandle,
      label,
      animated: false,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: visual.stroke,
      },
      pathOptions: {
        borderRadius: isSwimlane ? 10 : 14,
        offset: isSwimlane ? (sameLane ? 30 : 22) : flow.direction === "LR" ? 34 : 42,
      },
      style: {
        stroke: visual.stroke,
        strokeWidth: visual.strokeWidth,
        strokeDasharray: visual.strokeDasharray,
      },
      data: {
        flowType: edge.flowType ?? "process",
      },
    };
  });
}

export function autoLayout(flow: FlowDefinition, layoutMode: LayoutMode = "topDown"): FlowDefinition {
  if (layoutMode === "swimlane") {
    return autoLayoutSwimlane(flow);
  }

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: flow.direction,
    align: "UL",
    nodesep: flow.direction === "LR" ? 90 : 70,
    ranksep: flow.direction === "LR" ? 150 : 115,
    edgesep: 70,
    marginx: 60,
    marginy: 60,
  });

  flow.nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  flow.edges.filter((edge) => edge.to).forEach((edge) => {
    graph.setEdge(edge.from, edge.to);
  });

  dagre.layout(graph);

  const positioned = new Map<string, { x: number; y: number }>();
  flow.nodes.forEach((node) => {
    const dagreNode = graph.node(node.id);
    if (!dagreNode) return;
    positioned.set(node.id, {
      x: dagreNode.x - NODE_WIDTH / 2,
      y: dagreNode.y - NODE_HEIGHT / 2,
    });
  });

  // Build descendant sets so we can shift whole subtrees together.
  const childrenOf = new Map<string, string[]>();
  flow.nodes.forEach((n) => childrenOf.set(n.id, []));
  flow.edges.filter((e) => e.to).forEach((e) => childrenOf.get(e.from)?.push(e.to));

  function descendants(id: string): string[] {
    const result: string[] = [];
    const stack = [...(childrenOf.get(id) ?? [])];
    while (stack.length) {
      const cur = stack.pop()!;
      result.push(cur);
      stack.push(...(childrenOf.get(cur) ?? []));
    }
    return result;
  }

  // Re-sort siblings by sortOrder and shift their entire subtrees.
  const horizontal = flow.direction === "LR";
  flow.nodes.forEach((node) => {
    const children = flow.edges
      .filter((e) => e.from === node.id && e.to)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((e) => e.to);
    if (children.length < 2) return;

    const positions = children.map((id) => positioned.get(id)!).filter(Boolean);
    if (positions.length < 2) return;

    if (horizontal) {
      // LR: assign sorted Y positions top-to-bottom
      const ys = [...positions.map((p) => p.y)].sort((a, b) => a - b);
      children.forEach((id, i) => {
        const delta = ys[i] - (positioned.get(id)?.y ?? 0);
        if (delta === 0) return;
        [id, ...descendants(id)].forEach((did) => {
          const p = positioned.get(did);
          if (p) positioned.set(did, { ...p, y: p.y + delta });
        });
      });
    } else {
      // TD: assign sorted X positions left-to-right
      const xs = [...positions.map((p) => p.x)].sort((a, b) => a - b);
      children.forEach((id, i) => {
        const delta = xs[i] - (positioned.get(id)?.x ?? 0);
        if (delta === 0) return;
        [id, ...descendants(id)].forEach((did) => {
          const p = positioned.get(did);
          if (p) positioned.set(did, { ...p, x: p.x + delta });
        });
      });
    }
  });

  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      const pos = positioned.get(node.id);
      if (!pos) return node;
      return { ...node, position: pos };
    }),
  };
}

export function autoLayoutSwimlane(flow: FlowDefinition): FlowDefinition {
  const lanes = sortedLanes(flow);
  const laneIndex = new Map(lanes.map((lane, index) => [lane.id, index]));
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));
  const validEdges = flow.edges
    .filter((edge) => edge.to && nodeById.has(edge.from) && nodeById.has(edge.to))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const outgoing = new Map<string, FlowEdge[]>();
  const incoming = new Map<string, FlowEdge[]>();

  flow.nodes.forEach((node) => {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  });

  validEdges.forEach((edge) => {
    outgoing.get(edge.from)?.push(edge);
    incoming.get(edge.to)?.push(edge);
  });

  const rowById = new Map<string, number>();
  const laneRowUse = new Map<string, Set<number>>();

  function reserveRow(laneId: string, preferredRow: number): number {
    const used = laneRowUse.get(laneId) ?? new Set<number>();
    let row = Math.max(0, preferredRow);
    while (used.has(row)) row += 1;
    used.add(row);
    laneRowUse.set(laneId, used);
    return row;
  }

  function assignRow(nodeId: string, preferredRow: number) {
    const node = nodeById.get(nodeId);
    if (!node) return;
    if (rowById.has(nodeId)) {
      const current = rowById.get(nodeId)!;
      if (preferredRow <= current) return;

      const used = laneRowUse.get(node.laneId);
      used?.delete(current);
    }

    rowById.set(nodeId, reserveRow(node.laneId, preferredRow));
  }

  const startNodes = flow.nodes.filter((node) => (incoming.get(node.id)?.length ?? 0) === 0);
  const orderedStarts = startNodes.length ? startNodes : flow.nodes.slice(0, 1);
  orderedStarts.forEach((node, index) => assignRow(node.id, index));

  const queue = orderedStarts.map((node) => node.id);
  const visits = new Map<string, number>();

  while (queue.length) {
    const sourceId = queue.shift()!;
    const sourceNode = nodeById.get(sourceId);
    if (!sourceNode) continue;

    const sourceRow = rowById.get(sourceId) ?? 0;
    const edges = outgoing.get(sourceId) ?? [];
    const isBranch = edges.length > 1;

    edges.forEach((edge, edgeIndex) => {
      const targetNode = nodeById.get(edge.to);
      if (!targetNode) return;

      const targetAlreadyAssigned = rowById.has(targetNode.id);
      const sameLane = sourceNode.laneId === targetNode.laneId;
      const preferredRow = isBranch
        ? sourceRow + 1 + edgeIndex
        : sameLane
          ? sourceRow + 1
          : Math.max(sourceRow, (incoming.get(targetNode.id)?.length ?? 0) > 1 ? sourceRow + 1 : sourceRow);

      if (!targetAlreadyAssigned || preferredRow > (rowById.get(targetNode.id) ?? 0)) {
        assignRow(targetNode.id, preferredRow);
      }

      const nextVisits = (visits.get(targetNode.id) ?? 0) + 1;
      visits.set(targetNode.id, nextVisits);
      if (nextVisits <= flow.nodes.length) queue.push(targetNode.id);
    });
  }

  flow.nodes.forEach((node, index) => {
    if (!rowById.has(node.id)) {
      assignRow(node.id, index);
    }
  });

  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      const lanePos = laneIndex.get(node.laneId) ?? 0;
      const row = rowById.get(node.id) ?? 0;

      return {
        ...node,
        position: {
          x: SWIMLANE_PADDING_X + lanePos * (SWIMLANE_LANE_WIDTH + SWIMLANE_LANE_GAP) + (SWIMLANE_LANE_WIDTH - SWIMLANE_NODE_WIDTH) / 2,
          y: SWIMLANE_PADDING_Y + SWIMLANE_HEADER_HEIGHT + row * SWIMLANE_ROW_HEIGHT,
        },
      };
    }),
  };
}
