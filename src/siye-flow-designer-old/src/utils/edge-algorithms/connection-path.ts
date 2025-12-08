/**
 * Connection path algorithms for creating connections with straight segments and curves
 */

export enum Position {
  Left = 'left',
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
}

/**
 * Convert connection path to HTML segments for CSS-based rendering
 * Uses straight segments (60px from output, 60px to input) with a curve in between
 */
export function connectionPathToHTMLSegments(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  segments = 20
): Array<{ x: number; y: number; width: number; height: number; angle: number }> {
  // Fixed constant straight lengths
  const outputStraight = 60; // Always 60px straight from output port
  const inputStraight = 60;  // Always 60px straight to input port
  
  // Calculate straight segment endpoints
  const outEndX = startX + outputStraight;
  const outEndY = startY;
  
  const inStartX = endX - inputStraight;
  const inStartY = endY;
  
  // Calculate curve between the two straight segments
  const horizontalGap = inStartX - outEndX;
  const curveDistance = Math.min(Math.abs(horizontalGap) / 2, 80);
  
  const cp1x = outEndX + curveDistance;
  const cp1y = outEndY;
  
  const cp2x = inStartX - curveDistance;
  const cp2y = inStartY;
  
  const result: Array<{ x: number; y: number; width: number; height: number; angle: number }> = [];
  
  // First straight segment: from start to outEnd
  const straight1Length = Math.sqrt(Math.pow(outEndX - startX, 2) + Math.pow(outEndY - startY, 2));
  if (straight1Length > 0) {
    result.push({
      x: startX,
      y: startY - 2, // Center the 4px high segment
      width: straight1Length,
      height: 4,
      angle: Math.atan2(outEndY - startY, outEndX - startX) * 180 / Math.PI,
    });
  }
  
  // Curve segment: cubic bezier from outEnd to inStart
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const nextT = (i + 1) / segments;
    
    // Cubic bezier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
    const x1 = Math.pow(1 - t, 3) * outEndX + 
               3 * Math.pow(1 - t, 2) * t * cp1x +
               3 * (1 - t) * Math.pow(t, 2) * cp2x +
               Math.pow(t, 3) * inStartX;
               
    const y1 = Math.pow(1 - t, 3) * outEndY +
               3 * Math.pow(1 - t, 2) * t * cp1y +
               3 * (1 - t) * Math.pow(t, 2) * cp2y +
               Math.pow(t, 3) * inStartY;
               
    const x2 = Math.pow(1 - nextT, 3) * outEndX +
               3 * Math.pow(1 - nextT, 2) * nextT * cp1x +
               3 * (1 - nextT) * Math.pow(nextT, 2) * cp2x +
               Math.pow(nextT, 3) * inStartX;
               
    const y2 = Math.pow(1 - nextT, 3) * outEndY +
               3 * Math.pow(1 - nextT, 2) * nextT * cp1y +
               3 * (1 - nextT) * Math.pow(nextT, 2) * cp2y +
               Math.pow(nextT, 3) * inStartY;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    if (length > 0) {
      result.push({
        x: x1,
        y: y1 - 2, // Center the 4px high segment
        width: length,
        height: 4,
        angle: angle,
      });
    }
  }
  
  // Second straight segment: from inStart to end
  const straight2Length = Math.sqrt(Math.pow(endX - inStartX, 2) + Math.pow(endY - inStartY, 2));
  if (straight2Length > 0) {
    result.push({
      x: inStartX,
      y: inStartY - 2, // Center the 4px high segment
      width: straight2Length,
      height: 4,
      angle: Math.atan2(endY - inStartY, endX - inStartX) * 180 / Math.PI,
    });
  }

  return result;
}

/**
 * Convert connection path to SVG path string
 * Uses straight segments (60px from output, 60px to input) with a curve in between
 */
export function connectionPathToSVG(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): string {
  // Fixed constant straight lengths
  const outputStraight = 60; // Always 60px straight from output port
  const inputStraight = 60;  // Always 60px straight to input port
  
  // Calculate straight segment endpoints
  const outEndX = startX + outputStraight;
  const outEndY = startY;
  
  const inStartX = endX - inputStraight;
  const inStartY = endY;
  
  // Calculate curve between the two straight segments
  const horizontalGap = inStartX - outEndX;
  const curveDistance = Math.min(Math.abs(horizontalGap) / 2, 80);
  
  const cp1x = outEndX + curveDistance;
  const cp1y = outEndY;
  
  const cp2x = inStartX - curveDistance;
  const cp2y = inStartY;
  
  // Build SVG path: M (move to start), L (line to), C (cubic bezier curve), L (line to end)
  return `M ${startX} ${startY} L ${outEndX} ${outEndY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${inStartX} ${inStartY} L ${endX} ${endY}`;
}

