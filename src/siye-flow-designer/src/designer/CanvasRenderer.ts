import { VisualBlock, VisualConnection, VisualPort, Position, SimpleEventEmitter } from './VisualModels';
import { AnyWorkflowBlock } from '../models/workflow-models';
import { BlockRendererFactory } from './renderers/BlockRendererFactory';
import { ConfirmModal } from '../components/ConfirmModal';
import { CanvasStateManager } from './canvas/state/CanvasStateManager';
import { ZoomPanManager } from './canvas/managers/ZoomPanManager';
import { ConnectionRenderer } from './canvas/services/ConnectionRenderer';
import { BlockEventHandler } from './canvas/handlers/BlockEventHandler';

/**
 * Canvas renderer for drawing workflow blocks and connections
 * Refactored to use extracted modules for better maintainability
 */
export class CanvasRenderer extends SimpleEventEmitter {
    private container: HTMLElement;
    private svg!: SVGElement;
    
    private stateManager: CanvasStateManager;
    private zoomPanManager: ZoomPanManager;
    private connectionRenderer: ConnectionRenderer;
    private blockEventHandler: BlockEventHandler;
    private confirmModal: ConfirmModal;
    
    constructor(containerId: string) {
        super();
        
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        this.container = element;
        
        // Initialize managers and handlers
        this.stateManager = new CanvasStateManager();
        this.zoomPanManager = new ZoomPanManager(this.container);
        this.confirmModal = new ConfirmModal();
        
        // Setup canvas
        this.setupCanvas();
        
        // Initialize connection renderer after SVG is created
        this.connectionRenderer = new ConnectionRenderer(this.svg);
        
        // Initialize block event handler
        this.blockEventHandler = new BlockEventHandler((blockId: string) => this.getBlockData(blockId));
        
        // Forward events from block event handler
        this.blockEventHandler.on('startBlockAddInput', (data) => this.emit('startBlockAddInput', data));
        this.blockEventHandler.on('startBlockDeleteInput', (data) => this.emit('startBlockDeleteInput', data));
        this.blockEventHandler.on('startBlockRenameInput', (data) => this.emit('startBlockRenameInput', data));
        this.blockEventHandler.on('startBlockInputValueChange', (data) => this.emit('startBlockInputValueChange', data));
        this.blockEventHandler.on('startBlockInputTypeChange', (data) => this.emit('startBlockInputTypeChange', data));
        this.blockEventHandler.on('endBlockAddOutput', (data) => this.emit('endBlockAddOutput', data));
        this.blockEventHandler.on('endBlockDeleteOutput', (data) => this.emit('endBlockDeleteOutput', data));
        this.blockEventHandler.on('endBlockRenameOutput', (data) => this.emit('endBlockRenameOutput', data));
        this.blockEventHandler.on('endBlockOutputValueChange', (data) => this.emit('endBlockOutputValueChange', data));
        this.blockEventHandler.on('endBlockOutputTypeChange', (data) => this.emit('endBlockOutputTypeChange', data));
        this.blockEventHandler.on('blockAddKeyValue', (data) => this.emit('blockAddKeyValue', data));
        this.blockEventHandler.on('blockDeleteKeyValue', (data) => this.emit('blockDeleteKeyValue', data));
        this.blockEventHandler.on('blockRenameKeyValue', (data) => this.emit('blockRenameKeyValue', data));
        this.blockEventHandler.on('blockKeyValueChange', (data) => this.emit('blockKeyValueChange', data));
        this.blockEventHandler.on('blockKeyValueTypeChange', (data) => this.emit('blockKeyValueTypeChange', data));
        
        // Get canvas wrapper reference after setupCanvas
        const canvasWrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (canvasWrapper) {
            this.stateManager.setCanvasWrapper(canvasWrapper);
            this.zoomPanManager.setCanvasWrapper(canvasWrapper);
            const state = this.stateManager.getState();
            this.stateManager.setCanvasSize(state.canvasWidth, state.canvasHeight);
        }
    }
    
