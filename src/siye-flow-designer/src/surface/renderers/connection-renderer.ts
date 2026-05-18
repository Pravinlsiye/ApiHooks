/**
 * SVG Connection Renderer
 * Renders connections as smooth SVG bezier curves with delete button on hover
 */

import { VisualConnection } from '../../models/visual-models';
import { connectionPathToSVG, getBezierMidpoint, getConnectionBoundingBox } from '../utils/connection-path';
import { createSVGElement, setSVGAttributes } from '../utils/dom-helpers';

export interface ConnectionRenderCallbacks {
    onDelete?: (connectionId: string) => void;
}

export interface PortPositionGetter {
    (blockId: string, portName: string, portType: 'input' | 'output'): { x: number; y: number } | null;
}

/**
 * Render a connection as an SVG element
 */
export function renderConnection(
    connection: VisualConnection,
    getPortPosition: PortPositionGetter,
    callbacks?: ConnectionRenderCallbacks
): SVGSVGElement | null {
    const start = getPortPosition(connection.sourceBlockId, connection.sourcePortName, 'output');
    const end = getPortPosition(connection.targetBlockId, connection.targetPortName, 'input');

    if (!start || !end) return null;

    // Calculate bounding box
    const bbox = getConnectionBoundingBox(start.x, start.y, end.x, end.y);

    // Create SVG container
    const svg = createSVGElement('svg');
    svg.classList.add('connection-line');
    svg.dataset.connectionId = connection.id;
    setSVGAttributes(svg, {
        width: bbox.width,
        height: bbox.height,
        style: `position: absolute; left: ${bbox.minX}px; top: ${bbox.minY}px; overflow: visible; pointer-events: none;`
    });

    // Create path data (adjusted for SVG local coordinates)
    const localStartX = start.x - bbox.minX;
    const localStartY = start.y - bbox.minY;
    const localEndX = end.x - bbox.minX;
    const localEndY = end.y - bbox.minY;

    const pathData = connectionPathToSVG(localStartX, localStartY, localEndX, localEndY);

    // Invisible hit area (thicker for easier clicking)
    const hitPath = createSVGElement('path');
    setSVGAttributes(hitPath, {
        d: pathData,
        stroke: 'transparent',
        'stroke-width': '12',
        fill: 'none',
        'stroke-linecap': 'round',
        style: 'pointer-events: stroke; cursor: pointer;'
    });

    // Visible path
    const visiblePath = createSVGElement('path');
    visiblePath.classList.add('connection-path');
    setSVGAttributes(visiblePath, {
        d: pathData,
        stroke: 'var(--connection-stroke)',
        'stroke-width': '3',
        fill: 'none',
        'stroke-linecap': 'round',
        style: 'pointer-events: none;'
    });

    svg.appendChild(hitPath);
    svg.appendChild(visiblePath);

    // Calculate midpoint for delete button
    const midpoint = getBezierMidpoint(localStartX, localStartY, localEndX, localEndY);

    // Delete button (hidden by default)
    const deleteGroup = createSVGElement('g');
    deleteGroup.classList.add('connection-delete-group');
    deleteGroup.style.opacity = '0';
    deleteGroup.style.pointerEvents = 'none';
    deleteGroup.style.transition = 'opacity 0.15s ease';

    const deleteCircle = createSVGElement('circle');
    setSVGAttributes(deleteCircle, {
        cx: midpoint.x,
        cy: midpoint.y,
        r: '12',
        fill: 'var(--connection-delete-fill)',
        stroke: 'var(--connection-delete-stroke)',
        'stroke-width': '2',
        style: 'cursor: pointer;'
    });

    const deleteText = createSVGElement('text');
    setSVGAttributes(deleteText, {
        x: midpoint.x,
        y: midpoint.y + 5,
        'text-anchor': 'middle',
        fill: 'var(--text-inverse)',
        'font-size': '16',
        'font-weight': 'bold',
        style: 'pointer-events: none; user-select: none;'
    });
    deleteText.textContent = '×';

    deleteGroup.appendChild(deleteCircle);
    deleteGroup.appendChild(deleteText);
    svg.appendChild(deleteGroup);

    // Hover handlers
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    const showDelete = () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        visiblePath.setAttribute('stroke', 'var(--connection-stroke-hover)');
        visiblePath.setAttribute('stroke-width', '4');
        deleteGroup.style.opacity = '1';
        deleteGroup.style.pointerEvents = 'all';
    };

    const hideDelete = () => {
        hideTimeout = setTimeout(() => {
            visiblePath.setAttribute('stroke', 'var(--connection-stroke)');
            visiblePath.setAttribute('stroke-width', '3');
            deleteGroup.style.opacity = '0';
            deleteGroup.style.pointerEvents = 'none';
            hideTimeout = null;
        }, 150);
    };

    hitPath.addEventListener('mouseenter', showDelete);
    hitPath.addEventListener('mouseleave', hideDelete);
    deleteCircle.addEventListener('mouseenter', showDelete);
    deleteCircle.addEventListener('mouseleave', hideDelete);

    // Delete click handler
    if (callbacks?.onDelete) {
        const handleDelete = (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            callbacks.onDelete!(connection.id);
        };
        hitPath.addEventListener('click', handleDelete);
        deleteCircle.addEventListener('click', handleDelete);
    }

    return svg;
}

