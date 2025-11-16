/**
 * Edge algorithm utilities for flow designer connections
 */

export * from './connection-path';
export * from './smoothstep';
export * from './edge-utilities';

// Re-export commonly used functions for convenience
export { connectionPathToHTMLSegments, Position } from './connection-path';
export { getSmoothStepPath, smoothStepToHTMLSegments, getEdgeCenter } from './smoothstep';
export { 
  addEdge, 
  reconnectEdge, 
  isEdgeVisible, 
  getElevatedEdgeZIndex,
  getDistanceToEdge 
} from './edge-utilities';