    /**
     * Setup the canvas and SVG elements
     */
    private setupCanvas(): void {
        const state = this.stateManager.getState();
        this.container.innerHTML = `
            <div class="canvas-wrapper" style="position: relative; width: ${state.canvasWidth}px; height: ${state.canvasHeight}px;">
                <svg class="connections-svg" style="position: absolute; top: 0; left: 0; width: ${state.canvasWidth}px; height: ${state.canvasHeight}px; z-index: 0;">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff" />
                        </marker>
                    </defs>
                </svg>
                <div class="blocks-layer" style="position: relative; width: ${state.canvasWidth}px; height: ${state.canvasHeight}px;"></div>
            </div>
        `;
        
        this.svg = this.container.querySelector('.connections-svg') as SVGElement;
        
        // Setup event handlers
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        wrapper.addEventListener('dragover', (e) => this.onDragOver(e));
        wrapper.addEventListener('drop', (e) => this.onDrop(e));
        wrapper.addEventListener('click', (e) => this.onCanvasClick(e));
        wrapper.addEventListener('mousemove', (e) => this.onMouseMove(e));
        wrapper.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Capture mousedown on wrapper for pan mode
        wrapper.addEventListener('mousedown', (e) => {
            const state = this.stateManager.getState();
            if (state.panMode) {
                const target = e.target as HTMLElement;
                if (!target.closest('#minimap-container') && 
                    !target.closest('.floating-panel') &&
                    !target.closest('.property-panel')) {
                    this.onCanvasMouseDown(e);
                }
            }
        }, true);
    }
    
    /**
     * Render the workflow
     */
    public render(blocks: Map<string, VisualBlock>, connections: Map<string, VisualConnection>): void {
        this.stateManager.setBlocks(blocks);
        this.stateManager.setConnections(connections);
        
        this.renderBlocks();
        this.renderConnections();
    }
    
    /**
     * Set block data for rich display
     */
    public setBlockData(blockData: Map<string, AnyWorkflowBlock>): void {
        this.stateManager.setBlockDataMap(blockData);
        const state = this.stateManager.getState();
        if (state.blocks.size > 0) {
            this.renderBlocks();
        }
    }
    
    /**
     * Render all blocks
     */
    private renderBlocks(): void {
        const blocksLayer = this.container.querySelector('.blocks-layer');
        if (!blocksLayer) return;
        
        blocksLayer.innerHTML = '';
        
        const state = this.stateManager.getState();
        state.blocks.forEach((block) => {
            const blockElement = this.createBlockElement(block);
            blocksLayer.appendChild(blockElement);
        });
    }
    
