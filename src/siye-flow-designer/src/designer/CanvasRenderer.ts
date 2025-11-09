import { VisualBlock, VisualConnection, VisualPort, Position, SimpleEventEmitter } from './VisualModels';
import { AnyWorkflowBlock } from '../models/workflow-models';
import { BlockRendererFactory } from './renderers/BlockRendererFactory';
import { AddItemModal } from '../components/AddItemModal';
import { ConfirmModal } from '../components/ConfirmModal';

/**
 * Canvas renderer for drawing workflow blocks and connections
 */
export class CanvasRenderer extends SimpleEventEmitter {
    private container: HTMLElement;
    private svg!: SVGElement;
    
    private blocks: Map<string, VisualBlock> = new Map();
    private connections: Map<string, VisualConnection> = new Map();
    private blockDataMap: Map<string, AnyWorkflowBlock> = new Map();
    
    private isDragging = false;
    private draggedBlockId: string | null = null;
    private dragOffset: Position = { x: 0, y: 0 };
    
    private isPanning = false;
    private panStart: Position = { x: 0, y: 0 };
    private panMode = false;
    
    private isConnecting = false;
    private connectionStart: { blockId: string, portName: string, position: Position } | null = null;
    private mousePosition: Position = { x: 0, y: 0 };
    
    private hoveredConnection: string | null = null;
    private deleteButtonElement: SVGForeignObjectElement | null = null;
    private addItemModal: AddItemModal;
    private confirmModal: ConfirmModal;
    
    private zoomLevel: number = 1.0;
    private minZoom: number = 0.25;
    private maxZoom: number = 3.0;
    private zoomStep: number = 0.1;
    private canvasWrapper!: HTMLElement;
    private canvasWidth: number = 4000;
    private canvasHeight: number = 4000;
    
    constructor(containerId: string) {
        super();
        
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        this.container = element;
        this.setupCanvas();
        
        // Initialize modals
        this.addItemModal = new AddItemModal();
        this.confirmModal = new ConfirmModal();
        
        // Get canvas wrapper reference after setupCanvas
        this.canvasWrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (this.canvasWrapper) {
            this.applyZoom();
        }
    }
    
