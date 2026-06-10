import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react";

type SwimlaneEdgeData = {
  labelPlacement?: "horizontal" | "vertical";
  fullLabel?: string;
};

function SwimlaneEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
  data,
  selected,
  pathOptions,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: pathOptions?.borderRadius,
    offset: pathOptions?.offset,
  });
  const edgeData = data as SwimlaneEdgeData | undefined;
  const labelText = typeof label === "string" ? label.trim() : "";
  const isVertical = edgeData?.labelPlacement === "vertical";
  const xOffset = isVertical ? 22 : 0;
  const yOffset = isVertical ? 0 : -24;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        className={selected ? "selected" : ""}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            className={`swimlane-edge-label ${isVertical ? "vertical" : "horizontal"}`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX + xOffset}px, ${labelY + yOffset}px)`,
            }}
            title={edgeData?.fullLabel ?? labelText}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default SwimlaneEdge;