/**
 * Update connection path (for when blocks move)
 */
export function updateConnection(
    svg: SVGSVGElement,
    connection: VisualConnection,
    getPortPosition: PortPositionGetter
): void {
    const start = getPortPosition(connection.sourceBlockId, connection.sourcePortName, 'output');
    const end = getPortPosition(connection.targetBlockId, connection.targetPortName, 'input');

    if (!start || !end) return;

    // Recalculate bounding box
    const bbox = getConnectionBoundingBox(start.x, start.y, end.x, end.y);

    // Update SVG position and size
    svg.style.left = `${bbox.minX}px`;
    svg.style.top = `${bbox.minY}px`;
    svg.setAttribute('width', String(bbox.width));
    svg.setAttribute('height', String(bbox.height));

    // Recalculate path
    const localStartX = start.x - bbox.minX;
    const localStartY = start.y - bbox.minY;
    const localEndX = end.x - bbox.minX;
    const localEndY = end.y - bbox.minY;

    const pathData = connectionPathToSVG(localStartX, localStartY, localEndX, localEndY);

    // Update paths
    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
        path.setAttribute('d', pathData);
    });

    // Update delete button position
    const midpoint = getBezierMidpoint(localStartX, localStartY, localEndX, localEndY);
    const deleteCircle = svg.querySelector('.connection-delete-group circle');
    const deleteText = svg.querySelector('.connection-delete-group text');

    if (deleteCircle) {
        deleteCircle.setAttribute('cx', String(midpoint.x));
        deleteCircle.setAttribute('cy', String(midpoint.y));
    }
    if (deleteText) {
        deleteText.setAttribute('x', String(midpoint.x));
        deleteText.setAttribute('y', String(midpoint.y + 5));
    }
}

/**
 * Render a preview connection (while dragging)
 */
export function renderPreviewConnection(
    startX: number,
    startY: number,
    endX: number,
    endY: number
): SVGSVGElement {
    const bbox = getConnectionBoundingBox(startX, startY, endX, endY);

    const svg = createSVGElement('svg');
    svg.classList.add('connection-preview');
    setSVGAttributes(svg, {
        width: bbox.width,
        height: bbox.height,
        style: `position: absolute; left: ${bbox.minX}px; top: ${bbox.minY}px; overflow: visible; pointer-events: none;`
    });

    const localStartX = startX - bbox.minX;
    const localStartY = startY - bbox.minY;
    const localEndX = endX - bbox.minX;
    const localEndY = endY - bbox.minY;

    const pathData = connectionPathToSVG(localStartX, localStartY, localEndX, localEndY);

    const path = createSVGElement('path');
    setSVGAttributes(path, {
        d: pathData,
        stroke: 'var(--connection-stroke-hover)',
        'stroke-width': '3',
        'stroke-dasharray': '8,4',
        fill: 'none',
        'stroke-linecap': 'round',
        opacity: '0.7'
    });

    svg.appendChild(path);
    return svg;
}

/**
 * Update preview connection position
 */
export function updatePreviewConnection(
    svg: SVGSVGElement,
    startX: number,
    startY: number,
    endX: number,
    endY: number
): void {
    const bbox = getConnectionBoundingBox(startX, startY, endX, endY);

    svg.style.left = `${bbox.minX}px`;
    svg.style.top = `${bbox.minY}px`;
    svg.setAttribute('width', String(bbox.width));
    svg.setAttribute('height', String(bbox.height));

    const localStartX = startX - bbox.minX;
    const localStartY = startY - bbox.minY;
    const localEndX = endX - bbox.minX;
    const localEndY = endY - bbox.minY;

    const pathData = connectionPathToSVG(localStartX, localStartY, localEndX, localEndY);

    const path = svg.querySelector('path');
    if (path) {
        path.setAttribute('d', pathData);
    }
}

