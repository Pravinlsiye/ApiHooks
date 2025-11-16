import { VisualBlock, VisualConnection, VisualPort, Position } from '../../VisualModels';
import { connectionPathToHTMLSegments } from '../../../utils/edge-algorithms';

/**
 * HTML-based connection renderer that solves the z-index/layering issue
 * Connections are rendered as HTML elements behind blocks
 */
export class HTMLConnectionRenderer {
    private container: HTMLElement;
    private connectionsContainer: HTMLElement;
    private onDeleteConnection: (connectionId: string) => void;
    
    constructor(container: HTMLElement, onDeleteConnection: (connectionId: string) => void) {
        this.container = container;
        this.onDeleteConnection = onDeleteConnection;
        
        // Get canvas wrapper size to match connections container
        const wrapperStyle = window.getComputedStyle(container);
        const width = wrapperStyle.width ? parseInt(wrapperStyle.width) : 8000;
        const height = wrapperStyle.height ? parseInt(wrapperStyle.height) : 8000;
        
        // Create connections container (behind blocks)
        this.connectionsContainer = document.createElement('div');
        this.connectionsContainer.className = 'connections-container';
        this.connectionsContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: ${width}px;
            height: ${height}px;
            z-index: 5;
            pointer-events: none;
            overflow: visible;
        `;
        
        // Insert before blocks layer to ensure proper z-ordering
        const blocksLayer = this.container.querySelector('.blocks-layer');
        if (blocksLayer) {
            this.container.insertBefore(this.connectionsContainer, blocksLayer);
        } else {
            // Fallback: insert at beginning
            this.container.insertBefore(this.connectionsContainer, this.container.firstChild);
        }
    }
    
    /**
     * Update connections container size to match canvas wrapper
     */
    public updateSize(width: number, height: number): void {
        if (this.connectionsContainer) {
            this.connectionsContainer.style.width = `${width}px`;
            this.connectionsContainer.style.height = `${height}px`;
        }
    }
    
    /**
     * Render all connections
     */
    public renderConnections(
        connections: Map<string, VisualConnection>,
        blocks: Map<string, VisualBlock>,
        isConnecting: boolean = false,
        connectionStart?: { blockId: string, portName: string, position: Position } | null,
        mousePosition?: Position,
        getPortTabPosition?: (block: VisualBlock, port: VisualPort) => Position
    ): void {
        // Clear only non-temp connections
        const tempConnection = this.connectionsContainer.querySelector('.temp-connection');
        
        // Clear existing connections but preserve temp
        Array.from(this.connectionsContainer.children).forEach(child => {
            if (!child.classList.contains('temp-connection')) {
                child.remove();
            }
        });
        
        // Render each connection
        connections.forEach(connection => {
            const element = this.createConnection(connection, blocks, getPortTabPosition!);
            if (element) {
                this.connectionsContainer.appendChild(element);
            }
        });
        
        // Handle temporary connection being drawn
        if (isConnecting && connectionStart && mousePosition) {
            // Always render temp connection when connecting
            this.renderTempConnection(connectionStart.position, mousePosition);
        } else {
            // Remove temp connection if not connecting
            if (tempConnection) {
                tempConnection.remove();
            }
        }
    }
    
    /**
     * Create a single HTML connection using bezier curves
     */
    private createConnection(
        connection: VisualConnection,
        blocks: Map<string, VisualBlock>,
        getPortTabPosition: (block: VisualBlock, port: VisualPort) => Position
    ): HTMLElement | null {
        const sourceBlock = blocks.get(connection.sourceBlockId);
        const targetBlock = blocks.get(connection.targetBlockId);
        
        if (!sourceBlock || !targetBlock) return null;
        
        const sourcePort = sourceBlock.outputPorts?.find(p => p.name === connection.sourcePortName);
        const targetPort = targetBlock.inputPorts?.find(p => p.name === connection.targetPortName);
        
        if (!sourcePort || !targetPort) return null;
        
        const start = getPortTabPosition(sourceBlock, sourcePort);
        const end = getPortTabPosition(targetBlock, targetPort);
        
        // Create connection container
        const connectionEl = document.createElement('div');
        connectionEl.className = 'html-connection';
        connectionEl.dataset.connectionId = connection.id;
        connectionEl.style.cssText = `
            position: absolute;
            pointer-events: none;
        `;
        
        // Use connection path with straight segments and curve
        const segments = connectionPathToHTMLSegments(
            start.x, start.y,
            end.x, end.y,
            15 // number of segments for smooth curve
        );
        
        segments.forEach((segment) => {
            const segmentEl = document.createElement('div');
            segmentEl.className = 'connection-segment';
            segmentEl.style.cssText = `
                position: absolute;
                background-color: #58a6ff;
                pointer-events: all;
                cursor: pointer;
                left: ${segment.x}px;
                top: ${segment.y}px;
                width: ${segment.width}px;
                height: ${segment.height}px;
                transform-origin: 0 50%;
                transform: rotate(${segment.angle}deg);
                border-radius: 2px;
                transition: background-color 0.2s;
            `;
            
            // Add hover effect
            segmentEl.addEventListener('mouseenter', () => {
                segmentEl.style.backgroundColor = '#79c0ff';
                this.showDeleteButton(connectionEl, start, end);
            });
            
            segmentEl.addEventListener('mouseleave', () => {
                segmentEl.style.backgroundColor = '#58a6ff';
            });
            
            connectionEl.appendChild(segmentEl);
        });
        
        // Add arrow at the end
        const arrow = this.createArrow(end);
        connectionEl.appendChild(arrow);
        
        // Create delete button (hidden by default)
        const deleteBtn = this.createDeleteButton(connection.id, start, end);
        connectionEl.appendChild(deleteBtn);
        
        // Hide delete button when mouse leaves connection
        connectionEl.addEventListener('mouseleave', () => {
            deleteBtn.style.display = 'none';
        });
        
        return connectionEl;
    }
    
    /**
     * Create arrow element
     */
    private createArrow(position: Position): HTMLElement {
        const arrow = document.createElement('div');
        arrow.className = 'connection-arrow';
        arrow.style.cssText = `
            position: absolute;
            width: 0;
            height: 0;
            border-left: 8px solid #58a6ff;
            border-top: 5px solid transparent;
            border-bottom: 5px solid transparent;
            left: ${position.x - 8}px;
            top: ${position.y - 5}px;
            pointer-events: none;
        `;
        return arrow;
    }
    
    /**
     * Create delete button
     */
    private createDeleteButton(connectionId: string, start: Position, end: Position): HTMLElement {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'connection-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.style.cssText = `
            position: absolute;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #da3633;
            border: 2px solid #f85149;
            color: white;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            display: none;
            z-index: 20;
            pointer-events: all;
            left: ${midX - 12}px;
            top: ${midY - 12}px;
            padding: 0;
            line-height: 1;
        `;
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onDeleteConnection(connectionId);
        });
        
        return deleteBtn;
    }
    
    /**
     * Show delete button for a connection
     */
    private showDeleteButton(connectionEl: HTMLElement, _start: Position, _end: Position): void {
        const deleteBtn = connectionEl.querySelector('.connection-delete') as HTMLElement;
        if (deleteBtn) {
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
        }
    }
    
    /**
     * Render temporary connection while dragging
     */
    public renderTempConnection(start: Position, end: Position): void {
        // Remove existing temp connection
        const existing = this.connectionsContainer.querySelector('.temp-connection');
        if (existing) {
            existing.remove();
        }
        
        // Create temp connection
        const tempEl = document.createElement('div');
        tempEl.className = 'html-connection temp-connection';
        tempEl.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 10;
        `;
        
        const segments = connectionPathToHTMLSegments(
            start.x, start.y,
            end.x, end.y,
            10 // fewer segments for performance
        );
        
        segments.forEach(segment => {
            const segmentEl = document.createElement('div');
            segmentEl.className = 'connection-segment temp-segment';
            segmentEl.style.cssText = `
                position: absolute;
                background-color: transparent;
                left: ${segment.x}px;
                top: ${segment.y}px;
                width: ${segment.width}px;
                height: ${segment.height}px;
                transform-origin: 0 50%;
                transform: rotate(${segment.angle}deg);
                border-top: 3px dashed #ff9800;
                border-radius: 0;
            `;
            tempEl.appendChild(segmentEl);
        });
        
        this.connectionsContainer.appendChild(tempEl);
    }
    
    /**
     * Clear temporary connection
     */
    public clearTempConnection(): void {
        const temp = this.connectionsContainer.querySelector('.temp-connection');
        if (temp) {
            temp.remove();
        }
    }
    
    /**
     * Clean up
     */
    public destroy(): void {
        if (this.connectionsContainer && this.connectionsContainer.parentElement) {
            this.connectionsContainer.parentElement.removeChild(this.connectionsContainer);
        }
    }
}

