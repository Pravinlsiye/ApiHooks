import { SimpleEventEmitter } from '../../VisualModels';
import { VisualBlock, VisualConnection, Position } from '../../VisualModels';
import { AnyWorkflowBlock } from '../../../models/workflow-models';
import { CanvasState } from './CanvasState';

/**
 * Manages canvas state and emits events when state changes
 */
export class CanvasStateManager extends SimpleEventEmitter {
    private state: CanvasState;
    
    constructor() {
        super();
        this.state = {
            blocks: new Map(),
            connections: new Map(),
            blockDataMap: new Map(),
            isDragging: false,
            draggedBlockId: null,
            dragOffset: { x: 0, y: 0 },
            isPanning: false,
            panStart: { x: 0, y: 0 },
            panMode: false,
            isConnecting: false,
            connectionStart: null,
            mousePosition: { x: 0, y: 0 },
            hoveredConnection: null,
            deleteButtonElement: null,
            canvasWidth: 4000,
            canvasHeight: 4000,
            canvasWrapper: null
        };
    }
    
    getState(): CanvasState {
        return this.state;
    }
    
    getBlocks(): Map<string, VisualBlock> {
        return this.state.blocks;
    }
    
    getConnections(): Map<string, VisualConnection> {
        return this.state.connections;
    }
    
    getBlockDataMap(): Map<string, AnyWorkflowBlock> {
        return this.state.blockDataMap;
    }
    
    setBlocks(blocks: Map<string, VisualBlock>): void {
        this.state.blocks = blocks;
        this.emit('stateChanged', { type: 'blocksUpdated' });
    }
    
    setConnections(connections: Map<string, VisualConnection>): void {
        this.state.connections = connections;
        this.emit('stateChanged', { type: 'connectionsUpdated' });
    }
    
    setBlockDataMap(blockDataMap: Map<string, AnyWorkflowBlock>): void {
        this.state.blockDataMap = blockDataMap;
        this.emit('stateChanged', { type: 'blockDataUpdated' });
    }
    
    setDragging(isDragging: boolean, blockId: string | null = null, offset: Position = { x: 0, y: 0 }): void {
        this.state.isDragging = isDragging;
        this.state.draggedBlockId = blockId;
        this.state.dragOffset = offset;
        this.emit('stateChanged', { type: 'draggingChanged', isDragging, blockId });
    }
    
    setPanning(isPanning: boolean, panStart: Position = { x: 0, y: 0 }): void {
        this.state.isPanning = isPanning;
        this.state.panStart = panStart;
        this.emit('stateChanged', { type: 'panningChanged', isPanning });
    }
    
    setPanMode(panMode: boolean): void {
        this.state.panMode = panMode;
        this.emit('stateChanged', { type: 'panModeChanged', panMode });
    }
    
    setConnecting(isConnecting: boolean, connectionStart: { blockId: string, portName: string, position: Position } | null = null): void {
        this.state.isConnecting = isConnecting;
        this.state.connectionStart = connectionStart;
        this.emit('stateChanged', { type: 'connectingChanged', isConnecting });
    }
    
    setMousePosition(position: Position): void {
        this.state.mousePosition = position;
    }
    
    setHoveredConnection(connectionId: string | null): void {
        this.state.hoveredConnection = connectionId;
        this.emit('stateChanged', { type: 'hoverChanged', connectionId });
    }
    
    setDeleteButtonElement(element: SVGForeignObjectElement | null): void {
        this.state.deleteButtonElement = element;
    }
    
    setCanvasSize(width: number, height: number): void {
        this.state.canvasWidth = width;
        this.state.canvasHeight = height;
        this.emit('stateChanged', { type: 'canvasSizeChanged', width, height });
    }
    
    setCanvasWrapper(wrapper: HTMLElement | null): void {
        this.state.canvasWrapper = wrapper;
    }
}

