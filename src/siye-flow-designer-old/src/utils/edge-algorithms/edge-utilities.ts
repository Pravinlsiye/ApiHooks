/**
 * Edge management utilities for edge validation, z-index management, and visibility
 */

export interface Transform {
  x: number;
  y: number;
  zoom: number;
}

export interface Box {
  x: number;
  y: number;
  x2: number;
  y2: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NodeBase {
  id: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  selected?: boolean;
  parentId?: string;
  zIndex?: number;
}

export interface Connection {
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
}

export interface Edge extends Connection {
  id: string;
  selected?: boolean;
  zIndex?: number;
}

/**
 * Convert node to bounding box
 */
export function nodeToBox(node: NodeBase): Box {
  return {
    x: node.position.x,
    y: node.position.y,
    x2: node.position.x + (node.width || 0),
    y2: node.position.y + (node.height || 0),
  };
}

/**
 * Convert box to rect
 */
export function boxToRect(box: Box): Rect {
  return {
    x: box.x,
    y: box.y,
    width: box.x2 - box.x,
    height: box.y2 - box.y,
  };
}

/**
 * Get bounds of multiple boxes
 */
export function getBoundsOfBoxes(box1: Box, box2: Box): Box {
  return {
    x: Math.min(box1.x, box2.x),
    y: Math.min(box1.y, box2.y),
    x2: Math.max(box1.x2, box2.x2),
    y2: Math.max(box1.y2, box2.y2),
  };
}

/**
 * Calculate overlapping area between two rectangles
 */
export function getOverlappingArea(rect1: Rect, rect2: Rect): number {
  const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
  const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
  
  return xOverlap * yOverlap;
}

/**
 * Returns the z-index for an edge based on the nodes it connects
 * Edges connected to nodes with parents are rendered above the parent node
 */
export function getElevatedEdgeZIndex({
  sourceNode,
  targetNode,
  selected = false,
  zIndex,
  elevateOnSelect = false,
}: {
  sourceNode: NodeBase;
  targetNode: NodeBase;
  selected?: boolean;
  zIndex?: number;
  elevateOnSelect?: boolean;
}): number {
  if (zIndex !== undefined) {
    return zIndex;
  }
  
  const edgeZ = elevateOnSelect && selected ? 1000 : 0;
  const nodeZ = Math.max(
    sourceNode.parentId || (elevateOnSelect && sourceNode.selected) ? sourceNode.zIndex || 0 : 0,
    targetNode.parentId || (elevateOnSelect && targetNode.selected) ? targetNode.zIndex || 0 : 0
  );

  return edgeZ + nodeZ;
}

/**
 * Check if edge is visible in viewport
 */
export function isEdgeVisible({
  sourceNode,
  targetNode,
  width,
  height,
  transform,
}: {
  sourceNode: NodeBase;
  targetNode: NodeBase;
  width: number;
  height: number;
  transform: Transform;
}): boolean {
  const edgeBox = getBoundsOfBoxes(nodeToBox(sourceNode), nodeToBox(targetNode));

  // Ensure box has some area
  if (edgeBox.x === edgeBox.x2) {
    edgeBox.x2 += 1;
  }
  if (edgeBox.y === edgeBox.y2) {
    edgeBox.y2 += 1;
  }

  const viewRect = {
    x: -transform.x / transform.zoom,
    y: -transform.y / transform.zoom,
    width: width / transform.zoom,
    height: height / transform.zoom,
  };

  return getOverlappingArea(viewRect, boxToRect(edgeBox)) > 0;
}

/**
 * Generate edge ID from connection
 */
export function getEdgeId({ source, sourceHandle, target, targetHandle }: Connection): string {
  return `xy-edge__${source}${sourceHandle || ''}-${target}${targetHandle || ''}`;
}

/**
 * Check if connection already exists
 */
export function connectionExists(edge: Edge, edges: Edge[]): boolean {
  return edges.some(
    (el) =>
      el.source === edge.source &&
      el.target === edge.target &&
      (el.sourceHandle === edge.sourceHandle || (!el.sourceHandle && !edge.sourceHandle)) &&
      (el.targetHandle === edge.targetHandle || (!el.targetHandle && !edge.targetHandle))
  );
}

/**
 * Add edge to array with validation
 */
export function addEdge<T extends Edge>(
  edgeParams: T | Connection,
  edges: T[]
): T[] {
  if (!edgeParams.source || !edgeParams.target) {
    console.warn('Cannot add edge: source or target is missing');
    return edges;
  }

  let edge: T;
  if ('id' in edgeParams) {
    edge = { ...edgeParams } as T;
  } else {
    edge = {
      ...edgeParams,
      id: getEdgeId(edgeParams),
    } as T;
  }

  if (connectionExists(edge, edges)) {
    console.warn('Edge already exists');
    return edges;
  }

  // Clean up null handles
  if (edge.sourceHandle === null) {
    delete edge.sourceHandle;
  }
  if (edge.targetHandle === null) {
    delete edge.targetHandle;
  }

  return edges.concat(edge);
}

/**
 * Update existing edge with new connection
 */
export function reconnectEdge<T extends Edge>(
  oldEdge: T,
  newConnection: Connection,
  edges: T[],
  shouldReplaceId = true
): T[] {
  const { id: oldEdgeId, ...rest } = oldEdge;

  if (!newConnection.source || !newConnection.target) {
    console.warn('Cannot reconnect edge: source or target is missing');
    return edges;
  }

  const foundEdge = edges.find((e) => e.id === oldEdge.id);
  if (!foundEdge) {
    console.warn(`Edge with id ${oldEdgeId} not found`);
    return edges;
  }

  const edge = {
    ...rest,
    id: shouldReplaceId ? getEdgeId(newConnection) : oldEdgeId,
    source: newConnection.source,
    target: newConnection.target,
    sourceHandle: newConnection.sourceHandle,
    targetHandle: newConnection.targetHandle,
  } as T;

  return edges.filter((e) => e.id !== oldEdgeId).concat(edge);
}

/**
 * Get distance to edge (for hit detection)
 * Returns distance from point to line segment
 */
export function getDistanceToEdge(
  point: { x: number; y: number },
  edgeStart: { x: number; y: number },
  edgeEnd: { x: number; y: number }
): number {
  const A = point.x - edgeStart.x;
  const B = point.y - edgeStart.y;
  const C = edgeEnd.x - edgeStart.x;
  const D = edgeEnd.y - edgeStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = edgeStart.x;
    yy = edgeStart.y;
  } else if (param > 1) {
    xx = edgeEnd.x;
    yy = edgeEnd.y;
  } else {
    xx = edgeStart.x + param * C;
    yy = edgeStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

