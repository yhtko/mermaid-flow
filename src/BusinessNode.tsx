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
      {nodeData.inputChips?.length ? (
        <div className="business-node-input-chips">
          {nodeData.inputChips.map((chip) => (
            <span className="business-node-input-chip" key={chip.id} title={chip.fullLabel}>
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
      <Handle id="top" type="target" position={Position.Top} />
      <Handle id="top-right" type="target" position={Position.Top} style={{ left: "72%", top: "-7px" }} />
      <Handle id="left" type="target" position={Position.Left} />
      <Handle id="left-lower" type="target" position={Position.Left} style={{ top: "66%" }} />
      <Handle id="right" type="target" position={Position.Right} />
      <Handle id="right-upper" type="target" position={Position.Right} style={{ top: "36%" }} />
      <Handle id="bottom" type="target" position={Position.Bottom} />
      <Handle id={targetPosition === Position.Bottom ? "legacy-bottom-target" : "legacy-left-target"} type="target" position={targetPosition ?? Position.Left} />
      <div className="business-node-lane">{nodeData.laneLabel}</div>
      <div className="business-node-label">{nodeData.label}</div>
      <div className="business-node-type">{nodeData.nodeType ?? "process"}</div>
      <Handle id="top" type="source" position={Position.Top} />
      <Handle id="left" type="source" position={Position.Left} />
      <Handle id="left-lower" type="source" position={Position.Left} style={{ top: "66%" }} />
      <Handle id="right" type="source" position={Position.Right} />
      <Handle id="right-lower" type="source" position={Position.Right} style={{ top: "66%" }} />
      <Handle id="bottom" type="source" position={Position.Bottom} />
      <Handle id="bottom-right" type="source" position={Position.Bottom} style={{ bottom: "-7px", left: "72%" }} />
      <Handle id={sourcePosition === Position.Bottom ? "legacy-bottom-source" : "legacy-right-source"} type="source" position={sourcePosition ?? Position.Right} />
    </div>
  );
}

export default BusinessNode;
