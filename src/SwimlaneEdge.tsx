import {
  BaseEdge,
  EdgeProps,
  Position,
} from "@xyflow/react";

function orthogonalPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
) {
  if (Math.abs(sourceX - targetX) < 2) {
    return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  }

  if (Math.abs(sourceY - targetY) < 2) {
    return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  }

  if (sourcePosition === Position.Bottom || sourcePosition === Position.Top || targetPosition === Position.Top || targetPosition === Position.Bottom) {
    const midY = sourceY + (targetY - sourceY) / 2;
    return `M ${sourceX},${sourceY} L ${sourceX},${midY} L ${targetX},${midY} L ${targetX},${targetY}`;
  }

  const midX = sourceX + (targetX - sourceX) / 2;
  return `M ${sourceX},${sourceY} L ${midX},${sourceY} L ${midX},${targetY} L ${targetX},${targetY}`;
}

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
  selected,
}: EdgeProps) {
  const edgePath = orthogonalPath(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  );

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={style}
      className={selected ? "selected" : ""}
    />
  );
}

export default SwimlaneEdge;