    /**
     * Create a block DOM element
     */
    private createBlockElement(block: VisualBlock): HTMLElement {
        const div = document.createElement('div');
        div.className = `workflow-block block-type-${block.type} ${block.selected ? 'selected' : ''}`;
        div.id = `block-${block.id}`;
        div.style.left = `${block.position.x}px`;
        div.style.top = `${block.position.y}px`;
        div.style.width = `${block.width}px`;
        div.style.minHeight = `${block.height}px`;
        
        const blockData = this.getBlockData(block.id);
        const renderer = BlockRendererFactory.createRenderer(block, blockData);
        renderer.updatePorts();
        
        const color = this.getBlockColor(block.type);
        div.style.borderColor = color;
        div.innerHTML = renderer.render();
        
        // Add event handlers
        div.addEventListener('mousedown', (e) => this.onBlockMouseDown(e, block.id));
        div.addEventListener('click', (e) => this.onBlockClick(e, block.id));
        
        // HTTP Request inline editors
        this.setupHttpRequestHandlers(div, block.id);
        
        // Port event handlers
        const portTabs = div.querySelectorAll('.port-input-tab, .port-output-tab, .port-row');
        portTabs.forEach(port => {
            port.addEventListener('mousedown', (e) => this.onPortMouseDown(e as MouseEvent));
            port.addEventListener('dblclick', (e) => {
                const portElement = e.currentTarget as HTMLElement;
                if (portElement.dataset.portType === 'input') {
                    e.stopPropagation();
                    e.preventDefault();
                    this.deleteConnectionToPort(block.id, portElement.dataset.port || '');
                }
            });
        });
        
        // Profile selector handler for Start blocks
        this.setupProfileHandlers(div, block.id);
        
        // Block-specific handlers
        if (block.type === 'start') {
            this.blockEventHandler.setupStartBlockInputHandlers(div, block.id);
        }
        
        if (block.type === 'end') {
            this.blockEventHandler.setupEndBlockOutputHandlers(div, block.id);
        }
        
        if (block.type === 'variable' || block.type === 'http-request') {
            this.blockEventHandler.setupEditableKeyValueHandlers(div, block.id);
        }
        
        // Delete button handler
        setTimeout(() => {
            const deleteBtn = div.querySelector('.block-delete-btn') as HTMLButtonElement;
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const blockName = this.getBlockData(block.id)?.name || block.id;
                    this.confirmModal.show(
                        `Delete block "${blockName}"?\n\nAll connections will be removed.`,
                        'Delete Block',
                        'Delete',
                        'Cancel',
                        () => {
                            this.emit('blockDelete', { blockId: block.id });
                        }
                    );
                });
            }
        }, 0);
        
        return div;
    }
    
    /**
     * Setup HTTP Request inline editors
     */
    private setupHttpRequestHandlers(div: HTMLElement, blockId: string): void {
        const methodSelect = div.querySelector('.http-method-select') as HTMLSelectElement | null;
        if (methodSelect) {
            methodSelect.addEventListener('mousedown', (e) => e.stopPropagation());
            methodSelect.addEventListener('click', (e) => e.stopPropagation());
            methodSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                const value = (e.target as HTMLSelectElement).value;
                this.emit('propertyChange', { blockId, property: 'config.method', value });
            });
        }
        
        const evaluatorToggle = div.querySelector('.http-evaluator-toggle') as HTMLButtonElement | null;
        const evaluatorPanel = div.querySelector('.http-evaluator-panel') as HTMLElement | null;
        if (evaluatorToggle && evaluatorPanel) {
            evaluatorToggle.addEventListener('mousedown', (e) => e.stopPropagation());
            evaluatorToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const isVisible = evaluatorPanel.style.display !== 'none';
                evaluatorPanel.style.display = isVisible ? 'none' : 'block';
                evaluatorToggle.textContent = isVisible ? '▼' : '▲';
            });
        }
        
        const urlInput = div.querySelector('.http-url-input') as HTMLInputElement | null;
        if (urlInput) {
            urlInput.addEventListener('mousedown', (e) => e.stopPropagation());
            urlInput.addEventListener('click', (e) => e.stopPropagation());
            const fireUrl = () => {
                const value = urlInput.value;
                this.emit('propertyChange', { blockId, property: 'config.url', value });
            };
            urlInput.addEventListener('keydown', (e) => {
                if ((e as KeyboardEvent).key === 'Enter') {
                    e.stopPropagation();
                    e.preventDefault();
                    fireUrl();
                    urlInput.focus();
                }
            });
            urlInput.addEventListener('blur', (e) => {
                e.stopPropagation();
                fireUrl();
            });
        }
        
        const evaluator = div.querySelector('.http-success-evaluator') as HTMLTextAreaElement | null;
        if (evaluator) {
            evaluator.addEventListener('mousedown', (e) => e.stopPropagation());
            evaluator.addEventListener('click', (e) => e.stopPropagation());
            const fireEval = () => {
                const value = evaluator.value;
                this.emit('propertyChange', { blockId, property: 'config.successEvaluator', value });
                this.emit('propertyChange', { blockId, property: 'config.evaluatorLanguage', value: 'typescript' });
            };
            evaluator.addEventListener('keydown', (e) => {
                if ((e as KeyboardEvent).key === 'Enter' && (e as KeyboardEvent).ctrlKey) {
                    e.stopPropagation();
                    e.preventDefault();
                    fireEval();
                    evaluator.focus();
                }
            });
            evaluator.addEventListener('blur', (e) => {
                e.stopPropagation();
                fireEval();
            });
        }
        
        const bodyTextarea = div.querySelector('.http-body-textarea') as HTMLTextAreaElement | null;
        if (bodyTextarea) {
            bodyTextarea.addEventListener('mousedown', (e) => e.stopPropagation());
            bodyTextarea.addEventListener('click', (e) => e.stopPropagation());
            const fireBody = () => {
                const raw = bodyTextarea.value;
                let value: any = raw;
                try {
                    value = raw.trim() ? JSON.parse(raw) : null;
                } catch {
                    value = raw;
                }
                this.emit('propertyChange', { blockId, property: 'config.body', value });
            };
            bodyTextarea.addEventListener('input', (e) => {
                e.stopPropagation();
                fireBody();
            });
            bodyTextarea.addEventListener('blur', (e) => {
                e.stopPropagation();
                fireBody();
            });
        }
    }
    
    /**
     * Setup profile handlers for Start blocks
     */
    private setupProfileHandlers(div: HTMLElement, blockId: string): void {
        const profileDropdown = div.querySelector('.profile-dropdown') as HTMLSelectElement;
        if (profileDropdown) {
            profileDropdown.addEventListener('mousedown', (e) => e.stopPropagation());
            profileDropdown.addEventListener('click', (e) => e.stopPropagation());
            profileDropdown.addEventListener('change', (e) => {
                e.stopPropagation();
                const target = e.target as HTMLSelectElement;
                const selectedProfile = target.value;
                this.emit('profileChange', { blockId, profile: selectedProfile });
            });
        }
        
        const profileActionsBtn = div.querySelector('.btn-profile-actions') as HTMLElement;
        const profileActionsDropdown = div.querySelector('.profile-actions-dropdown') as HTMLElement;
        if (profileActionsBtn && profileActionsDropdown) {
            profileActionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const isVisible = profileActionsDropdown.style.display === 'block';
                profileActionsDropdown.style.display = isVisible ? 'none' : 'block';
            });
            
            profileActionsDropdown.querySelectorAll('.profile-action-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const action = (item as HTMLElement).dataset.action;
                    const profileName = (item as HTMLElement).dataset.profile;
                    
                    if (action === 'add') {
                        this.emit('startBlockAddProfile', { blockId });
                    } else if (action === 'delete' && profileName) {
                        this.confirmModal.show(
                            `Delete profile "${profileName}"?`,
                            'Delete Profile',
                            'Delete',
                            'Cancel',
                            () => {
                                this.emit('startBlockDeleteProfile', { blockId, profileName });
                            }
                        );
                    } else if (action === 'set-default' && profileName) {
                        this.emit('startBlockSetDefaultProfile', { blockId, profileName });
                    }
                    
                    profileActionsDropdown.style.display = 'none';
                });
            });
            
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!profileActionsBtn.contains(target) && !profileActionsDropdown.contains(target)) {
                    profileActionsDropdown.style.display = 'none';
                }
            });
        }
    }
    
    /**
     * Get block color
     */
    private getBlockColor(type: string): string {
        const colorMap: Record<string, string> = {
            'start': '#4CAF50',
            'end': '#f44336',
            'http-request': '#2196F3',
            'variable': '#FF9800',
            'condition': '#9C27B0',
            'delay': '#00BCD4',
            'log': '#607D8B',
            'evaluate': '#795548',
            'loop': '#E91E63',
            'try-catch': '#FFC107'
        };
        
        return colorMap[type] || '#666';
    }
    
    /**
     * Render all connections
     */
    private renderConnections(): void {
        const state = this.stateManager.getState();
        this.connectionRenderer.renderConnections(
            state.connections,
            state.blocks,
            state.isConnecting,
            state.connectionStart,
            state.mousePosition,
            (block: VisualBlock, port: VisualPort) => this.getPortTabPosition(block, port)
        );
    }
    
    /**
     * Get block data by ID
     */
    private getBlockData(blockId: string): AnyWorkflowBlock | undefined {
        return this.stateManager.getBlockDataMap().get(blockId);
    }
    
    /**
     * Get absolute position of a port tab from the actual DOM element
     */
    private getPortTabPosition(block: VisualBlock, port: VisualPort): Position {
        const blockElement = document.getElementById(`block-${block.id}`);
        
        if (blockElement) {
            const portType = port.position.x > 0 ? 'output' : 'input';
            let portElement = blockElement.querySelector(`.port-${portType}-tab[data-port="${port.name}"]`);
            
            if (!portElement) {
                portElement = blockElement.querySelector(`.port-row.port-${portType}[data-port="${port.name}"]`);
            }
            
            if (portElement) {
                const tabElement = portElement.querySelector('.port-tab');
                
                if (tabElement) {
                    const rect = tabElement.getBoundingClientRect();
                    const canvasWrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
                    
                    if (canvasWrapper) {
                        const canvasRect = canvasWrapper.getBoundingClientRect();
                        const scale = this.zoomPanManager.getZoomLevel();
                        
                        return {
                            x: (rect.left - canvasRect.left + canvasWrapper.scrollLeft + (rect.width / 2)) / scale,
                            y: (rect.top - canvasRect.top + canvasWrapper.scrollTop + (rect.height / 2)) / scale
                        };
                    }
                }
            }
        }
        
        return {
            x: block.position.x + port.position.x,
            y: block.position.y + port.position.y
        };
    }
    
    /**
     * Delete connection to a specific port
     */
    private deleteConnectionToPort(blockId: string, portName: string): void {
        const connectionsToDelete: string[] = [];
        const state = this.stateManager.getState();
        
        state.connections.forEach((connection, connectionId) => {
            if (connection.targetBlockId === blockId && connection.targetPortName === portName) {
                connectionsToDelete.push(connectionId);
            }
        });
        
        connectionsToDelete.forEach(id => {
            this.emit('connectionDelete', { connectionId: id });
        });
    }
    
    // Event Handlers
    
    private onDragOver(e: DragEvent): void {
        e.preventDefault();
    }
    
    private onDrop(e: DragEvent): void {
        e.preventDefault();
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        const position = this.zoomPanManager.screenToCanvas(e.clientX, e.clientY);
        this.emit('drop', position);
    }
    
    private onBlockMouseDown(e: MouseEvent, blockId: string): void {
        const state = this.stateManager.getState();
        if (state.panMode) {
            return;
        }
        
        const target = e.target as HTMLElement;
        if (target.closest('.profile-dropdown') ||
            target.closest('.btn-profile-actions') ||
            target.closest('.profile-actions-dropdown') ||
            target.closest('.block-input-name') ||
            target.closest('.block-input-value') ||
            target.closest('.input-type-btn') ||
            target.closest('.input-type-dropdown') ||
            target.closest('.btn-delete-input') ||
            target.closest('.btn-add-input-on-block') ||
            target.classList.contains('port-row') || 
            target.classList.contains('port-tab') || 
            target.classList.contains('port-name')) {
            return;
        }
        
        e.preventDefault();
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        const block = state.blocks.get(blockId);
        if (block && wrapper) {
            const position = this.zoomPanManager.screenToCanvas(e.clientX, e.clientY);
            const dragOffset = {
                x: position.x - block.position.x,
                y: position.y - block.position.y
            };
            this.stateManager.setDragging(true, blockId, dragOffset);
        }
    }
    
    private onBlockClick(e: MouseEvent, blockId: string): void {
        const target = e.target as HTMLElement;
        
        if (target.closest('.profile-dropdown') ||
            target.closest('.btn-profile-actions') ||
            target.closest('.profile-actions-dropdown') ||
            target.closest('.block-input-name') ||
            target.closest('.block-input-value') ||
            target.closest('.input-type-btn') ||
            target.closest('.input-type-dropdown') ||
            target.closest('.btn-delete-input') ||
            target.closest('.btn-edit-input') ||
            target.closest('.btn-add-input-on-block') ||
            target.closest('.btn-add-item-popup') ||
            target.closest('.block-delete-btn') ||
            target.classList.contains('port-row') || 
            target.classList.contains('port-tab') || 
            target.classList.contains('port-name')) {
            return;
        }
        
        e.stopPropagation();
        this.emit('blockSelect', blockId);
    }
    
    private onCanvasMouseDown(e: MouseEvent): void {
        const state = this.stateManager.getState();
        if (!state.panMode) return;
        
        e.preventDefault();
        e.stopPropagation();
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (wrapper) {
            const panStart = {
                x: e.clientX + wrapper.scrollLeft,
                y: e.clientY + wrapper.scrollTop
            };
            this.stateManager.setPanning(true, panStart);
            wrapper.style.cursor = 'grabbing';
        }
    }
    
    private onCanvasClick(e: MouseEvent): void {
        if ((e.target as HTMLElement).classList.contains('canvas-wrapper')) {
            this.emit('blockSelect', null);
        }
    }
    
    private onMouseMove(e: MouseEvent): void {
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (!wrapper) return;
        
        const mousePosition = this.zoomPanManager.screenToCanvas(e.clientX, e.clientY);
        this.stateManager.setMousePosition(mousePosition);
        
        const state = this.stateManager.getState();
        
        // Handle panning
        if (state.isPanning && state.panMode) {
            e.preventDefault();
            const deltaX = state.panStart.x - e.clientX;
            const deltaY = state.panStart.y - e.clientY;
            wrapper.scrollLeft = deltaX;
            wrapper.scrollTop = deltaY;
            return;
        }
        
        // Handle dragging
        if (state.isDragging && state.draggedBlockId) {
            const position = {
                x: mousePosition.x - state.dragOffset.x,
                y: mousePosition.y - state.dragOffset.y
            };
            this.emit('blockMove', {
                blockId: state.draggedBlockId,
                position
            });
        }
        
        // Handle connection rendering
        if (state.isConnecting) {
            this.renderConnections();
        } else {
            this.checkConnectionHover();
        }
    }
    
    /**
     * Check if mouse is near any connection and show delete button
     */
    private checkConnectionHover(): void {
        const HOVER_DISTANCE = 10;
        let nearestConnection: { id: string; distance: number } | null = null;
        const state = this.stateManager.getState();
        
        for (const [id, connection] of state.connections.entries()) {
            const sourceBlock = state.blocks.get(connection.sourceBlockId);
            const targetBlock = state.blocks.get(connection.targetBlockId);
            
            if (!sourceBlock || !targetBlock) continue;
            
            const sourcePort = sourceBlock.outputPorts?.find(p => p.name === connection.sourcePortName);
            const targetPort = targetBlock.inputPorts?.find(p => p.name === connection.targetPortName);
            
            if (!sourcePort || !targetPort) continue;
            
            const start = this.getPortTabPosition(sourceBlock, sourcePort);
            const end = this.getPortTabPosition(targetBlock, targetPort);
            
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            
            const distance = Math.sqrt(
                Math.pow(state.mousePosition.x - midX, 2) + 
                Math.pow(state.mousePosition.y - midY, 2)
            );
            
            if (distance < HOVER_DISTANCE && (!nearestConnection || distance < nearestConnection.distance)) {
                nearestConnection = { id, distance };
            }
        }
        
        if (nearestConnection) {
            const connectionId = nearestConnection.id;
            const state = this.stateManager.getState();
            if (connectionId !== state.hoveredConnection) {
                this.stateManager.setHoveredConnection(connectionId);
                const deleteButton = this.connectionRenderer.showDeleteButton(
                    state.mousePosition,
                    connectionId,
                    (id) => this.emit('connectionDelete', { connectionId: id })
                );
                this.stateManager.setDeleteButtonElement(deleteButton);
            } else if (state.deleteButtonElement) {
                state.deleteButtonElement.setAttribute('x', String(state.mousePosition.x - 12));
                state.deleteButtonElement.setAttribute('y', String(state.mousePosition.y - 12));
            }
        } else {
            const state = this.stateManager.getState();
            if (state.hoveredConnection) {
                this.stateManager.setHoveredConnection(null);
                this.connectionRenderer.hideDeleteButton(state.deleteButtonElement);
                this.stateManager.setDeleteButtonElement(null);
            }
        }
    }
    
    private onMouseUp(e: MouseEvent): void {
        const state = this.stateManager.getState();
        
        if (state.isPanning) {
            this.stateManager.setPanning(false);
            const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
            if (wrapper && state.panMode) {
                wrapper.style.cursor = 'grab';
            }
        }
        
        if (state.isDragging) {
            this.stateManager.setDragging(false);
        }
        
        if (state.isConnecting) {
            const target = e.target as HTMLElement;
            const portElement = target.closest('.port-input-tab, .port-row') as HTMLElement;
            
            if (portElement && portElement.dataset.portType === 'input') {
                const targetBlockId = portElement.dataset.block;
                const targetPortName = portElement.dataset.port;
                if (targetBlockId && targetPortName && state.connectionStart) {
                    this.emit('connectionCreate', {
                        sourceBlockId: state.connectionStart.blockId,
                        sourcePortName: state.connectionStart.portName,
                        targetBlockId: targetBlockId,
                        targetPortName: targetPortName
                    });
                }
            }
            
            this.stateManager.setConnecting(false);
            this.renderConnections();
        }
    }
    
    private onPortMouseDown(e: MouseEvent): void {
        e.stopPropagation();
        e.preventDefault();
        
        const portElement = e.currentTarget as HTMLElement;
        const portType = portElement.dataset.portType;
        
        if (portType === 'output') {
            const blockId = portElement.dataset.block;
            const portName = portElement.dataset.port;
            
            if (blockId && portName) {
                const state = this.stateManager.getState();
                const block = state.blocks.get(blockId);
                const visualPort = block?.outputPorts?.find(p => p.name === portName);
                
                if (block && visualPort) {
                    const portPosition = this.getPortTabPosition(block, visualPort);
                    this.stateManager.setConnecting(true, {
                        blockId,
                        portName,
                        position: portPosition
                    });
                }
            }
        }
    }
    
    // Zoom/Pan methods
    
    public zoomIn(): void {
        this.zoomPanManager.zoomIn();
        this.renderConnections();
    }
    
    public zoomOut(): void {
        this.zoomPanManager.zoomOut();
        this.renderConnections();
    }
    
    public zoomReset(): void {
        this.zoomPanManager.zoomReset();
        this.renderConnections();
    }
    
    public zoomFitToScreen(): void {
        const state = this.stateManager.getState();
        this.zoomPanManager.zoomFitToScreen(state.blocks);
        this.renderConnections();
    }
    
    public getZoomLevel(): number {
        return this.zoomPanManager.getZoomLevel();
    }
    
    public enablePanMode(): void {
        this.stateManager.setPanMode(true);
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.cursor = 'grab';
            wrapper.classList.add('pan-mode');
        }
    }
    
    public disablePanMode(): void {
        this.stateManager.setPanMode(false);
        this.stateManager.setPanning(false);
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.cursor = 'default';
            wrapper.classList.remove('pan-mode');
        }
    }
    
    public setCanvasSize(width: number, height: number): void {
        this.stateManager.setCanvasSize(width, height);
        const state = this.stateManager.getState();
        const currentBlocks = new Map(state.blocks);
        const currentConnections = new Map(state.connections);
        this.setupCanvas();
        const canvasWrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (canvasWrapper) {
            this.stateManager.setCanvasWrapper(canvasWrapper);
            this.zoomPanManager.setCanvasWrapper(canvasWrapper);
        }
        this.stateManager.setBlocks(currentBlocks);
        this.stateManager.setConnections(currentConnections);
        if (currentBlocks.size > 0) {
            this.renderBlocks();
            this.renderConnections();
        }
    }
    
    public getCanvasSize(): { width: number; height: number } {
        const state = this.stateManager.getState();
        return { width: state.canvasWidth, height: state.canvasHeight };
    }
}
