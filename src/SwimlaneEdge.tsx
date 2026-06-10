import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
} from "@xyflow/react";

type SwimlaneEdgeData = {
  labelPlacement?: "horizontal" | "vertical";
  fullLabel?: string;
  routeSide?: "above" | "below";
  routeOffset?: number;
};

const HORIZONTAL_STUB = 28;
const CARD_CLEARANCE_ABOVE = 58;
const CARD_CLEARANCE_BELOW = 44;
const LABEL_GAP = 15;
const VERTICAL_LABEL_X_OFFSET = 30;
const VERTICAL_LABEL_Y_OFFSET = 18;

function SwimlaneEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  label,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as SwimlaneEdgeData | undefined;
  const labelText = typeof label === "string" ? label.trim() : "";
  const isVertical = edgeData?.labelPlacement === "vertical";
  const routeOffset = edgeData?.routeOffset ?? 0;
  const routeSide = edgeData?.routeSide ?? "above";
  const horizontalDirection = targetX >= sourceX ? 1 : -1;

  const routeY =
    routeSide === "below"
      ? Math.max(sourceY, targetY) + CARD_CLEARANCE_BELOW + routeOffset
      : Math.min(sourceY, targetY) - CARD_CLEARANCE_ABOVE - routeOffset;
  const sourceStubX = sourceX + HORIZONTAL_STUB * horizontalDirection;
  const targetStubX = targetX - HORIZONTAL_STUB * horizontalDirection;
  const horizontalPath = [
    `M ${sourceX},${sourceY}`,
    `L ${sourceStubX},${sourceY}`,
    `L ${sourceStubX},${routeY}`,
    `L ${targetStubX},${routeY}`,
    `L ${targetStubX},${targetY}`,
    `L ${targetX},${targetY}`,
  ].join(" ");
  const verticalMidY = sourceY + (targetY - sourceY) / 2;
  const verticalPath = [
    `M ${sourceX},${sourceY}`,
    `L ${sourceX},${verticalMidY}`,
    `L ${targetX},${verticalMidY}`,
    `L ${targetX},${targetY}`,
  ].join(" ");
  const horizontalLabelY = Math.min(sourceY, targetY) - CARD_CLEARANCE_ABOVE - routeOffset - LABEL_GAP;
  const edgePath = isVertical ? verticalPath : horizontalPath;
  const labelX = isVertical ? targetX + VERTICAL_LABEL_X_OFFSET : sourceX + (targetX - sourceX) / 2;
  const labelY = isVertical ? targetY - VERTICAL_LABEL_Y_OFFSET : horizontalLabelY;

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
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
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
