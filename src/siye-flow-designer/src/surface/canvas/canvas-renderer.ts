/**
 * Canvas Renderer
 * Manages the workflow canvas with HTML blocks and SVG connections.
 * Interaction parity targets common node-editor expectations (Drawflow-style):
 * hand/pointer tools, middle-mouse pan, Ctrl+wheel zoom, pointer events for touch.
 */

import { BaseComponent } from '../utils/base-component';
import { VisualBlock, VisualConnection, Position } from '../../models/visual-models';
import {
    renderBlock,
    updateBlockPosition,
    updateBlockSelection,
    getPortPosition,
    BlockRenderCallbacks
} from '../renderers/block-renderer';
import {
    renderConnection,
    updateConnection,
    renderPreviewConnection,
    updatePreviewConnection,
    PortPositionGetter
} from '../renderers/connection-renderer';
import { DOMUpdater } from '../utils/dom-updater';
import { DOMDiff } from '../utils/dom-diff';

interface DragState {
    isDragging: boolean;
    blockId: string | null;
    offset: Position;
}

interface ConnectionCreationState {
    isCreating: boolean;
    sourceBlockId: string | null;
    sourcePortName: string | null;
    startPosition: Position | null;
    previewElement: SVGSVGElement | null;
}

interface PanState {
    isPanning: boolean;
    start: Position;
    offset: Position;
}

export class CanvasRenderer extends BaseComponent {
    private canvasWrapper!: HTMLElement;
    private canvasLayer!: HTMLElement;
    private blockToolbar!: HTMLElement;

    private blocks: Map<string, VisualBlock> = new Map();
    private connections: Map<string, VisualConnection> = new Map();
    private blockElements: Map<string, HTMLElement> = new Map();
    private connectionElements: Map<string, SVGSVGElement> = new Map();

    private dragState: DragState = { isDragging: false, blockId: null, offset: { x: 0, y: 0 } };
    private connectionState: ConnectionCreationState = {
        isCreating: false,
        sourceBlockId: null,
        sourcePortName: null,
        startPosition: null,
        previewElement: null
    };
    private panState: PanState = { isPanning: false, start: { x: 0, y: 0 }, offset: { x: 0, y: 0 } };
    private selectedBlockId: string | null = null;
    private runtimeVariables: Record<string, any> | null = null;

    constructor(containerId: string) {
        super(containerId);
        this.setupCanvas();
        this.setupBlockToolbar();
        this.setupEventListeners();
    }

    private setupCanvas(): void {
        this.container.innerHTML = `
            <div class="canvas-wrapper">
                <div class="canvas-layer" id="canvas-layer"></div>
            </div>
        `;

        this.canvasWrapper = this.container.querySelector('.canvas-wrapper')!;
        this.canvasLayer = this.container.querySelector('#canvas-layer')!;
    }

