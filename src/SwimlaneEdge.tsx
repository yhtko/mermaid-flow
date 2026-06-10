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

const HORIZONTAL_LABEL_Y_OFFSET = 70;
const VERTICAL_LABEL_X_OFFSET = 28;
const VERTICAL_LABEL_Y_OFFSET = 18;

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
  const displayLabelX = isVertical ? labelX + VERTICAL_LABEL_X_OFFSET : labelX;
  const displayLabelY = isVertical ? labelY - VERTICAL_LABEL_Y_OFFSET : Math.min(sourceY, targetY) - HORIZONTAL_LABEL_Y_OFFSET;

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
              transform: `translate(-50%, -50%) translate(${displayLabelX}px, ${displayLabelY}px)`,
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
