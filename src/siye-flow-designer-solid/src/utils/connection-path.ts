/**
 * Connection path math — standalone (no DOMDiff dependency).
 */

export interface PathPoint { x: number; y: number; }

const STRAIGHT = 60;

export function connectionPathToSVG(sx: number, sy: number, ex: number, ey: number): string {
    const ox = sx + STRAIGHT;
    const ix = ex - STRAIGHT;
    const gap = ix - ox;
    const cd = Math.min(Math.abs(gap) / 2, 80);
    return `M ${sx} ${sy} L ${ox} ${sy} C ${ox + cd} ${sy}, ${ix - cd} ${ey}, ${ix} ${ey} L ${ex} ${ey}`;
}

export function getBezierMidpoint(sx: number, sy: number, ex: number, ey: number): PathPoint {
    const ox = sx + STRAIGHT;
    const ix = ex - STRAIGHT;
    const gap = ix - ox;
    const cd = Math.min(Math.abs(gap) / 2, 80);
    const cp1x = ox + cd, cp2x = ix - cd;
    const t = 0.5;
    return {
        x: (1-t)**3*ox + 3*(1-t)**2*t*cp1x + 3*(1-t)*t**2*cp2x + t**3*ix,
        y: (1-t)**3*sy + 3*(1-t)**2*t*sy   + 3*(1-t)*t**2*ey   + t**3*ey,
    };
}