    /**
     * Setup the canvas and SVG elements
     */
    private setupCanvas(): void {
        this.container.innerHTML = `
            <div class="canvas-wrapper" style="position: relative; width: ${this.canvasWidth}px; height: ${this.canvasHeight}px;">
                <svg class="connections-svg" style="position: absolute; top: 0; left: 0; width: ${this.canvasWidth}px; height: ${this.canvasHeight}px; z-index: 0;">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff" />
                        </marker>
                    </defs>
                </svg>
                <div class="blocks-layer" style="position: relative; width: ${this.canvasWidth}px; height: ${this.canvasHeight}px;"></div>
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
        
        // Capture mousedown on wrapper for pan mode (works everywhere in pan mode)
        wrapper.addEventListener('mousedown', (e) => {
            if (this.panMode) {
                // In pan mode, always start panning (unless clicking on minimap or other UI elements)
                const target = e.target as HTMLElement;
                if (!target.closest('#minimap-container') && 
                    !target.closest('.floating-panel') &&
                    !target.closest('.property-panel')) {
                    this.onCanvasMouseDown(e);
                }
            }
        }, true); // Use capture phase to get event before blocks
    }
    
    /**
     * Render the workflow
     */
    public render(blocks: Map<string, VisualBlock>, connections: Map<string, VisualConnection>): void {
        this.blocks = blocks;
        this.connections = connections;
        
        this.renderBlocks();
        this.renderConnections();
    }
    
    /**
     * Set block data for rich display
     */
    public setBlockData(blockData: Map<string, AnyWorkflowBlock>): void {
        this.blockDataMap = blockData;
        // Re-render if we have blocks
        if (this.blocks.size > 0) {
            this.renderBlocks();
        }
    }
    
    /**
     * Render all blocks
     */
    private renderBlocks(): void {
        const blocksLayer = this.container.querySelector('.blocks-layer');
        if (!blocksLayer) return;
        
        // Clear existing blocks
        blocksLayer.innerHTML = '';
        
        // Render each block
        this.blocks.forEach((block) => {
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
        
        // Get block data and create renderer
        const blockData = this.getBlockData(block.id);
        const renderer = BlockRendererFactory.createRenderer(block, blockData);
        
        // Update ports
        renderer.updatePorts();
        
        // Set border color
        const color = this.getBlockColor(block.type);
        div.style.borderColor = color;
        
        // Render block content
        div.innerHTML = renderer.render();
        
        // Add event handlers
        div.addEventListener('mousedown', (e) => this.onBlockMouseDown(e, block.id));
        div.addEventListener('click', (e) => this.onBlockClick(e, block.id));
        
        // HTTP Request inline editors (method, url, body)
        const methodSelect = div.querySelector('.http-method-select') as HTMLSelectElement | null;
        if (methodSelect) {
            // Prevent drag/select while interacting
            methodSelect.addEventListener('mousedown', (e) => e.stopPropagation());
            methodSelect.addEventListener('click', (e) => e.stopPropagation());
            methodSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                const value = (e.target as HTMLSelectElement).value;
                this.emit('propertyChange', { blockId: block.id, property: 'config.method', value });
            });
        }
        
        // Success Evaluator toggle
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
                this.emit('propertyChange', { blockId: block.id, property: 'config.url', value });
            };
            // Apply on Enter to avoid losing focus while typing
            urlInput.addEventListener('keydown', (e) => {
                if ((e as KeyboardEvent).key === 'Enter') {
                    e.stopPropagation();
                    e.preventDefault();
                    fireUrl();
                    // Keep focus after apply
                    urlInput.focus();
                }
            });
            urlInput.addEventListener('blur', (e) => {
                e.stopPropagation();
                fireUrl();
            });
        }
        // Success evaluator editor
        const evaluator = div.querySelector('.http-success-evaluator') as HTMLTextAreaElement | null;
        if (evaluator) {
            evaluator.addEventListener('mousedown', (e) => e.stopPropagation());
            evaluator.addEventListener('click', (e) => e.stopPropagation());
            const fireEval = () => {
                const value = evaluator.value;
                this.emit('propertyChange', { blockId: block.id, property: 'config.successEvaluator', value });
                // Ensure language is set to typescript
                this.emit('propertyChange', { blockId: block.id, property: 'config.evaluatorLanguage', value: 'typescript' });
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
                    // Try parse JSON to keep object type consistent with executor expectations
                    value = raw.trim() ? JSON.parse(raw) : null;
                } catch {
                    // keep as raw string if not valid JSON
                    value = raw;
                }
                this.emit('propertyChange', { blockId: block.id, property: 'config.body', value });
            };
            bodyTextarea.addEventListener('input', (e) => {
                e.stopPropagation();
                // Input-level updates to keep URL-derived ports in sync if body contains variables
                // Emit but parsing might be mid-typing; allow string fallback
                fireBody();
            });
            bodyTextarea.addEventListener('blur', (e) => {
                e.stopPropagation();
                fireBody();
            });
        }
        // no edit toggle (advanced panel removed; body shown when applicable)
        
        // Port event handlers - handle both dual-row (Start) and single-row (other blocks)
        const portTabs = div.querySelectorAll('.port-input-tab, .port-output-tab, .port-row');
        portTabs.forEach(port => {
            port.addEventListener('mousedown', (e) => this.onPortMouseDown(e as MouseEvent));
            
            // Double-click on input port to delete connection
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
        const profileDropdown = div.querySelector('.profile-dropdown') as HTMLSelectElement;
        if (profileDropdown) {
            // Prevent block selection when clicking on dropdown
            profileDropdown.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            profileDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            profileDropdown.addEventListener('change', (e) => {
                e.stopPropagation();
                const target = e.target as HTMLSelectElement;
                const selectedProfile = target.value;
                this.emit('profileChange', { blockId: block.id, profile: selectedProfile });
            });
        }
        
        // Profile actions button and dropdown
        const profileActionsBtn = div.querySelector('.btn-profile-actions') as HTMLElement;
        const profileActionsDropdown = div.querySelector('.profile-actions-dropdown') as HTMLElement;
        if (profileActionsBtn && profileActionsDropdown) {
            profileActionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const isVisible = profileActionsDropdown.style.display === 'block';
                profileActionsDropdown.style.display = isVisible ? 'none' : 'block';
            });
            
            // Profile action items
            profileActionsDropdown.querySelectorAll('.profile-action-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const action = (item as HTMLElement).dataset.action;
                    const profileName = (item as HTMLElement).dataset.profile;
                    
                    if (action === 'add') {
                        this.emit('startBlockAddProfile', { blockId: block.id });
                    } else if (action === 'delete' && profileName) {
                        this.confirmModal.show(
                            `Delete profile "${profileName}"?`,
                            'Delete Profile',
                            'Delete',
                            'Cancel',
                            () => {
                                this.emit('startBlockDeleteProfile', { blockId: block.id, profileName });
                            }
                        );
                    } else if (action === 'set-default' && profileName) {
                        this.emit('startBlockSetDefaultProfile', { blockId: block.id, profileName });
                    }
                    
                    profileActionsDropdown.style.display = 'none';
                });
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!profileActionsBtn.contains(target) && !profileActionsDropdown.contains(target)) {
                    profileActionsDropdown.style.display = 'none';
                }
            });
        }
        
        // Start block input handlers
        if (block.type === 'start') {
            this.setupStartBlockInputHandlers(div, block.id);
        }
        
        // End block output handlers
        if (block.type === 'end') {
            this.setupEndBlockOutputHandlers(div, block.id);
        }
        
        // Variable/Header/Output management handlers for other blocks
        if (block.type === 'variable' || block.type === 'http-request') {
            this.setupEditableKeyValueHandlers(div, block.id);
        }
        
        // Delete button handler - must be attached AFTER innerHTML is set
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
        // Clear existing connections (groups and paths)
        const existingConnections = this.svg.querySelectorAll('.edge-group, path.connection');
        existingConnections.forEach(el => el.remove());
        
        // Render each connection
        this.connections.forEach(connection => {
            const element = this.createConnectionPath(connection);
            if (element) {
                this.svg.appendChild(element);
            }
        });
        
        // Render connection being drawn
        if (this.isConnecting && this.connectionStart) {
            const tempPath = this.createTempConnectionPath();
            if (tempPath) {
                this.svg.appendChild(tempPath);
            }
        }
    }
    
    /**
     * Create a connection path element
     */
    private createConnectionPath(connection: VisualConnection): SVGPathElement | null {
        const sourceBlock = this.blocks.get(connection.sourceBlockId);
        const targetBlock = this.blocks.get(connection.targetBlockId);
        
        if (!sourceBlock || !targetBlock) return null;
        
        // Find the ports
        const sourcePort = sourceBlock.outputPorts?.find(p => p.name === connection.sourcePortName);
        const targetPort = targetBlock.inputPorts?.find(p => p.name === connection.targetPortName);
        
        if (!sourcePort || !targetPort) return null;
        
        // Get absolute positions of port tabs using centralized method
        const start = this.getPortTabPosition(sourceBlock, sourcePort);
        const end = this.getPortTabPosition(targetBlock, targetPort);
        
        // Create path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', `connection connection-line`);
        path.setAttribute('d', this.getPathData(start, end));
        path.setAttribute('data-connection-id', connection.id);
        path.setAttribute('stroke', '#58a6ff');
        path.setAttribute('stroke-width', '2.5');
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        
        return path;
    }
    
    /**
     * Create temporary connection path while dragging
     */
    private createTempConnectionPath(): SVGPathElement | null {
        if (!this.connectionStart) return null;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connection temp-connection');
        path.setAttribute('d', this.getPathData(this.connectionStart.position, this.mousePosition));
        path.setAttribute('stroke-dasharray', '5,5');
        
        return path;
    }
    
    /**
     * Get SVG path data with straight segments and curve
     */
    private getPathData(start: Position, end: Position): string {
        // FIXED constant straight lengths
        const outputStraight = 60; // Always 60px straight from output port
        const inputStraight = 60;  // Always 60px straight to input port
        
        // Calculate straight segment endpoints
        // Output side: goes RIGHT from output port
        const outEndX = start.x + outputStraight;
        const outEndY = start.y; // Keep same Y (horizontal)
        
        // Input side: comes from LEFT to input port
        const inStartX = end.x - inputStraight;
        const inStartY = end.y; // Keep same Y (horizontal)
        
        // Calculate curve between the two straight segments
        const horizontalGap = inStartX - outEndX;
        
        // Curve control points (positioned along the straight segments)
        const curveDistance = Math.min(Math.abs(horizontalGap) / 2, 80);
        
        const cp1x = outEndX + curveDistance; // Control point extends from output straight
        const cp1y = outEndY;                  // Stays at output Y level initially
        
        const cp2x = inStartX - curveDistance; // Control point extends from input straight
        const cp2y = inStartY;                  // Stays at input Y level
        
        // SVG Path with straight segments on both sides
        return `M ${start.x} ${start.y} L ${outEndX} ${outEndY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${inStartX} ${inStartY} L ${end.x} ${end.y}`;
    }
    
    /**
     * Get block data by ID
     */
    private getBlockData(blockId: string): AnyWorkflowBlock | undefined {
        return this.blockDataMap.get(blockId);
    }
    
    /**
     * Get absolute position of a port tab from the actual DOM element
     */
    private getPortTabPosition(block: VisualBlock, port: VisualPort): Position {
        const blockElement = document.getElementById(`block-${block.id}`);
        
        if (blockElement) {
            const portType = port.position.x > 0 ? 'output' : 'input';
            
            // Try dual-row style first (Start blocks)
            let portElement = blockElement.querySelector(`.port-${portType}-tab[data-port="${port.name}"]`);
            
            // If not found, try standard port-row style (other blocks)
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
                        const scale = this.getZoomLevel() || 1;
                        
                        // Return center of the actual rendered tab, converted back to canvas coordinates
                        return {
                            x: (rect.left - canvasRect.left + canvasWrapper.scrollLeft + (rect.width / 2)) / scale,
                            y: (rect.top - canvasRect.top + canvasWrapper.scrollTop + (rect.height / 2)) / scale
                        };
                    }
                }
            }
        }
        
        // Fallback to calculated position
        return {
            x: block.position.x + port.position.x,
            y: block.position.y + port.position.y
        };
    }
    
    /**
     * Delete connection to a specific port
     */
    private deleteConnectionToPort(blockId: string, portName: string): void {
        // Find connection(s) that end at this port
        const connectionsToDelete: string[] = [];
        
        this.connections.forEach((connection, connectionId) => {
            if (connection.targetBlockId === blockId && connection.targetPortName === portName) {
                connectionsToDelete.push(connectionId);
            }
        });
        
        // Delete all connections to this port
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
        const rect = wrapper.getBoundingClientRect();
        const scale = this.getZoomLevel() || 1;
        const position = {
            x: (e.clientX - rect.left + wrapper.scrollLeft) / scale,
            y: (e.clientY - rect.top + wrapper.scrollTop) / scale
        };
        this.emit('drop', position);
    }
    
    private onBlockMouseDown(e: MouseEvent, blockId: string): void {
        // If in pan mode, don't interact with blocks - pan mode will handle it via capture phase
        if (this.panMode) {
            return; // Let the capture phase handler (pan mode) handle it
        }
        
        const target = e.target as HTMLElement;
        
        // Ignore clicks on interactive elements
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
        this.isDragging = true;
        this.draggedBlockId = blockId;
        
        const block = this.blocks.get(blockId);
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (block && wrapper) {
            const rect = wrapper.getBoundingClientRect();
            const scale = this.getZoomLevel() || 1;
            const pointerX = (e.clientX - rect.left + wrapper.scrollLeft) / scale;
            const pointerY = (e.clientY - rect.top + wrapper.scrollTop) / scale;
            this.dragOffset = {
                x: pointerX - block.position.x,
                y: pointerY - block.position.y
            };
        }
    }
    
    private onBlockClick(e: MouseEvent, blockId: string): void {
        const target = e.target as HTMLElement;
        
        // Ignore clicks on interactive elements
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
        if (!this.panMode) return;
        
        e.preventDefault();
        e.stopPropagation();
        this.isPanning = true;
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (wrapper) {
            this.panStart = {
                x: e.clientX + wrapper.scrollLeft,
                y: e.clientY + wrapper.scrollTop
            };
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
        
        const rect = wrapper.getBoundingClientRect();
        const scale = this.getZoomLevel() || 1;
        this.mousePosition = {
            x: (e.clientX - rect.left + wrapper.scrollLeft) / scale,
            y: (e.clientY - rect.top + wrapper.scrollTop) / scale
        };
        
        // Handle panning
        if (this.isPanning && this.panMode) {
            e.preventDefault();
            const deltaX = this.panStart.x - e.clientX;
            const deltaY = this.panStart.y - e.clientY;
            wrapper.scrollLeft = deltaX;
            wrapper.scrollTop = deltaY;
            return; // Don't process other mouse actions while panning
        }
        
        if (this.isDragging && this.draggedBlockId) {
            const pointerX = (e.clientX - rect.left + wrapper.scrollLeft) / scale;
            const pointerY = (e.clientY - rect.top + wrapper.scrollTop) / scale;
            const position = {
                x: pointerX - this.dragOffset.x,
                y: pointerY - this.dragOffset.y
            };
            
            this.emit('blockMove', {
                blockId: this.draggedBlockId,
                position
            });
        }
        
        if (this.isConnecting) {
            this.renderConnections();
        } else {
            // Check if mouse is near a connection
            this.checkConnectionHover();
        }
    }
    
    /**
     * Check if mouse is near any connection and show delete button
     */
    private checkConnectionHover(): void {
        const HOVER_DISTANCE = 10; // pixels
        let nearestConnection: { id: string; distance: number } | null = null;
        
        for (const [id, connection] of this.connections.entries()) {
            const sourceBlock = this.blocks.get(connection.sourceBlockId);
            const targetBlock = this.blocks.get(connection.targetBlockId);
            
            if (!sourceBlock || !targetBlock) continue;
            
            // Get ports
            const sourcePort = sourceBlock.outputPorts?.find(p => p.name === connection.sourcePortName);
            const targetPort = targetBlock.inputPorts?.find(p => p.name === connection.targetPortName);
            
            if (!sourcePort || !targetPort) continue;
            
            // Use centralized method to get port tab positions
            const start = this.getPortTabPosition(sourceBlock, sourcePort);
            const end = this.getPortTabPosition(targetBlock, targetPort);
            
            const startX = start.x;
            const startY = start.y;
            const endX = end.x;
            const endY = end.y;
            
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            const distance = Math.sqrt(
                Math.pow(this.mousePosition.x - midX, 2) + 
                Math.pow(this.mousePosition.y - midY, 2)
            );
            
            if (distance < HOVER_DISTANCE && (!nearestConnection || distance < nearestConnection.distance)) {
                nearestConnection = { id, distance };
            }
        }
        
        if (nearestConnection) {
            const connectionId = nearestConnection.id;
            if (connectionId !== this.hoveredConnection) {
                this.hoveredConnection = connectionId;
                this.showDeleteButton(this.mousePosition, connectionId);
            } else if (this.deleteButtonElement) {
            // Update button position
            this.deleteButtonElement.setAttribute('x', String(this.mousePosition.x - 12));
            this.deleteButtonElement.setAttribute('y', String(this.mousePosition.y - 12));
            }
        } else if (this.hoveredConnection) {
            this.hoveredConnection = null;
            this.hideDeleteButton();
        }
    }
    
    /**
     * Show delete button at mouse position
     */
    private showDeleteButton(position: Position, connectionId: string): void {
        this.hideDeleteButton();
        
        const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foreignObject.setAttribute('width', '24');
        foreignObject.setAttribute('height', '24');
        foreignObject.setAttribute('x', String(position.x - 12));
        foreignObject.setAttribute('y', String(position.y - 12));
        foreignObject.setAttribute('class', 'connection-delete-floating');
        
        const button = document.createElement('button');
        button.innerHTML = '✕';
        button.style.cssText = `
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #da3633;
            border: 2px solid #f85149;
            color: white;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        `;
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.emit('connectionDelete', { connectionId });
        });
        
        foreignObject.appendChild(button);
        this.svg.appendChild(foreignObject);
        this.deleteButtonElement = foreignObject;
    }
    
    /**
     * Hide delete button
     */
    private hideDeleteButton(): void {
        if (this.deleteButtonElement) {
            this.deleteButtonElement.remove();
            this.deleteButtonElement = null;
        }
    }
    
    private onMouseUp(e: MouseEvent): void {
        if (this.isPanning) {
            this.isPanning = false;
            const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
            if (wrapper && this.panMode) {
                wrapper.style.cursor = 'grab';
            }
        }
        
        if (this.isDragging) {
            this.isDragging = false;
            this.draggedBlockId = null;
        }
        
        if (this.isConnecting) {
            const target = e.target as HTMLElement;
            const portElement = target.closest('.port-input-tab, .port-row') as HTMLElement;
            
            if (portElement && portElement.dataset.portType === 'input') {
                const targetBlockId = portElement.dataset.block;
                const targetPortName = portElement.dataset.port;
                if (targetBlockId && targetPortName && this.connectionStart) {
                    this.emit('connectionCreate', {
                        sourceBlockId: this.connectionStart.blockId,
                        sourcePortName: this.connectionStart.portName,
                        targetBlockId: targetBlockId,
                        targetPortName: targetPortName
                    });
                }
            }
            
            this.isConnecting = false;
            this.connectionStart = null;
            this.renderConnections();
        }
    }
    
    /**
     * Setup event handlers for Start block editable inputs
     */
    private setupStartBlockInputHandlers(blockElement: HTMLElement, blockId: string): void {
        // Add input button (Start block) - add directly without popup
        blockElement.querySelectorAll('.btn-add-input-on-block, .btn-add-item-popup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // Add directly without popup
                this.emit('startBlockAddInput', { blockId });
            });
        });
        
        // Edit button - open popup for editing
        blockElement.querySelectorAll('.btn-edit-input').forEach(btn => {
            const inputName = (btn as HTMLElement).dataset.inputName;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (inputName) {
                    const blockData = this.getBlockData(blockId);
                    if (blockData && blockData.type === 'start') {
                        const startBlock = blockData as any;
                        // Get effective inputs from profile or direct inputs
                        let effectiveInputs: Record<string, any> = {};
                        if (startBlock.config.profiles && startBlock.config.profiles.length > 0) {
                            const selectedProfile = startBlock.config.profiles.find((p: any) => p.name === startBlock.config.selectedProfile) ||
                                                   startBlock.config.profiles.find((p: any) => p.default) ||
                                                   startBlock.config.profiles[0];
                            effectiveInputs = selectedProfile?.inputs || {};
                        } else {
                            effectiveInputs = startBlock.config.inputs || {};
                        }
                        const inputDef = effectiveInputs[inputName];
                        
                        if (inputDef) {
                            const inputType = inputDef.type || 'string';
                            const inputValue = inputDef.value || inputDef.default || '';
                            
                            this.addItemModal.show(
                                'input',
                                'input',
                                (name: string, type: string, value: string) => {
                                    // Convert value based on type
                                    let finalValue: any = value;
                                    try {
                                        switch (type) {
                                            case 'number':
                                                finalValue = value ? parseFloat(value) : 0;
                                                break;
                                            case 'boolean':
                                                finalValue = value.toLowerCase() === 'true';
                                                break;
                                            case 'array':
                                                finalValue = value ? JSON.parse(value) : [];
                                                break;
                                            case 'object':
                                                finalValue = value ? JSON.parse(value) : {};
                                                break;
                                            default:
                                                finalValue = value;
                                        }
                                    } catch {
                                        finalValue = value;
                                    }
                                    
                                    // Update the input
                                    if (name !== inputName) {
                                        // Rename
                                        this.emit('startBlockRenameInput', { blockId, oldName: inputName, newName: name });
                                        // Update value and type
                                        setTimeout(() => {
                                            this.emit('startBlockInputTypeChange', { blockId, inputName: name, type });
                                            this.emit('startBlockInputValueChange', { blockId, inputName: name, value: finalValue });
                                        }, 100);
                                    } else {
                                        // Just update value and type
                                        this.emit('startBlockInputTypeChange', { blockId, inputName, type });
                                        this.emit('startBlockInputValueChange', { blockId, inputName, value: finalValue });
                                    }
                                },
                                inputName,
                                inputType,
                                String(inputValue)
                            );
                        }
                    }
                }
            });
        });
        
        // Delete input button
        blockElement.querySelectorAll('.btn-delete-input').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const inputName = (btn as HTMLElement).dataset.inputName;
                if (inputName) {
                    this.emit('startBlockDeleteInput', { blockId, inputName });
                }
            });
        });
        
        // Input name change
        blockElement.querySelectorAll('.block-input-name').forEach(input => {
            input.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();
                if (originalName && newName && newName !== originalName) {
                    this.emit('startBlockRenameInput', { blockId, oldName: originalName, newName });
                }
            });
        });
        
        // Input value change - handle both input and blur events
        blockElement.querySelectorAll('.block-input-value, .block-input-name').forEach(input => {
            // Prevent block drag when clicking on inputs
            input.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Handle value changes
            if (input.classList.contains('block-input-value')) {
                input.addEventListener('input', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const inputName = target.dataset.inputName;
                    const value = target.value;
                    if (inputName) {
                        this.emit('startBlockInputValueChange', { blockId, inputName, value });
                    }
                });
                input.addEventListener('blur', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const inputName = target.dataset.inputName;
                    const value = target.value;
                    if (inputName) {
                        this.emit('startBlockInputValueChange', { blockId, inputName, value });
                    }
                });
            }
        });
        
        // Input type change
        blockElement.querySelectorAll('.input-type-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const typeSelector = (option as HTMLElement).closest('.input-type-selector');
                const inputName = typeSelector?.getAttribute('data-input-name');
                const newType = (option as HTMLElement).dataset.type;
                if (inputName && newType) {
                    this.emit('startBlockInputTypeChange', { blockId, inputName, type: newType });
                }
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!blockElement.contains(target)) {
                blockElement.querySelectorAll('.input-type-dropdown').forEach(dropdown => {
                    (dropdown as HTMLElement).style.display = 'none';
                });
            }
        });
    }
    
    /**
     * Setup event handlers for End block editable outputs
     */
    private setupEndBlockOutputHandlers(blockElement: HTMLElement, blockId: string): void {
        // Add output button
        blockElement.querySelectorAll('.btn-add-item-popup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.emit('endBlockAddOutput', { blockId });
            });
        });
        
        // Edit button
        blockElement.querySelectorAll('.btn-edit-output').forEach(btn => {
            const outputName = (btn as HTMLElement).dataset.outputName;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (outputName) {
                    const blockData = this.getBlockData(blockId);
                    if (blockData && blockData.type === 'end') {
                        const endBlock = blockData as any;
                        const outputs = endBlock.config?.outputs || {};
                        const outputDef = outputs[outputName];
                        
                        if (outputDef) {
                            const outputType = outputDef.type || 'string';
                            const outputValue = outputDef.value || '';
                            
                            this.addItemModal.show(
                                'output',
                                'output',
                                (name: string, type: string, value: string) => {
                                    let finalValue: any = value;
                                    try {
                                        switch (type) {
                                            case 'number':
                                                finalValue = value ? parseFloat(value) : 0;
                                                break;
                                            case 'boolean':
                                                finalValue = value.toLowerCase() === 'true';
                                                break;
                                            case 'array':
                                                finalValue = value ? JSON.parse(value) : [];
                                                break;
                                            case 'object':
                                                finalValue = value ? JSON.parse(value) : {};
                                                break;
                                            default:
                                                finalValue = value;
                                        }
                                    } catch {
                                        finalValue = value;
                                    }
                                    
                                    if (name !== outputName) {
                                        this.emit('endBlockRenameOutput', { blockId, oldName: outputName, newName: name });
                                        setTimeout(() => {
                                            this.emit('endBlockOutputTypeChange', { blockId, outputName: name, type });
                                            this.emit('endBlockOutputValueChange', { blockId, outputName: name, value: finalValue });
                                        }, 100);
                                    } else {
                                        this.emit('endBlockOutputTypeChange', { blockId, outputName, type });
                                        this.emit('endBlockOutputValueChange', { blockId, outputName, value: finalValue });
                                    }
                                },
                                outputName,
                                outputType,
                                String(outputValue)
                            );
                        }
                    }
                }
            });
        });
        
        // Delete output button
        blockElement.querySelectorAll('.btn-delete-output').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const outputName = (btn as HTMLElement).dataset.outputName;
                if (outputName) {
                    this.emit('endBlockDeleteOutput', { blockId, outputName });
                }
            });
        });
        
        // Output name change
        blockElement.querySelectorAll('.block-output-name').forEach(input => {
            input.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();
                if (originalName && newName && newName !== originalName) {
                    this.emit('endBlockRenameOutput', { blockId, oldName: originalName, newName });
                }
            });
        });
        
        // Output value change
        blockElement.querySelectorAll('.block-output-value, .block-output-name').forEach(input => {
            input.addEventListener('mousedown', (e) => e.stopPropagation());
            input.addEventListener('click', (e) => e.stopPropagation());
            
            if (input.classList.contains('block-output-value')) {
                input.addEventListener('input', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const outputName = target.dataset.outputName;
                    const value = target.value;
                    if (outputName) {
                        this.emit('endBlockOutputValueChange', { blockId, outputName, value });
                    }
                });
                input.addEventListener('blur', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const outputName = target.dataset.outputName;
                    const value = target.value;
                    if (outputName) {
                        this.emit('endBlockOutputValueChange', { blockId, outputName, value });
                    }
                });
            }
        });
        
        // Output type button click to show dropdown
        blockElement.querySelectorAll('.output-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const outputName = (btn as HTMLElement).dataset.outputName;
                const dropdown = blockElement.querySelector(`.output-type-dropdown[data-output-name="${outputName}"]`) as HTMLElement;
                if (dropdown) {
                    const isVisible = dropdown.style.display === 'block';
                    // Close all dropdowns first
                    blockElement.querySelectorAll('.output-type-dropdown').forEach(d => {
                        (d as HTMLElement).style.display = 'none';
                    });
                    dropdown.style.display = isVisible ? 'none' : 'block';
                }
            });
        });
        
        // Output type change
        blockElement.querySelectorAll('.output-type-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const typeSelector = (option as HTMLElement).closest('.input-type-selector');
                const outputName = typeSelector?.getAttribute('data-output-name');
                const newType = (option as HTMLElement).dataset.type;
                if (outputName && newType) {
                    this.emit('endBlockOutputTypeChange', { blockId, outputName, type: newType });
                }
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!blockElement.contains(target)) {
                blockElement.querySelectorAll('.output-type-dropdown').forEach(dropdown => {
                    (dropdown as HTMLElement).style.display = 'none';
                });
            }
        });
    }
    
    /**
     * Setup event handlers for editable key-value lists (variables, headers, outputs)
     */
    private setupEditableKeyValueHandlers(blockElement: HTMLElement, blockId: string): void {
        // Add item button - add directly without popup
        blockElement.querySelectorAll('.btn-add-item-popup').forEach(btn => {
            const btnElement = btn as HTMLElement;
            const itemType = btnElement.dataset.itemType;
            // Get portType from data attribute - must be 'input' or 'output'
            let portType = btnElement.dataset.portType;
            if (!portType || (portType !== 'input' && portType !== 'output')) {
                // Try to determine from context - check if button is in input or output section
                const section = btnElement.closest('.block-variables-section');
                if (section) {
                    const sectionLabel = section.querySelector('.block-section-label');
                    if (sectionLabel && sectionLabel.textContent?.toLowerCase().includes('input')) {
                        portType = 'input';
                    } else {
                        portType = 'output';
                    }
                } else {
                    portType = 'output'; // Default fallback
                }
            }
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (itemType && portType) {
                    // Add directly without popup
                    this.emit('blockAddKeyValue', { 
                        blockId, 
                        itemType, 
                        portType: portType as 'input' | 'output'
                    });
                }
            });
        });
        
        // Edit button - open popup for editing
        blockElement.querySelectorAll('.btn-edit-input').forEach(btn => {
            const itemName = (btn as HTMLElement).dataset.itemName;
            const itemType = (btn as HTMLElement).dataset.itemType;
            const portType = (btn as HTMLElement).dataset.portType || 'output';
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (itemName && itemType) {
                    const blockData = this.getBlockData(blockId);
                    if (blockData) {
                        const config = (blockData as any).config;
                        let items: Record<string, any> | undefined;
                        
                        // Get the correct items collection
                        switch (itemType) {
                            case 'variable':
                                if (blockData.type === 'variable') {
                                    items = portType === 'input' ? config.inputs : config.outputs;
                                    if (!items) items = config.variables;
                                }
                                break;
                            case 'header':
                                if (blockData.type === 'http-request') {
                                    items = portType === 'input' ? config.inputs : config.outputs;
                                    if (!items) items = config.headers;
                                }
                                break;
                            case 'output':
                                if (blockData.type === 'end') {
                                    items = portType === 'input' ? config.inputs : config.finalOutputs;
                                    if (!items) items = config.outputs;
                                }
                                break;
                        }
                        
                        if (items && items[itemName] !== undefined) {
                            const itemValue = items[itemName];
                            // Get type for value
                            let itemTypeValue = 'string';
                            if (itemValue === null || itemValue === undefined) {
                                itemTypeValue = 'string';
                            } else if (typeof itemValue === 'number') {
                                itemTypeValue = 'number';
                            } else if (typeof itemValue === 'boolean') {
                                itemTypeValue = 'boolean';
                            } else if (Array.isArray(itemValue)) {
                                itemTypeValue = 'array';
                            } else if (typeof itemValue === 'object') {
                                itemTypeValue = 'object';
                            }
                            const displayValue = typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue || '');
                            
                            this.addItemModal.show(
                                itemType,
                                portType as 'input' | 'output',
                                (name: string, type: string, value: string) => {
                                    // Convert value based on type
                                    let finalValue: any = value;
                                    try {
                                        switch (type) {
                                            case 'number':
                                                finalValue = value ? parseFloat(value) : 0;
                                                break;
                                            case 'boolean':
                                                finalValue = value.toLowerCase() === 'true';
                                                break;
                                            case 'array':
                                                finalValue = value ? JSON.parse(value) : [];
                                                break;
                                            case 'object':
                                                finalValue = value ? JSON.parse(value) : {};
                                                break;
                                            default:
                                                finalValue = value;
                                        }
                                    } catch {
                                        finalValue = value;
                                    }
                                    
                                    // Update the item
                                    if (name !== itemName) {
                                        // Rename
                                        this.emit('blockRenameKeyValue', { blockId, oldName: itemName, newName: name, itemType, portType });
                                        // Update value and type
                                        setTimeout(() => {
                                            this.emit('blockKeyValueTypeChange', { blockId, itemName: name, type, itemType, portType });
                                            this.emit('blockKeyValueChange', { blockId, itemName: name, value: finalValue, itemType, portType });
                                        }, 100);
                                    } else {
                                        // Just update value and type
                                        this.emit('blockKeyValueTypeChange', { blockId, itemName, type, itemType, portType });
                                        this.emit('blockKeyValueChange', { blockId, itemName, value: finalValue, itemType, portType });
                                    }
                                },
                                itemName,
                                itemTypeValue,
                                displayValue
                            );
                        }
                    }
                }
            });
        });
        
        // Delete item button
        blockElement.querySelectorAll('.btn-delete-input').forEach(btn => {
            const itemName = (btn as HTMLElement).dataset.itemName;
            const itemType = (btn as HTMLElement).dataset.itemType;
            const portType = (btn as HTMLElement).closest('.block-input-row')?.getAttribute('data-port-type') || 'output';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (itemName && itemType) {
                    this.emit('blockDeleteKeyValue', { blockId, itemName, itemType, portType });
                }
            });
        });
        
        // Item name change
        blockElement.querySelectorAll('.block-input-name').forEach(input => {
            const itemType = (input as HTMLElement).dataset.itemType;
            const portType = (input as HTMLElement).closest('.block-input-row')?.getAttribute('data-port-type') || 'output';
            input.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();
                if (originalName && newName && newName !== originalName && itemType) {
                    this.emit('blockRenameKeyValue', { blockId, oldName: originalName, newName, itemType, portType });
                }
            });
        });
        
        // Item value change - handle both input and blur events
        blockElement.querySelectorAll('.block-input-value, .block-input-name').forEach(input => {
            // Prevent block drag when clicking on inputs
            input.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Handle value changes
            if (input.classList.contains('block-input-value')) {
                const itemType = (input as HTMLElement).dataset.itemType;
                const portType = (input as HTMLElement).closest('.block-input-row')?.getAttribute('data-port-type') || 'output';
                input.addEventListener('input', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const itemName = target.dataset.itemName;
                    const value = target.value;
                    if (itemName && itemType) {
                        this.emit('blockKeyValueChange', { blockId, itemName, value, itemType, portType });
                    }
                });
                input.addEventListener('blur', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const itemName = target.dataset.itemName;
                    const value = target.value;
                    if (itemName && itemType) {
                        this.emit('blockKeyValueChange', { blockId, itemName, value, itemType, portType });
                    }
                });
            }
        });
        
        // Item type change
        blockElement.querySelectorAll('.input-type-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const typeSelector = (option as HTMLElement).closest('.input-type-selector');
                const itemName = typeSelector?.getAttribute('data-item-name');
                const itemType = typeSelector?.getAttribute('data-item-type');
                const portType = typeSelector?.closest('.block-input-row')?.getAttribute('data-port-type') || 'output';
                const newType = (option as HTMLElement).dataset.type;
                if (itemName && itemType && newType) {
                    this.emit('blockKeyValueTypeChange', { blockId, itemName, type: newType, itemType, portType });
                }
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!blockElement.contains(target)) {
                blockElement.querySelectorAll('.input-type-dropdown').forEach(dropdown => {
                    (dropdown as HTMLElement).style.display = 'none';
                });
            }
        });
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
                const block = this.blocks.get(blockId);
                const visualPort = block?.outputPorts?.find(p => p.name === portName);
                
                if (block && visualPort) {
                    this.isConnecting = true;
                    
                    // Use centralized method to get port tab position
                    const portPosition = this.getPortTabPosition(block, visualPort);
                    
                    this.connectionStart = {
                        blockId,
                        portName,
                        position: portPosition
                    };
                }
            }
        }
    }
    
    /**
     * Apply zoom transform to canvas
     */
    private applyZoom(): void {
        if (this.canvasWrapper) {
            this.canvasWrapper.style.transform = `scale(${this.zoomLevel})`;
            this.canvasWrapper.style.transformOrigin = 'top left';
            
            // Update grid background size on container based on zoom level
            // The grid should appear the same size visually regardless of zoom
            if (this.container) {
                const gridSize = 20 / this.zoomLevel; // Adjust grid size inversely to zoom
                this.container.style.backgroundSize = `${gridSize}px ${gridSize}px`;
            }
            
            // Re-render connections to account for scale
            this.renderConnections();
        }
    }
    
    /**
     * Zoom in
     */
    public zoomIn(): void {
        this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
        this.applyZoom();
    }
    
    /**
     * Zoom out
     */
    public zoomOut(): void {
        this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
        this.applyZoom();
    }
    
    /**
     * Reset zoom to 100%
     */
    public zoomReset(): void {
        this.zoomLevel = 1.0;
        this.applyZoom();
    }
    
    /**
     * Fit to screen (calculate zoom to fit all blocks and center them)
     */
    public zoomFitToScreen(): void {
        if (this.blocks.size === 0) {
            this.zoomReset();
            return;
        }
        
        // Get canvas container dimensions (the scrollable container)
        const container = this.container;
        if (!container) {
            this.zoomReset();
            return;
        }
        
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Calculate bounding box of all blocks
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        this.blocks.forEach(block => {
            const blockWidth = block.width || 250;
            const blockHeight = block.height || 100;
            minX = Math.min(minX, block.position.x);
            minY = Math.min(minY, block.position.y);
            maxX = Math.max(maxX, block.position.x + blockWidth);
            maxY = Math.max(maxY, block.position.y + blockHeight);
        });
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        if (contentWidth === 0 || contentHeight === 0) {
            this.zoomReset();
            return;
        }
        
        // Calculate zoom to fit with padding
        const padding = 150; // Increased padding around blocks to ensure they don't go out of view
        const scaleX = (containerWidth - padding * 2) / contentWidth;
        const scaleY = (containerHeight - padding * 2) / contentHeight;
        const scale = Math.min(scaleX, scaleY, this.maxZoom);
        
        this.zoomLevel = Math.max(scale, this.minZoom);
        this.applyZoom();
        
        // Center the viewport on the blocks
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (wrapper) {
            // Calculate center of bounding box in canvas coordinates
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            
            // Wait for zoom transform to be applied, then center
            requestAnimationFrame(() => {
                // After zoom is applied, calculate scroll position
                // The scroll coordinates are in the original canvas space
                // We want to center the content, accounting for the zoom level
                const scrollX = centerX - (containerWidth / (2 * this.zoomLevel));
                const scrollY = centerY - (containerHeight / (2 * this.zoomLevel));
                
                wrapper.scrollLeft = Math.max(0, scrollX);
                wrapper.scrollTop = Math.max(0, scrollY);
            });
        }
    }
    
    /**
     * Get current zoom level
     */
    public getZoomLevel(): number {
        return this.zoomLevel;
    }
    
    /**
     * Enable pan mode
     */
    public enablePanMode(): void {
        this.panMode = true;
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.cursor = 'grab';
            wrapper.classList.add('pan-mode');
        }
    }
    
    /**
     * Disable pan mode
     */
    public disablePanMode(): void {
        this.panMode = false;
        this.isPanning = false;
        const wrapper = this.container.querySelector('.canvas-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.cursor = 'default';
            wrapper.classList.remove('pan-mode');
        }
    }
    
    /**
     * Set canvas size
     */
    public setCanvasSize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
        // Store current blocks and connections
        const currentBlocks = new Map(this.blocks);
        const currentConnections = new Map(this.connections);
        // Recreate canvas with new size
        this.setupCanvas();
        this.applyZoom();
        // Restore blocks and connections
        this.blocks = currentBlocks;
        this.connections = currentConnections;
        if (this.blocks.size > 0) {
            this.renderBlocks();
            this.renderConnections();
        }
    }
    
    /**
     * Get canvas size
     */
    public getCanvasSize(): { width: number; height: number } {
        return { width: this.canvasWidth, height: this.canvasHeight };
    }
}
