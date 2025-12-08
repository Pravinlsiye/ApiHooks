/**
 * Smooth step edge algorithms for creating orthogonal edges with rounded corners
 */

import { Position } from './connection-path';

export interface XYPosition {
  x: number;
  y: number;
}

export interface GetSmoothStepPathParams {
  sourceX: number;
  sourceY: number;
  sourcePosition?: Position;
  targetX: number;
  targetY: number;
  targetPosition?: Position;
  borderRadius?: number;
  centerX?: number;
  centerY?: number;
  offset?: number;
  /**
   * Controls where the bend occurs along the path.
   * 0 = at source, 1 = at target, 0.5 = midpoint
   */
  stepPosition?: number;
}

const handleDirections = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

const getDirection = ({
  source,
  sourcePosition = Position.Bottom,
  target,
}: {
  source: XYPosition;
  sourcePosition: Position;
  target: XYPosition;
}): XYPosition => {
  if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
    return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }
  return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
};

const distance = (a: XYPosition, b: XYPosition) => 
  Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));

/**
 * Get edge center for straight edges
 */
export function getEdgeCenter({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}): [number, number, number, number] {
  const xOffset = Math.abs(targetX - sourceX) / 2;
  const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;

  const yOffset = Math.abs(targetY - sourceY) / 2;
  const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset;

  return [centerX, centerY, xOffset, yOffset];
}

/**
 * Calculate points for smooth step path
 */
function getPoints({
  source,
  sourcePosition = Position.Bottom,
  target,
  targetPosition = Position.Top,
  center,
  offset,
  stepPosition,
}: {
  source: XYPosition;
  sourcePosition: Position;
  target: XYPosition;
  targetPosition: Position;
  center: Partial<XYPosition>;
  offset: number;
  stepPosition: number;
}): [XYPosition[], number, number, number, number] {
  const sourceDir = handleDirections[sourcePosition];
  const targetDir = handleDirections[targetPosition];
  const sourceGapped: XYPosition = { 
    x: source.x + sourceDir.x * offset, 
    y: source.y + sourceDir.y * offset 
  };
  const targetGapped: XYPosition = { 
    x: target.x + targetDir.x * offset, 
    y: target.y + targetDir.y * offset 
  };
  const dir = getDirection({
    source: sourceGapped,
    sourcePosition,
    target: targetGapped,
  });
  const dirAccessor = dir.x !== 0 ? 'x' : 'y';
  const currDir = dir[dirAccessor];

  let points: XYPosition[] = [];
  let centerX, centerY;
  const sourceGapOffset = { x: 0, y: 0 };
  const targetGapOffset = { x: 0, y: 0 };

  const [, , defaultOffsetX, defaultOffsetY] = getEdgeCenter({
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
  });

  // opposite handle positions, default case
  if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
    if (dirAccessor === 'x') {
      centerX = center.x ?? (sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition);
      centerY = center.y ?? (sourceGapped.y + targetGapped.y) / 2;
    } else {
      centerX = center.x ?? (sourceGapped.x + targetGapped.x) / 2;
      centerY = center.y ?? (sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition);
    }

    const verticalSplit: XYPosition[] = [
      { x: centerX, y: sourceGapped.y },
      { x: centerX, y: targetGapped.y },
    ];

    const horizontalSplit: XYPosition[] = [
      { x: sourceGapped.x, y: centerY },
      { x: targetGapped.x, y: centerY },
    ];

    if (sourceDir[dirAccessor] === currDir) {
      points = dirAccessor === 'x' ? verticalSplit : horizontalSplit;
    } else {
      points = dirAccessor === 'x' ? horizontalSplit : verticalSplit;
    }
  } else {
    // Handle same direction connections
    const sourceTarget: XYPosition[] = [{ x: sourceGapped.x, y: targetGapped.y }];
    const targetSource: XYPosition[] = [{ x: targetGapped.x, y: sourceGapped.y }];
    
    if (dirAccessor === 'x') {
      points = sourceDir.x === currDir ? targetSource : sourceTarget;
    } else {
      points = sourceDir.y === currDir ? sourceTarget : targetSource;
    }

    if (sourcePosition === targetPosition) {
      const diff = Math.abs(source[dirAccessor] - target[dirAccessor]);

      if (diff <= offset) {
        const gapOffset = Math.min(offset - 1, offset - diff);
        if (sourceDir[dirAccessor] === currDir) {
          sourceGapOffset[dirAccessor] = (sourceGapped[dirAccessor] > source[dirAccessor] ? -1 : 1) * gapOffset;
        } else {
          targetGapOffset[dirAccessor] = (targetGapped[dirAccessor] > target[dirAccessor] ? -1 : 1) * gapOffset;
        }
      }
    }

    const sourceGapPoint = { 
      x: sourceGapped.x + sourceGapOffset.x, 
      y: sourceGapped.y + sourceGapOffset.y 
    };
    const targetGapPoint = { 
      x: targetGapped.x + targetGapOffset.x, 
      y: targetGapped.y + targetGapOffset.y 
    };
    const maxXDistance = Math.max(
      Math.abs(sourceGapPoint.x - points[0].x), 
      Math.abs(targetGapPoint.x - points[0].x)
    );
    const maxYDistance = Math.max(
      Math.abs(sourceGapPoint.y - points[0].y), 
      Math.abs(targetGapPoint.y - points[0].y)
    );

    if (maxXDistance >= maxYDistance) {
      centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
      centerY = points[0].y;
    } else {
      centerX = points[0].x;
      centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
    }
  }

  const pathPoints = [
    source,
    { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y },
    ...points,
    { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y },
    target,
  ];

  return [pathPoints, centerX || 0, centerY || 0, defaultOffsetX, defaultOffsetY];
}