    private setupBlockToolbar(): void {
        this.blockToolbar = DOMUpdater.create('div', {
            className: 'block-toolbar',
            styles: { display: 'none' },
            html: `
                <button class="block-toolbar-btn" data-action="settings" title="Settings">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
                        <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
                    </svg>
                </button>
                <button class="block-toolbar-btn" data-action="duplicate" title="Duplicate (Ctrl+D)">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                    </svg>
                </button>
                <button class="block-toolbar-btn block-toolbar-btn-danger" data-action="delete" title="Delete (Del)">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                </button>
            `
        });
        this.canvasWrapper.appendChild(this.blockToolbar);

        // Setup toolbar button handlers using DOMUpdater.queryAll
        DOMUpdater.queryAll<HTMLButtonElement>(this.blockToolbar, '.block-toolbar-btn').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                if (this.selectedBlockId && action) {
                    this.handleToolbarAction(action, this.selectedBlockId);
                }
            });
        });
    }

    private handleToolbarAction(action: string, blockId: string): void {
        switch (action) {
            case 'settings':
                this.emit('blockSettings', { blockId });
                break;
            case 'duplicate':
                this.emit('blockDuplicate', { blockId });
                break;
            case 'delete':
                this.deleteBlock(blockId);
                break;
        }
    }

    private updateBlockToolbarPosition(): void {
        if (!this.selectedBlockId) {
            DOMUpdater.updateElement(this.blockToolbar, { styles: { display: 'none' } });
            return;
        }

        const blockElement = this.blockElements.get(this.selectedBlockId);
        if (!blockElement) {
            DOMUpdater.updateElement(this.blockToolbar, { styles: { display: 'none' } });
            return;
        }

        const block = this.blocks.get(this.selectedBlockId);
        if (!block) {
            DOMUpdater.updateElement(this.blockToolbar, { styles: { display: 'none' } });
            return;
        }

        // The toolbar lives in canvas-wrapper (sibling of canvas-layer).
        // canvas-layer is scaled from its center (4000, 4000) with scale(currentZoom).
        // To place the toolbar over the correct visual position, convert from
        // canvas-layer space to canvas-wrapper space:
        //   wrapperX = 4000 + (layerX - 4000) * zoom
        const toolbarHeight = 36;
        const gap = 8;
        const canvasCenter = 4000;

        const blockCenterX = block.position.x + (block.width || 200) / 2;
        const blockTopY    = block.position.y;

        const x = canvasCenter + (blockCenterX - canvasCenter) * this.currentZoom;
        const y = canvasCenter + (blockTopY    - canvasCenter) * this.currentZoom - toolbarHeight - gap;

        // No scale() needed: the toolbar is not inside canvas-layer so zoom doesn't affect it.
        DOMUpdater.updateElement(this.blockToolbar, {
            styles: {
                display: 'flex',
                left: `${x}px`,
                top: `${y}px`,
                transformOrigin: 'top center',
                transform: 'translateX(-50%)'
            }
        });
    }

    private setupEventListeners(): void {
        const throttledPointerMove = DOMDiff.throttle((e: PointerEvent) => this.handlePointerMove(e), 16);

        this.addEventListener(document, 'pointermove', throttledPointerMove as EventListener);
        this.addEventListener(document, 'pointerup', (e) => this.handlePointerUp(e as PointerEvent));
        this.addEventListener(document, 'pointercancel', (e) => this.handlePointerUp(e as PointerEvent));
        this.addEventListener(this.canvasWrapper, 'pointerdown', (e) => this.handleCanvasPointerDown(e as PointerEvent));
        this.addEventListener(this.canvasWrapper, 'wheel', (e) => this.handleCanvasWheel(e as WheelEvent), { passive: false });
        this.addEventListener(this.canvasWrapper, 'auxclick', (e) => {
            if ((e as MouseEvent).button === 1) {
                e.preventDefault();
            }
        });

        // Prevent text selection during drag/connection operations
        this.addEventListener(this.canvasWrapper, 'selectstart', (e) => {
            if (this.dragState.isDragging || this.connectionState.isCreating || this.panState.isPanning) {
                e.preventDefault();
            }
        });

        // Prevent context menu during operations
        this.addEventListener(this.canvasWrapper, 'contextmenu', (e) => {
            if (this.connectionState.isCreating) {
                e.preventDefault();
            }
        });
        
        // Keyboard handlers
        this.addEventListener(document, 'keydown', (e) => {
            const keyEvent = e as KeyboardEvent;
            // Only handle if canvas is focused (not when typing in inputs)
            const target = keyEvent.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                return;
            }

            if (keyEvent.key === 'Escape' && this.connectionState.isCreating) {
                keyEvent.preventDefault();
                this.cancelConnectionCreation();
                return;
            }
            
            // Delete: Delete or Backspace
            if ((keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') && this.selectedBlockId) {
                keyEvent.preventDefault();
                this.deleteBlock(this.selectedBlockId);
            }
            
            // Duplicate: Ctrl+D
            if (keyEvent.key === 'd' && (keyEvent.ctrlKey || keyEvent.metaKey) && this.selectedBlockId) {
                keyEvent.preventDefault();
                this.emit('blockDuplicate', { blockId: this.selectedBlockId });
            }
            
            // Deselect: Escape
            if (keyEvent.key === 'Escape' && this.selectedBlockId) {
                this.selectBlock(null);
            }
        });

        this.setTool('hand');
    }

    /**
     * Render all blocks and connections
     */
    render(blocks: Map<string, VisualBlock>, connections: Map<string, VisualConnection>): void {
        this.blocks = blocks;
        this.connections = connections;

        // Clear existing elements
        this.canvasLayer.innerHTML = '';
        this.blockElements.clear();
        this.connectionElements.clear();

        // Render blocks first (connections need block elements for port positions)
        blocks.forEach((block, id) => {
            const element = this.renderBlockElement(block);
            this.canvasLayer.appendChild(element);
            this.blockElements.set(id, element);
        });

        // Defer connection rendering until after browser layout pass,
        // so getBoundingClientRect() returns accurate port positions
        requestAnimationFrame(() => {
            const firstBlock = this.canvasLayer.firstChild;
            connections.forEach((connection, id) => {
                const element = this.renderConnectionElement(connection);
                if (element) {
                    if (firstBlock) {
                        this.canvasLayer.insertBefore(element, firstBlock);
                    } else {
                        this.canvasLayer.appendChild(element);
                    }
                    this.connectionElements.set(id, element);
                }
            });
        });
    }

    private renderBlockElement(block: VisualBlock): HTMLElement {
        const callbacks: BlockRenderCallbacks = {
            onBlockMouseDown: (blockId, event) => this.handleBlockPointerDown(blockId, event),
            onPortMouseDown: (blockId, portName, portType, event) => {
                if (portType === 'output') {
                    this.startConnectionCreation(blockId, portName, event);
                }
            },
            onPortMouseUp: (blockId, portName, portType, _event) => {
                if (portType === 'input') {
                    this.completeConnectionCreation(blockId, portName);
                }
            },
            onFieldChange: (blockId, fieldName, value) => {
                this.emit('fieldChange', { blockId, fieldName, value });
            },
            onDelete: (blockId) => {
                this.deleteBlock(blockId);
            },
            onBreakpointToggle: (blockId) => {
                this.emit('breakpointToggle', { blockId });
            }
        };

        return renderBlock(block, callbacks, this.runtimeVariables);
    }
    
    /**
     * Delete a block and its connections
     */
    private deleteBlock(blockId: string): void {
        // Remove all connections involving this block
        const connectionsToRemove: string[] = [];
        this.connections.forEach((conn, connId) => {
            if (conn.sourceBlockId === blockId || conn.targetBlockId === blockId) {
                connectionsToRemove.push(connId);
            }
        });
        
        connectionsToRemove.forEach(connId => {
            this.removeConnection(connId);
        });
        
        // Remove the block
        this.removeBlock(blockId);
        
        // Clear selection and hide toolbar if this was the selected block
        if (this.selectedBlockId === blockId) {
            this.selectedBlockId = null;
            this.blockToolbar.style.display = 'none';
        }
        
        // Emit deletion event
        this.emit('blockDelete', { blockId });
    }

    private renderConnectionElement(connection: VisualConnection): SVGSVGElement | null {
        const getPosition: PortPositionGetter = (blockId, portName, portType) => {
            const blockEl = this.blockElements.get(blockId);
            if (!blockEl) return null;
            return getPortPosition(blockEl, portName, portType, this.canvasWrapper);
        };

        return renderConnection(connection, getPosition, {
            onDelete: (connectionId) => {
                this.emit('connectionDelete', { connectionId });
            }
        });
    }

    private handleBlockPointerDown(blockId: string, event: PointerEvent): void {
        event.stopPropagation();

        const block = this.blocks.get(blockId);
        const blockEl = this.blockElements.get(blockId);
        if (!block || !blockEl) return;

        try {
            blockEl.setPointerCapture(event.pointerId);
        } catch {
            /* ignore if capture unsupported */
        }

        const rect = blockEl.getBoundingClientRect();

        this.dragState = {
            isDragging: true,
            blockId: blockId,
            offset: {
                x: (event.clientX - rect.left) / this.currentZoom,
                y: (event.clientY - rect.top)  / this.currentZoom
            }
        };

        // Select block
        this.selectBlock(blockId);

        // Update selection visually
        this.blockElements.forEach((el, id) => {
            updateBlockSelection(el, id === blockId);
        });
    }

    private handlePointerMove(event: PointerEvent): void {
        if (this.panState.isPanning) {
            this.handlePanning(event);
        } else if (this.dragState.isDragging && this.dragState.blockId) {
            this.handleBlockDrag(event);
        } else if (this.connectionState.isCreating) {
            this.handleConnectionPreview(event);
        }
    }

    private handleBlockDrag(event: PointerEvent): void {
        const blockId = this.dragState.blockId!;
        const block = this.blocks.get(blockId);
        const blockEl = this.blockElements.get(blockId);
        if (!block || !blockEl) return;

        const wrapperRect = this.canvasWrapper.getBoundingClientRect();
        const newX = (event.clientX - wrapperRect.left - this.dragState.offset.x) / this.currentZoom;
        const newY = (event.clientY - wrapperRect.top  - this.dragState.offset.y) / this.currentZoom;

        // Update block position
        block.position.x = newX;
        block.position.y = newY;
        updateBlockPosition(blockEl, newX, newY);

        // Update connected connections
        this.updateConnectionsForBlock(blockId);

        // Update toolbar position if this is the selected block
        if (this.selectedBlockId === blockId) {
            this.updateBlockToolbarPosition();
        }

        // Emit move event
        this.emit('blockMove', { blockId, position: { x: newX, y: newY } });
    }

    private handlePanning(event: PointerEvent): void {
        const deltaX = event.clientX - this.panState.start.x;
        const deltaY = event.clientY - this.panState.start.y;

        this.panState.offset.x += deltaX;
        this.panState.offset.y += deltaY;
        this.panState.start.x = event.clientX;
        this.panState.start.y = event.clientY;

        this.canvasWrapper.style.transform = `translate(calc(-50% + ${this.panState.offset.x}px), calc(-50% + ${this.panState.offset.y}px))`;
        this.emit('panChange', { offset: { ...this.panState.offset } });
    }

    private handlePointerUp(_event: PointerEvent): void {
        if (this.panState.isPanning) {
            this.panState.isPanning = false;
            this.canvasWrapper.classList.remove('panning');
        }

        if (this.dragState.isDragging) {
            this.dragState.isDragging = false;
            this.dragState.blockId = null;
        }

        if (this.connectionState.isCreating) {
            this.cancelConnectionCreation();
        }
    }

    private handleCanvasPointerDown(event: PointerEvent): void {
        const target = event.target as HTMLElement;

        if (target.closest('.block-toolbar')) {
            return;
        }

        const onBlockChrome =
            target.closest('.workflow-block') ||
            target.closest('.port-tab') ||
            target.closest('.connection-line');

        if (event.button === 1) {
            if (!this.canvasWrapper.contains(target)) return;
            event.preventDefault();
            this.panState.isPanning = true;
            this.panState.start.x = event.clientX;
            this.panState.start.y = event.clientY;
            this.canvasWrapper.classList.add('panning');
            return;
        }

        if (event.button !== 0) {
            return;
        }

        if (onBlockChrome) {
            return;
        }

        if (this.selectedBlockId) {
            this.selectBlock(null);
        }

        if (this.currentTool === 'hand') {
            event.preventDefault();
            this.panState.isPanning = true;
            this.panState.start.x = event.clientX;
            this.panState.start.y = event.clientY;
            this.canvasWrapper.classList.add('panning');
        }
    }

    private handleCanvasWheel(event: WheelEvent): void {
        if (!event.ctrlKey && !event.metaKey) {
            return;
        }
        event.preventDefault();
        const delta = event.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        this.setZoom(this.currentZoom + delta);
    }

    private startConnectionCreation(blockId: string, portName: string, event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault(); // Prevent text selection

        const blockEl = this.blockElements.get(blockId);
        if (!blockEl) return;

        const portPos = getPortPosition(blockEl, portName, 'output', this.canvasWrapper);
        if (!portPos) return;

        this.connectionState = {
            isCreating: true,
            sourceBlockId: blockId,
            sourcePortName: portName,
            startPosition: portPos,
            previewElement: null
        };

        // Add connecting class for cursor change
        this.canvasWrapper.classList.add('connecting');

        // Create preview element
        const wrapperRect = this.canvasWrapper.getBoundingClientRect();
        const endX = event.clientX - wrapperRect.left;
        const endY = event.clientY - wrapperRect.top;

        const preview = renderPreviewConnection(portPos.x, portPos.y, endX, endY);
        this.canvasLayer.insertBefore(preview, this.canvasLayer.firstChild);
        this.connectionState.previewElement = preview;
    }

    private handleConnectionPreview(event: PointerEvent): void {
        if (!this.connectionState.previewElement || !this.connectionState.startPosition) return;

        const wrapperRect = this.canvasWrapper.getBoundingClientRect();
        const endX = event.clientX - wrapperRect.left;
        const endY = event.clientY - wrapperRect.top;

        updatePreviewConnection(
            this.connectionState.previewElement,
            this.connectionState.startPosition.x,
            this.connectionState.startPosition.y,
            endX,
            endY
        );
    }

    private completeConnectionCreation(targetBlockId: string, targetPortName: string): void {
        if (!this.connectionState.isCreating ||
            !this.connectionState.sourceBlockId ||
            !this.connectionState.sourcePortName) {
            return;
        }

        // Can't connect to same block
        if (this.connectionState.sourceBlockId === targetBlockId) {
            this.cancelConnectionCreation();
            return;
        }

        // Emit connection create event
        this.emit('connectionCreate', {
            sourceBlockId: this.connectionState.sourceBlockId,
            sourcePortName: this.connectionState.sourcePortName,
            targetBlockId: targetBlockId,
            targetPortName: targetPortName
        });

        this.cancelConnectionCreation();
    }

    private cancelConnectionCreation(): void {
        if (this.connectionState.previewElement) {
            this.connectionState.previewElement.remove();
        }

        // Remove connecting class
        this.canvasWrapper.classList.remove('connecting');

        this.connectionState = {
            isCreating: false,
            sourceBlockId: null,
            sourcePortName: null,
            startPosition: null,
            previewElement: null
        };
    }

    private updateConnectionsForBlock(blockId: string): void {
        this.connections.forEach((connection, connectionId) => {
            if (connection.sourceBlockId === blockId || connection.targetBlockId === blockId) {
                const element = this.connectionElements.get(connectionId);
                if (element) {
                    const getPosition: PortPositionGetter = (bId, portName, portType) => {
                        const blockEl = this.blockElements.get(bId);
                        if (!blockEl) return null;
                        return getPortPosition(blockEl, portName, portType, this.canvasWrapper);
                    };
                    updateConnection(element, connection, getPosition);
                }
            }
        });
    }

    /**
     * Add a block to the canvas
     */
    addBlock(block: VisualBlock): void {
        this.blocks.set(block.id, block);
        const element = this.renderBlockElement(block);
        this.canvasLayer.appendChild(element);
        this.blockElements.set(block.id, element);
    }

    /**
     * Replace a block in-place — preserves DOM position/z-order and selection state.
     * Connections are unaffected because they reference block IDs, not DOM elements.
     */
    replaceBlock(block: VisualBlock): void {
        const oldEl = this.blockElements.get(block.id);
        if (!oldEl) { this.addBlock(block); return; }

        const wasSelected = oldEl.classList.contains('selected');
        const hadBreakpoint = oldEl.classList.contains('has-breakpoint');

        this.blocks.set(block.id, block);
        const newEl = this.renderBlockElement(block);

        if (wasSelected) newEl.classList.add('selected');
        if (hadBreakpoint) newEl.classList.add('has-breakpoint');

        oldEl.replaceWith(newEl);
        this.blockElements.set(block.id, newEl);

        // Toolbar repositioning after layout
        if (this.selectedBlockId === block.id) {
            this.updateBlockToolbarPosition();
        }
    }

    /**
     * Remove a block from the canvas
     */
    removeBlock(blockId: string): void {
        const element = this.blockElements.get(blockId);
        if (element) {
            element.remove();
            this.blockElements.delete(blockId);
        }
        this.blocks.delete(blockId);
    }

    /**
     * Add a connection to the canvas
     */
    addConnection(connection: VisualConnection): void {
        this.connections.set(connection.id, connection);
        const element = this.renderConnectionElement(connection);
        if (element) {
            // Insert at beginning so it's behind blocks
            this.canvasLayer.insertBefore(element, this.canvasLayer.firstChild);
            this.connectionElements.set(connection.id, element);
        }
    }

    /**
     * Remove a connection from the canvas
     */
    removeConnection(connectionId: string): void {
        const element = this.connectionElements.get(connectionId);
        if (element) {
            element.remove();
            this.connectionElements.delete(connectionId);
        }
        this.connections.delete(connectionId);
    }

    /**
     * Select a block
     */
    selectBlock(blockId: string | null): void {
        this.selectedBlockId = blockId;
        
        this.blockElements.forEach((el, id) => {
            const selected = id === blockId;
            updateBlockSelection(el, selected);

            const block = this.blocks.get(id);
            if (block) {
                block.selected = selected;
            }
        });
        
        // Update toolbar position
        this.updateBlockToolbarPosition();
        
        this.emit('blockSelect', { blockId });
    }
    
    /**
     * Get selected block ID
     */
    getSelectedBlockId(): string | null {
        return this.selectedBlockId;
    }

    /**
     * Get canvas wrapper element
     */
    getCanvasWrapper(): HTMLElement {
        return this.canvasWrapper;
    }

    /**
     * Get canvas container (scrollable element)
     */
    getCanvasContainer(): HTMLElement {
        return this.container;
    }

    /**
     * Get canvas layer element (where blocks are rendered)
     */
    getCanvasLayer(): HTMLElement {
        return this.canvasLayer;
    }

    /**
     * Get all blocks
     */
    getBlocks(): Map<string, VisualBlock> {
        return this.blocks;
    }

    setRuntimeVariables(vars: Record<string, any> | null): void {
        this.runtimeVariables = vars;
    }

    // =============================================
    // Zoom Controls
    // =============================================

    private currentZoom: number = 1;
    private readonly minZoom: number = 0.25;
    private readonly maxZoom: number = 2;
    private readonly zoomStep: number = 0.1;
    private currentTool: 'pointer' | 'hand' = 'hand';

    /**
     * Zoom in the canvas
     */
    zoomIn(): void {
        this.setZoom(this.currentZoom + this.zoomStep);
    }

    /**
     * Zoom out the canvas
     */
    zoomOut(): void {
        this.setZoom(this.currentZoom - this.zoomStep);
    }

    /**
     * Set zoom level
     */
    setZoom(zoom: number): void {
        this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.canvasLayer.style.transform = `scale(${this.currentZoom})`;
        this.canvasLayer.style.transformOrigin = 'center center';
        this.updateBlockToolbarPosition();
        this.emit('zoomChange', { zoom: this.currentZoom });
    }

    /**
     * Get current zoom level
     */
    getZoom(): number {
        return this.currentZoom;
    }

    /**
     * Fit canvas to show all blocks
     */
    fitToScreen(): void {
        if (this.blocks.size === 0) {
            this.setZoom(1);
            this.setPanOffset(0, 0);
            return;
        }

        // Calculate bounds of all blocks
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.blocks.forEach(block => {
            minX = Math.min(minX, block.position.x);
            minY = Math.min(minY, block.position.y);
            maxX = Math.max(maxX, block.position.x + (block.width || 200));
            maxY = Math.max(maxY, block.position.y + (block.height || 100));
        });

        const padding = 100;
        const contentWidth = maxX - minX + padding * 2;
        const contentHeight = maxY - minY + padding * 2;

        const containerWidth = this.canvasWrapper.clientWidth;
        const containerHeight = this.canvasWrapper.clientHeight;

        const scaleX = containerWidth / contentWidth;
        const scaleY = containerHeight / contentHeight;
        const newZoom = Math.min(scaleX, scaleY, 1);

        this.setZoom(newZoom);

        // Center the content using pan offset
        // panX = (4000 - centerX) * zoom
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const panX = (4000 - centerX) * newZoom;
        const panY = (4000 - centerY) * newZoom;

        this.setPanOffset(panX, panY);
    }

    /**
     * Set the current tool
     */
    setTool(tool: 'pointer' | 'hand'): void {
        this.currentTool = tool;
        this.canvasWrapper.classList.toggle('tool-hand', tool === 'hand');
        this.canvasWrapper.classList.toggle('tool-pointer', tool === 'pointer');
        this.emit('toolChange', { tool });
    }

    /**
     * Get current tool
     */
    getTool(): 'pointer' | 'hand' {
        return this.currentTool;
    }

    /**
     * Get the pan offset
     */
    getPanOffset(): Position {
        return { ...this.panState.offset };
    }

    /**
     * Set the pan offset (for minimap navigation)
     */
    setPanOffset(x: number, y: number): void {
        this.panState.offset.x = x;
        this.panState.offset.y = y;
        this.canvasWrapper.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        this.emit('panChange', { offset: { x, y } });
    }
}

