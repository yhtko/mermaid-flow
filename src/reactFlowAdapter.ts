import dagre from "@dagrejs/dagre";
import { Edge, MarkerType, Node, Position } from "@xyflow/react";
import { FlowDefinition, FlowEdge, StepNode, edgeId } from "./flow";

export type BusinessNodeData = {
  label: string;
  laneLabel: string;
  nodeType?: StepNode["type"];
  description?: string;
  laneColor?: string;
};

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 82;

const edgeVisuals: Record<NonNullable<FlowEdge["flowType"]>, { stroke: string; strokeWidth: number; strokeDasharray?: string }> = {
  process: { stroke: "#64748B", strokeWidth: 1.8 },
  document: { stroke: "#2563EB", strokeWidth: 2.1, strokeDasharray: "7 5" },
  status: { stroke: "#16A34A", strokeWidth: 3.6 },
  reference: { stroke: "#9333EA", strokeWidth: 1.5, strokeDasharray: "2 5" },
};

export function toReactFlowNodes(flow: FlowDefinition): Node<BusinessNodeData>[] {
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

export function toReactFlowEdges(flow: FlowDefinition): Edge[] {
  return flow.edges.filter((edge) => edge.to && (edge.flowType ?? "process") === "process").map((edge, index) => {
    const visual = edgeVisuals[edge.flowType ?? "process"];
    const label = edge.documentName || edge.label;
    return {
      id: edgeId(edge, index),
      source: edge.from,
      target: edge.to,
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
        borderRadius: 14,
        offset: flow.direction === "LR" ? 34 : 42,
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

export function autoLayout(flow: FlowDefinition): FlowDefinition {
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

  return {
    ...flow,
    nodes: flow.nodes.map((node) => {
      const dagreNode = graph.node(node.id);
      if (!dagreNode) return node;
      return {
        ...node,
        position: {
          x: dagreNode.x - NODE_WIDTH / 2,
          y: dagreNode.y - NODE_HEIGHT / 2,
        },
      };
    }),
  };
}
