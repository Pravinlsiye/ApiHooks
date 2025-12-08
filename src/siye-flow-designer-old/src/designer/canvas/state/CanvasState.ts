import { VisualBlock, VisualConnection, Position } from '../../VisualModels';
import { Node } from '../../../models/workflow-models';

/**
 * Canvas state interface
 */
export interface CanvasState {
    blocks: Map<string, VisualBlock>;
    connections: Map<string, VisualConnection>;
    blockDataMap: Map<string, Node>;
    
    // Drag state
    isDragging: boolean;
    draggedBlockId: string | null;
    dragOffset: Position;
    
    // Pan state
    isPanning: boolean;
    panStart: Position;
    panMode: boolean;
    
    // Connection state
    isConnecting: boolean;
    connectionStart: { blockId: string, portName: string, position: Position } | null;
    mousePosition: Position;
    
    // Hover state
    hoveredConnection: string | null;
    deleteButtonElement: SVGForeignObjectElement | null;
    
    // Canvas dimensions
    canvasWidth: number;
    canvasHeight: number;
    canvasWrapper: HTMLElement | null;
}
