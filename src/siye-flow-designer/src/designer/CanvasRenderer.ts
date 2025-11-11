import { VisualBlock, VisualConnection, VisualPort, Position } from './VisualModels';
import { AnyWorkflowBlock } from '../models/workflow-models';
import { BlockRendererFactory } from './renderers/BlockRendererFactory';
import { ConfirmModal } from '../components/ConfirmModal';
import { CanvasStateManager } from './canvas/state/CanvasStateManager';
import { ZoomPanManager } from './canvas/managers/ZoomPanManager';
import { ConnectionRenderer } from './canvas/services/ConnectionRenderer';
import { BlockEventHandler } from './canvas/handlers/BlockEventHandler';
import { BaseComponent } from '../utils/BaseComponent';
import { DOMDiff } from '../utils/DOMDiff';
import { DOMUpdater } from '../utils/DOMUpdater';
import { DevTools } from '../utils/DevTools';

/**
 * Canvas renderer for drawing workflow blocks and connections
 * Refactored to use extracted modules for better maintainability
 * Now extends BaseComponent for automatic cleanup and event management
 */
export class CanvasRenderer extends BaseComponent {
    private svg!: SVGElement;
    
    private stateManager: CanvasStateManager;
    private zoomPanManager: ZoomPanManager;
    private connectionRenderer: ConnectionRenderer;
    private blockEventHandler: BlockEventHandler;
    private confirmModal: ConfirmModal;
    private devTools?: DevTools;
    
    // Throttled event handlers
    private throttledMouseMove: ((e: MouseEvent) => void) | null = null;
    
    // Memoized expensive calculations
    private memoizedGetPortTabPosition: (block: VisualBlock, port: VisualPort) => Position;
    
