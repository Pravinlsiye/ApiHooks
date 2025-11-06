import { VisualBlock, VisualConnection, Position, SimpleEventEmitter } from './VisualModels';
import { AnyWorkflowBlock } from '../models/workflow-models';
import { BlockRendererFactory } from './renderers/BlockRendererFactory';

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
    
    private isConnecting = false;
    private connectionStart: { blockId: string, portName: string, position: Position } | null = null;
    private mousePosition: Position = { x: 0, y: 0 };
    
    private hoveredConnection: string | null = null;
    private deleteButtonElement: SVGForeignObjectElement | null = null;
    
    constructor(containerId: string) {
        super();
        
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        this.container = element;
        this.setupCanvas();
    }
    
    /**
     * Setup the canvas and SVG elements
     */
    private setupCanvas(): void {
        this.container.innerHTML = `
            <div class="canvas-wrapper" style="position: relative; width: 100%; height: 100%; overflow: auto;">
                <svg class="connections-svg" style="position: absolute; top: 0; left: 0; width: 4000px; height: 4000px; z-index: 0;">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff" />
                        </marker>
                    </defs>
                </svg>
                <div class="blocks-layer" style="position: relative; width: 4000px; height: 4000px;"></div>
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
            profileDropdown.addEventListener('change', (e) => {
                const target = e.target as HTMLSelectElement;
                const selectedProfile = target.value;
                this.emit('profileChange', { blockId: block.id, profile: selectedProfile });
            });
        }
        
        // Delete button handler - must be attached AFTER innerHTML is set
        setTimeout(() => {
            const deleteBtn = div.querySelector('.block-delete-btn') as HTMLButtonElement;
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const blockName = this.getBlockData(block.id)?.name || block.id;
                    if (confirm(`Delete block "${blockName}"?\n\nAll connections will be removed.`)) {
                        this.emit('blockDelete', { blockId: block.id });
                    }
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
        const outputStraight = 80; // Always 80px straight from output port
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
        const verticalGap = inStartY - outEndY;
        
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
                        
                        // Return center of the actual rendered tab
                        return {
                            x: rect.left - canvasRect.left + canvasWrapper.scrollLeft + (rect.width / 2),
                            y: rect.top - canvasRect.top + canvasWrapper.scrollTop + (rect.height / 2)
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
        const rect = this.container.getBoundingClientRect();
        const position = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        this.emit('drop', position);
    }
    
    private onBlockMouseDown(e: MouseEvent, blockId: string): void {
        const target = e.target as HTMLElement;
        if (target.classList.contains('port-row') || 
            target.classList.contains('port-tab') || 
            target.classList.contains('port-name')) {
            return;
        }
        
        e.preventDefault();
        this.isDragging = true;
        this.draggedBlockId = blockId;
        
        const block = this.blocks.get(blockId);
        if (block) {
            this.dragOffset = {
                x: e.clientX - block.position.x,
                y: e.clientY - block.position.y
            };
        }
    }
    
    private onBlockClick(e: MouseEvent, blockId: string): void {
        const target = e.target as HTMLElement;
        if (target.classList.contains('port-row') || 
            target.classList.contains('port-tab') || 
            target.classList.contains('port-name')) {
            return;
        }
        e.stopPropagation();
        this.emit('blockSelect', blockId);
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
        this.mousePosition = {
            x: e.clientX - rect.left + wrapper.scrollLeft,
            y: e.clientY - rect.top + wrapper.scrollTop
        };
        
        if (this.isDragging && this.draggedBlockId) {
            const position = {
                x: e.clientX - this.dragOffset.x,
                y: e.clientY - this.dragOffset.y
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
        let nearestConnection: { id: string, distance: number } | null = null;
        
        this.connections.forEach((connection, id) => {
            const sourceBlock = this.blocks.get(connection.sourceBlockId);
            const targetBlock = this.blocks.get(connection.targetBlockId);
            
            if (!sourceBlock || !targetBlock) return;
            
            // Get ports
            const sourcePort = sourceBlock.outputPorts?.find(p => p.name === connection.sourcePortName);
            const targetPort = targetBlock.inputPorts?.find(p => p.name === connection.targetPortName);
            
            if (!sourcePort || !targetPort) return;
            
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
        });
        
        if (nearestConnection && nearestConnection.id !== this.hoveredConnection) {
            this.hoveredConnection = nearestConnection.id;
            this.showDeleteButton(this.mousePosition, nearestConnection.id);
        } else if (!nearestConnection && this.hoveredConnection) {
            this.hoveredConnection = null;
            this.hideDeleteButton();
        } else if (nearestConnection && this.deleteButtonElement) {
            // Update button position
            this.deleteButtonElement.setAttribute('x', String(this.mousePosition.x - 12));
            this.deleteButtonElement.setAttribute('y', String(this.mousePosition.y - 12));
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
}
