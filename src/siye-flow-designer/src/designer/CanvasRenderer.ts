import { VisualBlock, VisualConnection, Position, SimpleEventEmitter } from './VisualModels';
import { AnyWorkflowBlock } from '../models/workflow-models';

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
    private connectionStart: { blockId: string, position: Position } | null = null;
    private mousePosition: Position = { x: 0, y: 0 };
    
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
                <svg class="connections-svg" style="position: absolute; top: 0; left: 0; width: 2000px; height: 2000px; pointer-events: none;">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#30363d" />
                        </marker>
                    </defs>
                </svg>
                <div class="blocks-layer" style="position: relative; width: 2000px; height: 2000px;"></div>
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
        // Get block info from templates
        const blockInfo = this.getBlockInfo(block.type);
        
        const div = document.createElement('div');
        div.className = `workflow-block block-type-${block.type} ${block.selected ? 'selected' : ''}`;
        div.id = `block-${block.id}`;
        div.style.left = `${block.position.x}px`;
        div.style.top = `${block.position.y}px`;
        div.style.width = `${block.width}px`;
        div.style.minHeight = `${block.height}px`;
        div.style.borderColor = blockInfo.color;
        
        // Get the actual block data from the engine
        const blockData = this.getBlockData(block.id);
        const blockName = blockData?.name || block.id;
        const blockDescription = this.getBlockDescription(blockData);
        
        div.innerHTML = `
            <div class="block-header">
                <span class="block-icon">${blockInfo.icon}</span>
                <div class="block-info">
                    <span class="block-name">${blockName}</span>
                    <span class="block-type">${block.type}</span>
                </div>
            </div>
            ${blockDescription ? `<div class="block-description">${blockDescription}</div>` : ''}
            <div class="block-ports">
                <div class="port port-in" data-block="${block.id}" data-type="in"></div>
                <div class="port port-out" data-block="${block.id}" data-type="out"></div>
            </div>
        `;
        
        // Add event handlers
        div.addEventListener('mousedown', (e) => this.onBlockMouseDown(e, block.id));
        div.addEventListener('click', (e) => this.onBlockClick(e, block.id));
        
        // Port event handlers
        const ports = div.querySelectorAll('.port');
        ports.forEach(port => {
            port.addEventListener('mousedown', (e) => this.onPortMouseDown(e as MouseEvent));
        });
        
        return div;
    }
    
    /**
     * Render all connections
     */
    private renderConnections(): void {
        // Clear existing connections
        const existingPaths = this.svg.querySelectorAll('path.connection');
        existingPaths.forEach(path => path.remove());
        
        // Render each connection
        this.connections.forEach(connection => {
            const path = this.createConnectionPath(connection);
            if (path) {
                this.svg.appendChild(path);
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
        const sourceBlock = this.blocks.get(connection.source);
        const targetBlock = this.blocks.get(connection.target);
        
        if (!sourceBlock || !targetBlock) return null;
        
        const start = {
            x: sourceBlock.position.x + sourceBlock.width,
            y: sourceBlock.position.y + sourceBlock.height / 2
        };
        
        const end = {
            x: targetBlock.position.x,
            y: targetBlock.position.y + targetBlock.height / 2
        };
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', `connection connection-line ${connection.type}`);
        path.setAttribute('d', this.getPathData(start, end));
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
     * Get SVG path data for a curved connection
     */
    private getPathData(start: Position, end: Position): string {
        const midX = (start.x + end.x) / 2;
        return `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
    }
    
    /**
     * Get block info from type
     */
    private getBlockInfo(type: string): { icon: string, color: string } {
        const blockInfoMap: Record<string, { icon: string, color: string }> = {
            'start': { icon: '🟢', color: '#4CAF50' },
            'end': { icon: '🔴', color: '#f44336' },
            'http-request': { icon: '🌐', color: '#2196F3' },
            'variable': { icon: '📦', color: '#FF9800' },
            'condition': { icon: '❓', color: '#9C27B0' },
            'delay': { icon: '⏰', color: '#00BCD4' },
            'log': { icon: '📝', color: '#607D8B' },
            'evaluate': { icon: '🧮', color: '#795548' },
            'loop': { icon: '🔄', color: '#E91E63' },
            'try-catch': { icon: '⚠️', color: '#FFC107' }
        };
        
        return blockInfoMap[type] || { icon: '📄', color: '#666' };
    }
    
    /**
     * Get block data by ID
     */
    private getBlockData(blockId: string): AnyWorkflowBlock | undefined {
        return this.blockDataMap.get(blockId);
    }
    
    /**
     * Get block description based on configuration
     */
    private getBlockDescription(block?: AnyWorkflowBlock): string {
        if (!block) return '';
        
        const config = block.config as any;
        
        switch (block.type) {
            case 'http-request':
                return config?.url ? `${config.method || 'GET'} ${config.url}` : '';
            case 'variable':
                const varCount = config?.variables ? Object.keys(config.variables).length : 0;
                return config?.operation ? `${config.operation} ${varCount} variable(s)` : '';
            case 'condition':
                return config?.expression || '';
            case 'delay':
                return config?.milliseconds ? `${config.milliseconds}ms` : '';
            case 'log':
                return config?.message ? config.message.substring(0, 50) : '';
            case 'start':
                return block.description || 'Workflow entry point';
            case 'end':
                return block.description || 'Workflow exit point';
            default:
                return block.description || '';
        }
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
        if ((e.target as HTMLElement).classList.contains('port')) {
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
        if ((e.target as HTMLElement).classList.contains('port')) {
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
        const rect = this.container.getBoundingClientRect();
        this.mousePosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
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
        }
    }
    
    private onMouseUp(e: MouseEvent): void {
        if (this.isDragging) {
            this.isDragging = false;
            this.draggedBlockId = null;
        }
        
        if (this.isConnecting) {
            const target = e.target as HTMLElement;
            if (target.classList.contains('port') && target.dataset.type === 'in') {
                const targetBlockId = target.dataset.block;
                if (targetBlockId && this.connectionStart) {
                    this.emit('connectionCreate', {
                        source: this.connectionStart.blockId,
                        target: targetBlockId,
                        type: 'success'
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
        
        const port = e.target as HTMLElement;
        if (port.dataset.type === 'out') {
            const blockId = port.dataset.block;
            if (blockId) {
                const block = this.blocks.get(blockId);
                if (block) {
                    this.isConnecting = true;
                    this.connectionStart = {
                        blockId,
                        position: {
                            x: block.position.x + block.width,
                            y: block.position.y + block.height / 2
                        }
                    };
                }
            }
        }
    }
}
