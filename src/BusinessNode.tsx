import { Handle, NodeProps, Position } from "@xyflow/react";
import { BusinessNodeData } from "./reactFlowAdapter";

const fallbackColors: Record<string, string> = {
  system: "#E5E7EB",
  app: "#DCFCE7",
  process: "#DBEAFE",
  screen: "#FEF3C7",
  data: "#EDE9FE",
};

function BusinessNode({ data, selected, sourcePosition, targetPosition }: NodeProps) {
  const nodeData = data as BusinessNodeData;
  const color = nodeData.laneColor || fallbackColors[nodeData.nodeType ?? "process"] || "#E5E7EB";

  return (
    <div className={`business-node ${selected ? "selected" : ""}`} style={{ "--lane-color": color } as React.CSSProperties}>
      <Handle type="target" position={targetPosition ?? Position.Left} />
      <div className="business-node-lane">{nodeData.laneLabel}</div>
      <div className="business-node-label">{nodeData.label}</div>
      <div className="business-node-type">{nodeData.nodeType ?? "process"}</div>
      <Handle type="source" position={sourcePosition ?? Position.Right} />
    </div>
  );
}

export default BusinessNode;
