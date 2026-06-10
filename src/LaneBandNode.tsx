import { NodeProps } from "@xyflow/react";
import { LaneBandNodeData } from "./reactFlowAdapter";

function LaneBandNode({ data }: NodeProps) {
  const laneData = data as LaneBandNodeData;
  const color = laneData.color ?? "#E5E7EB";

  return (
    <div className="lane-band-node" style={{ "--lane-color": color } as React.CSSProperties}>
      <div className="lane-band-header">{laneData.label}</div>
    </div>
  );
}

export default LaneBandNode;
