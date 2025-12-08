/**
 * Connection path algorithms for smooth bezier curves
 */

import { DOMDiff } from './dom-diff';

export interface PathPoint {
    x: number;
    y: number;
}

/**
 * Calculate bezier curve midpoint at t=0.5
 * Memoized for performance during drag operations
 */
const _getBezierMidpoint = (
    startX: number,
    startY: number,
    endX: number,
    endY: number
): PathPoint => {
    const outputStraight = 60;
    const inputStraight = 60;

    const outEndX = startX + outputStraight;
    const outEndY = startY;
    const inStartX = endX - inputStraight;
    const inStartY = endY;

    const horizontalGap = inStartX - outEndX;
    const curveDistance = Math.min(Math.abs(horizontalGap) / 2, 80);

    const cp1x = outEndX + curveDistance;
    const cp1y = outEndY;
    const cp2x = inStartX - curveDistance;
    const cp2y = inStartY;

    const t = 0.5;
    const midX = Math.pow(1 - t, 3) * outEndX +
        3 * Math.pow(1 - t, 2) * t * cp1x +
        3 * (1 - t) * Math.pow(t, 2) * cp2x +
        Math.pow(t, 3) * inStartX;
    const midY = Math.pow(1 - t, 3) * outEndY +
        3 * Math.pow(1 - t, 2) * t * cp1y +
        3 * (1 - t) * Math.pow(t, 2) * cp2y +
        Math.pow(t, 3) * inStartY;

    return { x: midX, y: midY };
};

// Memoized version of getBezierMidpoint for performance
export const getBezierMidpoint = DOMDiff.memoize(
    _getBezierMidpoint,
    (startX: number, startY: number, endX: number, endY: number) => 
        `${startX},${startY},${endX},${endY}`,
    500
);

/**
 * Generate SVG path string for a connection
 * Uses straight segments (60px) with smooth bezier curve in between
 * Memoized for performance during connection updates
 */
const _connectionPathToSVG = (
    startX: number,
    startY: number,
    endX: number,
    endY: number
): string => {
    const outputStraight = 60;
    const inputStraight = 60;

    const outEndX = startX + outputStraight;
    const outEndY = startY;
    const inStartX = endX - inputStraight;
    const inStartY = endY;

    const horizontalGap = inStartX - outEndX;
    const curveDistance = Math.min(Math.abs(horizontalGap) / 2, 80);

    const cp1x = outEndX + curveDistance;
    const cp1y = outEndY;
    const cp2x = inStartX - curveDistance;
    const cp2y = inStartY;

    return `M ${startX} ${startY} L ${outEndX} ${outEndY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${inStartX} ${inStartY} L ${endX} ${endY}`;
};

// Memoized version of connectionPathToSVG for performance
export const connectionPathToSVG = DOMDiff.memoize(
    _connectionPathToSVG,
    (startX: number, startY: number, endX: number, endY: number) => 
        `path:${startX},${startY},${endX},${endY}`,
    500
);

/**
 * Calculate SVG bounding box for the connection path
 * Memoized for performance
 */
const _getConnectionBoundingBox = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    padding: number = 10
): { minX: number; minY: number; width: number; height: number } => {
    const outputStraight = 60;
    const inputStraight = 60;

    const outEndX = startX + outputStraight;
    const inStartX = endX - inputStraight;

    const minX = Math.min(startX, outEndX, inStartX, endX) - padding;
    const maxX = Math.max(startX, outEndX, inStartX, endX) + padding;
    const minY = Math.min(startY, endY) - padding;
    const maxY = Math.max(startY, endY) + padding;

    return {
        minX,
        minY,
        width: maxX - minX,
        height: maxY - minY
    };
};

// Memoized version of getConnectionBoundingBox for performance
export const getConnectionBoundingBox = DOMDiff.memoize(
    _getConnectionBoundingBox,
    (startX: number, startY: number, endX: number, endY: number, padding: number = 10) => 
        `box:${startX},${startY},${endX},${endY},${padding}`,
    500
);