/**
 * Create bend in path with border radius
 */
function getBend(a: XYPosition, b: XYPosition, c: XYPosition, size: number): string {
  const bendSize = Math.min(distance(a, b) / 2, distance(b, c) / 2, size);
  const { x, y } = b;

  // no bend
  if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) {
    return `L${x} ${y}`;
  }

  // first segment is horizontal
  if (a.y === y) {
    const xDir = a.x < c.x ? -1 : 1;
    const yDir = a.y < c.y ? 1 : -1;
    return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${y + bendSize * yDir}`;
  }

  const xDir = a.x < c.x ? 1 : -1;
  const yDir = a.y < c.y ? -1 : 1;
  return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`;
}

/**
 * Get smooth step path with rounded corners
 */
export function getSmoothStepPath({
  sourceX,
  sourceY,
  sourcePosition = Position.Bottom,
  targetX,
  targetY,
  targetPosition = Position.Top,
  borderRadius = 5,
  centerX,
  centerY,
  offset = 20,
  stepPosition = 0.5,
}: GetSmoothStepPathParams): [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number] {
  const [points, labelX, labelY, offsetX, offsetY] = getPoints({
    source: { x: sourceX, y: sourceY },
    sourcePosition,
    target: { x: targetX, y: targetY },
    targetPosition,
    center: { x: centerX, y: centerY },
    offset,
    stepPosition,
  });

  const path = points.reduce<string>((res, p, i) => {
    let segment = '';

    if (i > 0 && i < points.length - 1) {
      segment = getBend(points[i - 1], p, points[i + 1], borderRadius);
    } else {
      segment = `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`;
    }

    res += segment;
    return res;
  }, '');

  return [path, labelX, labelY, offsetX, offsetY];
}

/**
 * Convert smooth step path to HTML segments for CSS-based rendering
 */
export function smoothStepToHTMLSegments(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  offset = 60
): Array<{ x: number; y: number; width: number; height: number; angle: number }> {
  const [points] = getPoints({
    source: { x: sourceX, y: sourceY },
    sourcePosition,
    target: { x: targetX, y: targetY },
    targetPosition,
    center: {},
    offset,
    stepPosition: 0.5,
  });

  const segments: Array<{ x: number; y: number; width: number; height: number; angle: number }> = [];
  const lineWidth = 3;

  // Convert points to segments
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    if (length > 0) {
      segments.push({
        x: start.x,
        y: start.y - lineWidth / 2,
        width: length,
        height: lineWidth,
        angle: angle,
      });
    }
  }

  return segments;
}

