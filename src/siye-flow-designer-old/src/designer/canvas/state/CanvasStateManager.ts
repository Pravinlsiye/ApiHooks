import { SimpleEventEmitter } from '../../VisualModels';
import { VisualBlock, VisualConnection, Position } from '../../VisualModels';
import { Node } from '../../../models/workflow-models';
import { CanvasState } from './CanvasState';
import { ReactiveState } from '../../../utils/ReactiveState';

/**
 * Manages canvas state using ReactiveState for automatic render triggers
 * State changes automatically trigger subscribed render callbacks
 */
export class CanvasStateManager extends SimpleEventEmitter {
    private reactiveState: ReactiveState<CanvasState>;
    
    constructor() {
        super();
        const initialState: CanvasState = {
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
            canvasWidth: 8000, // Dynamic canvas - will be updated based on content
            canvasHeight: 8000, // Dynamic canvas - will be updated based on content
            canvasWrapper: null
        };
        
        this.reactiveState = new ReactiveState(initialState);
        
        // Forward stateChanged events from ReactiveState
        this.reactiveState.on('stateChanged', (data: { oldState: CanvasState; newState: CanvasState }) => {
            this.emit('stateChanged', data);
        });
    }
    
    /**
     * Get current state
     */
    getState(): CanvasState {
        return this.reactiveState.getState();
    }
    
    /**
     * Subscribe to state changes for automatic rendering
     * @param callback Render callback function
     * @returns Unsubscribe function
     */
    subscribe(callback: () => void): () => void {
        return this.reactiveState.subscribe(callback);
    }
    
    getBlocks(): Map<string, VisualBlock> {
        return this.reactiveState.getState().blocks;
    }
    
    getConnections(): Map<string, VisualConnection> {
        return this.reactiveState.getState().connections;
    }
    
    getBlockDataMap(): Map<string, Node> {
        return this.reactiveState.getState().blockDataMap;
    }
    
    setBlocks(blocks: Map<string, VisualBlock>): void {
        this.reactiveState.setState({ blocks } as Partial<CanvasState>);
    }
    
    setConnections(connections: Map<string, VisualConnection>): void {
        this.reactiveState.setState({ connections } as Partial<CanvasState>);
    }
    
    setBlockDataMap(blockDataMap: Map<string, Node>): void {
        this.reactiveState.setState({ blockDataMap } as Partial<CanvasState>);
    }
    
    setDragging(isDragging: boolean, blockId: string | null = null, offset: Position = { x: 0, y: 0 }): void {
        this.reactiveState.batchUpdate(() => {
            this.reactiveState.setState({
                isDragging,
                draggedBlockId: blockId,
                dragOffset: offset
            } as Partial<CanvasState>);
        });
    }
    
    setPanning(isPanning: boolean, panStart: Position = { x: 0, y: 0 }): void {
        this.reactiveState.batchUpdate(() => {
            this.reactiveState.setState({
                isPanning,
                panStart
            } as Partial<CanvasState>);
        });
    }
    
    setPanMode(panMode: boolean): void {
        this.reactiveState.setState({ panMode } as Partial<CanvasState>);
    }
    
    setConnecting(isConnecting: boolean, connectionStart: { blockId: string, portName: string, position: Position } | null = null): void {
        this.reactiveState.batchUpdate(() => {
            this.reactiveState.setState({
                isConnecting,
                connectionStart
            } as Partial<CanvasState>);
        });
    }
    
    setMousePosition(position: Position): void {
        this.reactiveState.setState({ mousePosition: position } as Partial<CanvasState>);
    }
    
    setHoveredConnection(connectionId: string | null): void {
        this.reactiveState.setState({ hoveredConnection: connectionId } as Partial<CanvasState>);
    }
    
    setDeleteButtonElement(element: SVGForeignObjectElement | null): void {
        this.reactiveState.setState({ deleteButtonElement: element } as Partial<CanvasState>);
    }
    
    setCanvasSize(width: number, height: number): void {
        this.reactiveState.batchUpdate(() => {
            this.reactiveState.setState({
                canvasWidth: width,
                canvasHeight: height
            } as Partial<CanvasState>);
        });
    }
    
    setCanvasWrapper(wrapper: HTMLElement | null): void {
        this.reactiveState.setState({ canvasWrapper: wrapper } as Partial<CanvasState>);
    }
    
    /**
     * Batch multiple state updates for performance
     * @param updateFn Function containing multiple state updates
     */
    batchUpdate(updateFn: () => void): void {
        this.reactiveState.batchUpdate(updateFn);
    }
}