    constructor(containerId: string, enableDevTools: boolean = false) {
        super(containerId);
        
        // Initialize managers and handlers
        this.stateManager = new CanvasStateManager();
        this.zoomPanManager = new ZoomPanManager(this.container);
        this.confirmModal = new ConfirmModal();
        
        // Memoize expensive port position calculation
        // Don't round positions in key - we need accurate positions for connections
        // The memoization will still help with repeated calls for the same position
        this.memoizedGetPortTabPosition = DOMDiff.memoize(
            (block: VisualBlock, port: VisualPort) => this.calculatePortTabPosition(block, port),
            (block, port) => `${block.id}-${port.name}-${port.position.x}-${port.position.y}-${block.position.x}-${block.position.y}`
        );
        
        // Setup canvas
        this.setupCanvas();
        
        // Initialize connection renderer after SVG is created
        this.connectionRenderer = new ConnectionRenderer(this.svg);
        
        // Initialize block event handler
        this.blockEventHandler = new BlockEventHandler((blockId: string) => this.getBlockData(blockId));
        
        // Forward events from block event handler
        this.blockEventHandler.on('startBlockAddInput', (data: any) => this.emit('startBlockAddInput', data));
        this.blockEventHandler.on('startBlockDeleteInput', (data: any) => this.emit('startBlockDeleteInput', data));
        this.blockEventHandler.on('startBlockRenameInput', (data: any) => this.emit('startBlockRenameInput', data));
        this.blockEventHandler.on('startBlockInputValueChange', (data: any) => this.emit('startBlockInputValueChange', data));
        this.blockEventHandler.on('startBlockInputTypeChange', (data: any) => this.emit('startBlockInputTypeChange', data));
        this.blockEventHandler.on('endBlockAddOutput', (data: any) => this.emit('endBlockAddOutput', data));
        this.blockEventHandler.on('endBlockDeleteOutput', (data: any) => this.emit('endBlockDeleteOutput', data));
        this.blockEventHandler.on('endBlockRenameOutput', (data: any) => this.emit('endBlockRenameOutput', data));
        this.blockEventHandler.on('endBlockOutputValueChange', (data: any) => this.emit('endBlockOutputValueChange', data));
        this.blockEventHandler.on('endBlockOutputTypeChange', (data: any) => this.emit('endBlockOutputTypeChange', data));
        this.blockEventHandler.on('blockAddKeyValue', (data: any) => this.emit('blockAddKeyValue', data));
        this.blockEventHandler.on('blockDeleteKeyValue', (data: any) => this.emit('blockDeleteKeyValue', data));
        this.blockEventHandler.on('blockRenameKeyValue', (data: any) => this.emit('blockRenameKeyValue', data));
        this.blockEventHandler.on('blockKeyValueChange', (data: any) => this.emit('blockKeyValueChange', data));
        this.blockEventHandler.on('blockKeyValueTypeChange', (data: any) => this.emit('blockKeyValueTypeChange', data));
        
        // Get canvas wrapper reference after setupCanvas
        const canvasWrapper = DOMUpdater.query<HTMLElement>(this.container, '.canvas-wrapper');
        if (canvasWrapper) {
            this.stateManager.setCanvasWrapper(canvasWrapper);
            this.zoomPanManager.setCanvasWrapper(canvasWrapper);
            // Canvas is infinite size - no need to set size
        }
        
        // Initialize DevTools in development mode only
        if (enableDevTools || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')) {
            this.devTools = new DevTools(this.stateManager);
        }
        
        // Subscribe to state changes for automatic rendering
        // Render when blocks/connections change OR when dragging (for position updates)
        // OR when connecting (for preview line updates)
        let lastBlocksHash = '';
        let lastConnectionsHash = '';
        let lastIsDragging = false;
        let lastIsConnecting = false;
        let lastMousePosition = { x: 0, y: 0 };
        let renderScheduled = false;
        
        const unsubscribe = this.stateManager.subscribe(() => {
            const state = this.stateManager.getState();
            
            // Create hash including positions to detect position changes
            // Round positions to avoid micro-movements triggering renders (optimization)
            let blocksHash = '';
            if (state.blocks.size > 0) {
                blocksHash = Array.from(state.blocks.entries())
                    .map(([id, block]) => `${id}:${Math.round(block.position.x)},${Math.round(block.position.y)}`)
                    .sort()
                    .join('|');
            }
            const connectionsHash = Array.from(state.connections.keys()).sort().join(',');
            
            // Check if blocks/connections changed (including positions) or dragging state changed
            const blocksChanged = blocksHash !== lastBlocksHash;
            const connectionsChanged = connectionsHash !== lastConnectionsHash;
            const draggingChanged = state.isDragging !== lastIsDragging;
            const connectingChanged = state.isConnecting !== lastIsConnecting;
            
            // Check if mouse moved during connection (for preview line)
            const mouseMovedDuringConnection = state.isConnecting && (
                Math.abs(state.mousePosition.x - lastMousePosition.x) > 1 ||
                Math.abs(state.mousePosition.y - lastMousePosition.y) > 1
            );
            
            // Render if blocks/connections changed OR if dragging/connecting state changed
            // OR if mouse moved during connection (for preview line updates)
            // OR if dragging just ended (to catch final position adjustments)
            const shouldRender = blocksChanged || connectionsChanged || draggingChanged || connectingChanged || mouseMovedDuringConnection;
            
            if (shouldRender) {
                lastBlocksHash = blocksHash;
                lastConnectionsHash = connectionsHash;
                lastIsDragging = state.isDragging;
                lastIsConnecting = state.isConnecting;
                lastMousePosition = { ...state.mousePosition };
                
                // Use requestAnimationFrame for smooth rendering
                if (!renderScheduled) {
                    renderScheduled = true;
                    requestAnimationFrame(() => {
                        renderScheduled = false;
                        const currentState = this.stateManager.getState();
                        if (currentState.blocks.size > 0 || currentState.connections.size > 0 || currentState.isConnecting) {
                            // Render blocks first
                            this.renderBlocks();
                            
                            // Then render connections after blocks are updated in DOM
                            // Use double RAF to ensure DOM has reflowed and port positions are accurate
                            requestAnimationFrame(() => {
                                // Force recalculation of port positions by clearing memoization cache
                                // This ensures we get fresh positions after block updates
                                this.renderConnections();
                                
                                // If dragging just ended, render again after a short delay to catch any final adjustments
                                if (draggingChanged && !currentState.isDragging) {
                                    requestAnimationFrame(() => {
                                        this.renderConnections();
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });
        
        // Register cleanup for subscription
        this.registerCleanup(() => {
            unsubscribe();
        });
        
        // Listen to zoom changes to ensure blocks remain visible
        // When zoom changes, force a re-render to ensure blocks are properly displayed
        // BUT: Skip this during initial render to avoid interfering with setup
        let skipNextZoomChange = true; // Skip the initial zoom change from setCanvasWrapper
        this.zoomPanManager.on('zoomChanged', (zoomLevel: number) => {
            if (skipNextZoomChange) {
                skipNextZoomChange = false;
                return; // Skip initial zoom change
            }
            
            // Force a re-render when zoom changes
            // Use multiple requestAnimationFrame to ensure zoom transform is fully applied
            requestAnimationFrame(() => {
                // First, ensure all block elements have correct styles
                const blocksLayer = DOMUpdater.query<HTMLElement>(this.container, '.blocks-layer');
                if (blocksLayer) {
                    const state = this.stateManager.getState();
                    
                    // Count blocks before fix
                    const blocksBefore = blocksLayer.querySelectorAll('.workflow-block').length;
                    
                    state.blocks.forEach((block) => {
                        const blockElement = blocksLayer.querySelector(`#block-${block.id}`) as HTMLElement;
                        if (blockElement) {
                            // Force update position and size to ensure visibility
                            blockElement.style.position = 'absolute';
                            blockElement.style.left = `${block.position.x}px`;
                            blockElement.style.top = `${block.position.y}px`;
                            blockElement.style.width = `${block.width}px`;
                            blockElement.style.minHeight = `${block.height}px`;
                            blockElement.style.display = 'block';
                            blockElement.style.visibility = 'visible';
                            blockElement.style.opacity = '1';
                            blockElement.style.zIndex = '10';
                        } else {
                            // Block element missing - will be recreated in renderBlocks
                            console.warn(`[CanvasRenderer] Block ${block.id} element missing at zoom ${zoomLevel}`);
                        }
                    });
                    
                    // Count blocks after fix
                    const blocksAfter = blocksLayer.querySelectorAll('.workflow-block').length;
                    if (blocksBefore !== state.blocks.size || blocksAfter !== state.blocks.size) {
                        console.warn(`[CanvasRenderer] Block count mismatch at zoom ${zoomLevel}: expected ${state.blocks.size}, before=${blocksBefore}, after=${blocksAfter}`);
                    }
                }
                
                // Then render blocks and connections
                requestAnimationFrame(() => {
                    this.renderBlocks();
                    requestAnimationFrame(() => {
                        this.renderConnections();
                    });
                });
            });
        });
    }
    
    /**
     * Setup the canvas and SVG elements
     * Canvas is infinite size (100000x100000) - only viewport is limited
     */
    private setupCanvas(): void {
        // Preserve minimap container if it exists (it's appended to canvas-container)
        // We need to preserve the actual element, not clone it, so Minimap's event listeners remain intact
        const minimapContainer = this.container.querySelector('#minimap-container') as HTMLElement | null;
        const parentElement = minimapContainer?.parentElement;
        
        // Temporarily move minimap outside to preserve it
        if (minimapContainer && parentElement) {
            parentElement.removeChild(minimapContainer);
        }
        
        // Use very large size for infinite canvas (100000x100000)
        // The viewport (canvas-container) will handle the visible area
        const INFINITE_SIZE = 100000;
        this.container.innerHTML = `
            <div class="canvas-wrapper" style="position: relative; width: ${INFINITE_SIZE}px; height: ${INFINITE_SIZE}px;">
                <svg class="connections-svg" style="position: absolute; top: 0; left: 0; width: ${INFINITE_SIZE}px; height: ${INFINITE_SIZE}px; z-index: 0;">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff" />
                        </marker>
                    </defs>
                </svg>
                <div class="blocks-layer" style="position: relative; width: ${INFINITE_SIZE}px; height: ${INFINITE_SIZE}px;"></div>
            </div>
        `;
        
        // Restore minimap container if it existed
        if (minimapContainer) {
            this.container.appendChild(minimapContainer);
        }
        
        this.svg = this.container.querySelector('.connections-svg') as SVGElement;
        if (!this.svg) {
            throw new Error('SVG element not found');
        }
        
        // Setup event handlers with automatic cleanup tracking
        const wrapper = DOMUpdater.query<HTMLElement>(this.container, '.canvas-wrapper', true)!;
        
        // Throttle mouse move events for better performance (~60fps)
        this.throttledMouseMove = DOMDiff.throttle(
            (e: MouseEvent) => this.onMouseMove(e),
            16 // ~60fps
        );
        
        this.addEventListener(wrapper, 'dragover', (e) => this.onDragOver(e as DragEvent));
        this.addEventListener(wrapper, 'drop', (e) => this.onDrop(e as DragEvent));
        this.addEventListener(wrapper, 'click', (e) => this.onCanvasClick(e as MouseEvent));
        this.addEventListener(wrapper, 'mousemove', this.throttledMouseMove as EventListener);
        this.addEventListener(wrapper, 'mouseup', (e) => this.onMouseUp(e as MouseEvent));
        
        // Capture mousedown on wrapper for pan mode
        this.addEventListener(wrapper, 'mousedown', (e) => {
            const state = this.stateManager.getState();
            if (state.panMode) {
                const target = (e as MouseEvent).target as HTMLElement;
                if (!target.closest('#minimap-container') && 
                    !target.closest('.floating-panel') &&
                    !target.closest('.property-panel')) {
                    this.onCanvasMouseDown(e as MouseEvent);
                }
            }
        }, true);
    }
    
    /**
     * Render the workflow
     * Note: With ReactiveState, renders are now automatic, but this method
     * is kept for explicit rendering when needed
     */
    public render(blocks: Map<string, VisualBlock>, connections: Map<string, VisualConnection>): void {
        // Update state - this will trigger automatic render via subscription
        this.stateManager.setBlocks(blocks);
        this.stateManager.setConnections(connections);
        // Renders will be triggered automatically by ReactiveState subscription
        // But ensure immediate render for responsiveness during dragging
        requestAnimationFrame(() => {
        this.renderBlocks();
        this.renderConnections();
        });
    }
    
    /**
     * Set block data for rich display
     */
    public setBlockData(blockData: Map<string, AnyWorkflowBlock>): void {
        this.stateManager.setBlockDataMap(blockData);
        // Render will be triggered automatically if blocks exist
    }
    
    // Track blocks that have event handlers set up
    private blocksWithHandlers: Set<string> = new Set();
    
    /**
     * Render all blocks using DOMDiff for efficient updates
     */
    private renderBlocks(): void {
        const blocksLayer = DOMUpdater.query<HTMLElement>(this.container, '.blocks-layer');
        if (!blocksLayer) {
            console.warn('[CanvasRenderer] blocks-layer not found');
            return;
        }
        
        const state = this.stateManager.getState();
        
        // Ensure blocks-layer is visible and properly positioned
        blocksLayer.style.position = 'relative';
        blocksLayer.style.display = 'block';
        blocksLayer.style.visibility = 'visible';
        blocksLayer.style.opacity = '1';
        
        // Track which blocks are being removed
        const currentBlockIds = new Set(state.blocks.keys());
        const removedBlockIds = new Set(this.blocksWithHandlers);
        currentBlockIds.forEach(id => removedBlockIds.delete(id));
        
        // Clean up event listeners for removed blocks
        removedBlockIds.forEach(blockId => {
            this.blockEventHandler.cleanupBlock(blockId);
            this.blocksWithHandlers.delete(blockId);
        });
        
        // Use DOMDiff.updateList to only update changed blocks
        DOMDiff.updateList(
            blocksLayer,
            state.blocks,
            (block) => {
                this.blocksWithHandlers.add(block.id);
                const element = this.createBlockElement(block);
                // Set data-key for DOMDiff tracking
                element.setAttribute('data-key', block.id);
                return element;
            },
            (element, block) => {
                // Update existing element instead of replacing
                this.updateBlockElement(element, block);
                this.blocksWithHandlers.add(block.id);
                // Ensure data-key is set
                element.setAttribute('data-key', block.id);
            },
            (block) => block.id
        );
        
        // After rendering, verify all blocks are visible
        state.blocks.forEach((block) => {
            const blockElement = blocksLayer.querySelector(`#block-${block.id}`) as HTMLElement;
            if (!blockElement) {
                console.warn(`[CanvasRenderer] Block ${block.id} element not found after render`);
            } else {
                // Ensure block is visible
                if (blockElement.style.display === 'none' || blockElement.style.visibility === 'hidden') {
                    console.warn(`[CanvasRenderer] Block ${block.id} was hidden, fixing...`);
                    blockElement.style.display = 'block';
                    blockElement.style.visibility = 'visible';
                    blockElement.style.opacity = '1';
                }
            }
        });
    }
    
    /**
     * Update an existing block element
     * Optimized to only update position/styles, not innerHTML unless necessary
     */
    private updateBlockElement(element: HTMLElement, block: VisualBlock): void {
        // Always ensure element is visible
        element.style.display = 'block';
        element.style.visibility = 'visible';
        element.style.opacity = '1';
        
        // Update position and size (this is the most common update during dragging)
        DOMUpdater.updateElement(element, {
            styles: {
                left: `${block.position.x}px`,
                top: `${block.position.y}px`,
                width: `${block.width}px`,
                minHeight: `${block.height}px`,
                display: 'block',
                visibility: 'visible',
                opacity: '1'
            },
            classes: [
                'workflow-block',
                `block-type-${block.type}`,
                ...(block.selected ? ['selected'] : [])
            ]
        });
        
        // Update border color
        const color = this.getBlockColor(block.type);
        element.style.borderColor = color;
        
        // Only update innerHTML if block data changed
        // Check if we need to update content by comparing block data hash
        const blockData = this.getBlockData(block.id);
        const currentDataHash = blockData ? JSON.stringify({
            name: blockData.name,
            type: blockData.type,
            config: blockData.config
        }) : '';
        const storedHash = (element as any).__dataHash;
        
        if (currentDataHash !== storedHash) {
            // Block data changed, need to re-render content
        const renderer = BlockRendererFactory.createRenderer(block, blockData);
        renderer.updatePorts();
            element.innerHTML = renderer.render();
            (element as any).__dataHash = currentDataHash;
            
            // Re-setup event handlers only when content changes
            this.setupBlockEventHandlers(element, block);
        }
        // If only position changed, we don't need to update innerHTML or re-setup handlers
    }
    
    /**
     * Setup event handlers for a block element
     */
    private setupBlockEventHandlers(element: HTMLElement, block: VisualBlock): void {
        // Note: These event listeners are added to dynamically created elements
        // They will be cleaned up when the element is removed from DOM
        element.addEventListener('mousedown', (e) => this.onBlockMouseDown(e, block.id));
        element.addEventListener('click', (e) => this.onBlockClick(e, block.id));
        
        // HTTP Request inline editors
        this.setupHttpRequestHandlers(element, block.id);
        
        // Port event handlers
        const portTabs = element.querySelectorAll('.port-input-tab, .port-output-tab, .port-row');
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
        this.setupProfileHandlers(element, block.id);
        
        // Block-specific handlers
        if (block.type === 'start') {
            this.blockEventHandler.setupStartBlockInputHandlers(element, block.id);
        }
        
        if (block.type === 'end') {
            this.blockEventHandler.setupEndBlockOutputHandlers(element, block.id);
        }
        
        if (block.type === 'variable' || block.type === 'http-request') {
            this.blockEventHandler.setupEditableKeyValueHandlers(element, block.id);
        }
        
        // Delete button handler
        const deleteBtn = element.querySelector('.block-delete-btn') as HTMLButtonElement;
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
    }
    
    /**
     * Create a block DOM element
     */
    private createBlockElement(block: VisualBlock): HTMLElement {
        const div = document.createElement('div');
        div.className = `workflow-block block-type-${block.type} ${block.selected ? 'selected' : ''}`;
        div.id = `block-${block.id}`;
        div.style.position = 'absolute';
        div.style.left = `${block.position.x}px`;
        div.style.top = `${block.position.y}px`;
        div.style.width = `${block.width}px`;
        div.style.minHeight = `${block.height}px`;
        div.style.display = 'block';
        div.style.visibility = 'visible';
        div.style.opacity = '1';
        
        const blockData = this.getBlockData(block.id);
        const renderer = BlockRendererFactory.createRenderer(block, blockData);
        renderer.updatePorts();
        
        const color = this.getBlockColor(block.type);
        div.style.borderColor = color;
        div.innerHTML = renderer.render();
        
        // Setup event handlers
        this.setupBlockEventHandlers(div, block);
        
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
     * Get port tab position (memoized wrapper)
     */
    private getPortTabPosition(block: VisualBlock, port: VisualPort): Position {
        return this.memoizedGetPortTabPosition(block, port);
    }
    
    /**
     * Calculate port tab position (actual calculation - memoized)
     */
    private calculatePortTabPosition(block: VisualBlock, port: VisualPort): Position {
        const blockElement = DOMUpdater.query<HTMLElement>(document, `#block-${block.id}`);
        
        if (blockElement) {
            const portType = port.position.x > 0 ? 'output' : 'input';
            
            // Try multiple selectors to find the port element
            let portElement: Element | null = null;
            
            // First try: port-input-tab or port-output-tab with data-port attribute
            portElement = blockElement.querySelector(`.port-${portType}-tab[data-port="${port.name}"]`);
            
            // Second try: port-row with port type and data-port attribute
            if (!portElement) {
                portElement = blockElement.querySelector(`.port-row.port-${portType}[data-port="${port.name}"]`);
            }
            
            // Third try: any port-row with data-port (for Start/End blocks that combine input/output)
            if (!portElement) {
                portElement = blockElement.querySelector(`.port-row[data-port="${port.name}"]`);
            }
            
            if (portElement) {
                // Find the actual port-tab element (the circular connection point)
                const tabElement = portElement.querySelector('.port-tab');
                
                if (tabElement) {
                    const rect = tabElement.getBoundingClientRect();
                    const canvasWrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
                    
                    if (canvasWrapper) {
                        const canvasRect = canvasWrapper.getBoundingClientRect();
                        const scale = this.zoomPanManager.getZoomLevel();
                        
                        // Calculate position relative to canvas, accounting for scroll and zoom
                        const x = (rect.left - canvasRect.left + canvasWrapper.scrollLeft + (rect.width / 2)) / scale;
                        const y = (rect.top - canvasRect.top + canvasWrapper.scrollTop + (rect.height / 2)) / scale;
                        
                        return { x, y };
                    }
                }
            }
        }
        console.warn('Failed to calculate port tab position for block', block.id, 'port', port.name);
        // Fallback: calculate position from block position + port offset
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
        const wrapper = DOMUpdater.query<HTMLElement>(this.container, '.canvas-wrapper');
        if (wrapper) {
        const position = this.zoomPanManager.screenToCanvas(e.clientX, e.clientY);
        this.emit('drop', position);
        }
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
        
        // Handle connection preview - render connections when mouse moves during connection
        if (state.isConnecting && state.connectionStart) {
            // Trigger render to update preview line
            this.renderConnections();
        }
        
        // Handle connection hover (rendering is automatic via subscription)
        if (!state.isConnecting) {
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
        
        if (state.isDragging && state.draggedBlockId) {
            // CRITICAL: Ensure the final position update is emitted with the current mouse position
            // This prevents the block from being rendered at a lagged position
            const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
            if (wrapper) {
                const mousePosition = this.zoomPanManager.screenToCanvas(e.clientX, e.clientY);
                const finalPosition = {
                    x: mousePosition.x - state.dragOffset.x,
                    y: mousePosition.y - state.dragOffset.y
                };
                
                // Emit the final position update
                this.emit('blockMove', {
                    blockId: state.draggedBlockId,
                    position: finalPosition
                });
                
                // Force immediate render with the final position
                // This happens synchronously before ending drag state
                this.renderBlocks();
            }
            
            // Then end the dragging state
            this.stateManager.setDragging(false);
            
            // Now render connections after blocks are at their final positions
            // Use multiple RAF to ensure DOM has fully updated and reflowed
            requestAnimationFrame(() => {
                this.renderBlocks(); // Ensure blocks are at final position
                requestAnimationFrame(() => {
                    this.renderConnections(); // Render connections with accurate port positions
                });
            });
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
            // Rendering is automatic via subscription
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
        // Connection rendering is automatic via subscription
        // Only need to update temporary connection if connecting
        this.updateTemporaryConnection();
    }
    
    public zoomOut(): void {
        this.zoomPanManager.zoomOut();
        this.updateTemporaryConnection();
    }
    
    public zoomReset(): void {
        this.zoomPanManager.zoomReset();
        this.updateTemporaryConnection();
    }
    
    public zoomFitToScreen(): void {
        const state = this.stateManager.getState();
        this.zoomPanManager.zoomFitToScreen(state.blocks);
        this.updateTemporaryConnection();
    }
    
    /**
     * Update only the temporary connection during zoom/pan
     * Full render happens automatically via subscription
     */
    private updateTemporaryConnection(): void {
        const state = this.stateManager.getState();
        if (state.isConnecting && state.connectionStart) {
            // Only update the temporary connection path, not all connections
            this.connectionRenderer.renderConnections(
                state.connections,
                state.blocks,
                state.isConnecting,
                state.connectionStart,
                state.mousePosition,
                (block, port) => this.getPortTabPosition(block, port)
            );
        }
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
    
    public setCanvasSize(_width: number, _height: number): void {
        // Canvas is now infinite size - this method is kept for compatibility but does nothing
        // The canvas is always 100000x100000, only the viewport (visible area) changes
    }
    
    public getCanvasSize(): { width: number; height: number } {
        // Return infinite size
        return { width: 100000, height: 100000 };
    }
    
    /**
     * Get the state manager (for DevTools integration)
     */
    public getStateManager(): CanvasStateManager {
        return this.stateManager;
    }
    
    /**
     * Cleanup method - destroys all child components
     */
    destroy(): void {
        // Clean up all block event handlers
        this.blockEventHandler.destroy();
        
        // Destroy DevTools if initialized
        this.devTools?.destroy();
        
        // Call parent destroy to clean up event listeners
        super.destroy();
    }
}
