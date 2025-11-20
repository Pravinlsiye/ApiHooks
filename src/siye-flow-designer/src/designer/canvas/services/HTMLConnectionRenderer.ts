import { VisualBlock, VisualConnection, VisualPort, Position } from '../../VisualModels';
import { connectionPathToHTMLSegments } from '../../../utils/edge-algorithms';

/**
 * HTML-based connection renderer with seamless animations and accurate port connections
 * Connections are cached and smoothly updated instead of being recreated
 */
export class HTMLConnectionRenderer {
    private container: HTMLElement;
    private connectionsContainer: HTMLElement;
    private onDeleteConnection: (connectionId: string) => void;
    private connectionCache: Map<string, HTMLElement> = new Map();
    private tempConnectionEl: HTMLElement | null = null;
    
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
     * Render all connections with smooth updates
     */
    public renderConnections(
        connections: Map<string, VisualConnection>,
        blocks: Map<string, VisualBlock>,
        isConnecting: boolean = false,
        connectionStart?: { blockId: string, portName: string, position: Position } | null,
        mousePosition?: Position,
        getPortTabPosition?: (block: VisualBlock, port: VisualPort) => Position,
        isDragging: boolean = false
    ): void {
        if (!getPortTabPosition) return;
        
        // Track which connections still exist
        const activeConnectionIds = new Set<string>();
        
        // Update or create connections
        connections.forEach((connection, connectionId) => {
            activeConnectionIds.add(connectionId);
            
            const existingEl = this.connectionCache.get(connectionId);
            
            // Check if element exists and is in DOM
            if (existingEl && existingEl.parentElement === this.connectionsContainer) {
                // Update existing connection smoothly
                this.updateConnection(existingEl, connection, blocks, getPortTabPosition, isDragging);
            } else {
                // Remove stale cache entry if element doesn't exist in DOM
                if (existingEl) {
                    this.connectionCache.delete(connectionId);
                    // Also remove from DOM if it exists elsewhere
                    if (existingEl.parentElement) {
                        existingEl.remove();
                    }
                }
                
                // Check if connection already exists in DOM (prevent duplicates)
                const existingInDOM = this.connectionsContainer.querySelector(`[data-connection-id="${connectionId}"]`);
                if (existingInDOM) {
                    existingInDOM.remove();
                }
                
                // Create new connection
                const element = this.createConnection(connection, blocks, getPortTabPosition);
                if (element) {
                    this.connectionCache.set(connectionId, element);
                    this.connectionsContainer.appendChild(element);
                }
            }
        });
        
        // Remove connections that no longer exist
        this.connectionCache.forEach((element, connectionId) => {
            if (!activeConnectionIds.has(connectionId)) {
                if (element.parentElement) {
                    element.remove();
                }
                this.connectionCache.delete(connectionId);
            }
        });
        
        // Handle temporary connection being drawn
        if (isConnecting && connectionStart && mousePosition) {
            this.renderTempConnection(connectionStart.position, mousePosition);
        } else {
            this.clearTempConnection();
        }
    }
    
    /**
     * Update existing connection smoothly using CSS transitions
     */
    private updateConnection(
        connectionEl: HTMLElement,
        connection: VisualConnection,
        blocks: Map<string, VisualBlock>,
        getPortTabPosition: (block: VisualBlock, port: VisualPort) => Position,
        isDragging: boolean = false
    ): void {
        const sourceBlock = blocks.get(connection.sourceBlockId);
        const targetBlock = blocks.get(connection.targetBlockId);
        
        if (!sourceBlock || !targetBlock) return;
        
        const sourcePort = sourceBlock.outputPorts?.find(p => p.name === connection.sourcePortName);
        const targetPort = targetBlock.inputPorts?.find(p => p.name === connection.targetPortName);
        
        if (!sourcePort || !targetPort) return;
        
        // Get fresh port positions
        const start = getPortTabPosition(sourceBlock, sourcePort);
        const end = getPortTabPosition(targetBlock, targetPort);
        
        // Validate positions are valid numbers
        if (isNaN(start.x) || isNaN(start.y) || isNaN(end.x) || isNaN(end.y)) {
            return;
        }
        
        // Calculate new segments - line connects directly to existing port tabs on blocks
        const segments = connectionPathToHTMLSegments(start.x, start.y, end.x, end.y, 20);
        const existingSegments = Array.from(connectionEl.querySelectorAll('.connection-segment:not(.connection-delete)')) as HTMLElement[];
        
        // During drag, update existing segments in place (no transitions) for instant feedback
        // When not dragging, recreate segments for smooth transitions
        if (isDragging && existingSegments.length === segments.length) {
            // Update existing segments instantly without transitions
            segments.forEach((segment, index) => {
                const segmentEl = existingSegments[index];
                if (segmentEl) {
                    // Disable transitions during drag for instant updates
                    segmentEl.style.transition = 'none';
                    segmentEl.style.left = `${segment.x}px`;
                    segmentEl.style.top = `${segment.y}px`;
                    segmentEl.style.width = `${segment.width}px`;
                    segmentEl.style.transform = `rotate(${segment.angle}deg)`;
                }
            });
        } else {
            // Remove all existing segments and recreate
            existingSegments.forEach(seg => seg.remove());
            
            // Create all segments fresh with correct positions
            // The line connects directly to the existing port tabs on the blocks
            segments.forEach((segment) => {
                const segmentEl = document.createElement('div');
                segmentEl.className = 'connection-segment';
                // Disable transitions during drag, enable them when not dragging
                const transition = isDragging 
                    ? 'background-color 0.2s' 
                    : 'background-color 0.2s, left 0.15s ease-out, top 0.15s ease-out, transform 0.15s ease-out, width 0.15s ease-out';
                
                segmentEl.style.cssText = `
                    position: absolute;
                    background-color: var(--accent-primary);
                    pointer-events: all;
                    cursor: pointer;
                    left: ${segment.x}px;
                    top: ${segment.y}px;
                    width: ${segment.width}px;
                    height: 3px;
                    transform-origin: 0 50%;
                    transform: rotate(${segment.angle}deg);
                    border-radius: 1.5px;
                    transition: ${transition};
                `;
                
                // Add hover effect
                segmentEl.addEventListener('mouseenter', () => {
                    segmentEl.style.backgroundColor = 'var(--accent-primary-light)';
                    this.showDeleteButton(connectionEl, start, end);
                });
                
                segmentEl.addEventListener('mouseleave', () => {
                    segmentEl.style.backgroundColor = 'var(--accent-primary)';
                });
                
                // Append segment to connection
                connectionEl.appendChild(segmentEl);
            });
        }
        
        // Update delete button position
        const deleteBtn = connectionEl.querySelector('.connection-delete') as HTMLElement;
        if (deleteBtn) {
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            deleteBtn.style.left = `${midX - 12}px`;
            deleteBtn.style.top = `${midY - 12}px`;
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
        
        // Get port positions - ensure they're valid
        const start = getPortTabPosition(sourceBlock, sourcePort);
        const end = getPortTabPosition(targetBlock, targetPort);
        
        // Validate positions are valid numbers
        if (isNaN(start.x) || isNaN(start.y) || isNaN(end.x) || isNaN(end.y)) {
            console.warn(`Invalid port positions for connection ${connection.id}`, { start, end });
            return null;
        }
        
        // Create connection container
        const connectionEl = document.createElement('div');
        connectionEl.className = 'html-connection';
        connectionEl.dataset.connectionId = connection.id;
        connectionEl.setAttribute('data-connection-id', connection.id);
        connectionEl.style.cssText = `
            position: absolute;
            pointer-events: none;
        `;
        
        // Use connection path with straight segments and curve
        // The line connects directly to the existing port tabs (blue dots) on the blocks
        const segments = connectionPathToHTMLSegments(
            start.x, start.y,
            end.x, end.y,
            20 // More segments for smoother curve
        );
        
        segments.forEach((segment) => {
            const segmentEl = document.createElement('div');
            segmentEl.className = 'connection-segment';
            segmentEl.style.cssText = `
                position: absolute;
                background-color: var(--accent-primary);
                pointer-events: all;
                cursor: pointer;
                left: ${segment.x}px;
                top: ${segment.y}px;
                width: ${segment.width}px;
                height: 3px;
                transform-origin: 0 50%;
                transform: rotate(${segment.angle}deg);
                border-radius: 1.5px;
                transition: background-color 0.2s, left 0.15s ease-out, top 0.15s ease-out, transform 0.15s ease-out, width 0.15s ease-out;
            `;
            
            // Add hover effect
            segmentEl.addEventListener('mouseenter', () => {
                segmentEl.style.backgroundColor = 'var(--accent-primary-light)';
                this.showDeleteButton(connectionEl, start, end);
            });
            
            segmentEl.addEventListener('mouseleave', () => {
                segmentEl.style.backgroundColor = 'var(--accent-primary)';
            });
            
            connectionEl.appendChild(segmentEl);
        });
        
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
            background: var(--error-base);
            border: 2px solid var(--error-hover);
            color: var(--text-inverse);
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
            transition: left 0.15s ease-out, top 0.15s ease-out, background 0.2s;
        `;
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.onDeleteConnection(connectionId);
        });
        
        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.background = 'var(--error-hover)';
        });
        
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.background = 'var(--error-base)';
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
     * Render temporary connection while dragging - updates smoothly
     */
    public renderTempConnection(start: Position, end: Position): void {
        if (this.tempConnectionEl) {
            // Update existing temp connection smoothly
            this.updateTempConnection(start, end);
        } else {
            // Create new temp connection
            this.tempConnectionEl = document.createElement('div');
            this.tempConnectionEl.className = 'html-connection temp-connection';
            this.tempConnectionEl.style.cssText = `
                position: absolute;
                pointer-events: none;
                z-index: 10;
            `;
            this.connectionsContainer.appendChild(this.tempConnectionEl);
        }
        
        this.updateTempConnection(start, end);
    }
    
    /**
     * Update temporary connection smoothly
     */
    private updateTempConnection(start: Position, end: Position): void {
        if (!this.tempConnectionEl) return;
        
        // Clear existing segments
        this.tempConnectionEl.innerHTML = '';
        
        const segments = connectionPathToHTMLSegments(start.x, start.y, end.x, end.y, 15);
        
        segments.forEach(segment => {
            const segmentEl = document.createElement('div');
            segmentEl.className = 'connection-segment temp-segment';
            segmentEl.style.cssText = `
                position: absolute;
                background-color: transparent;
                left: ${segment.x}px;
                top: ${segment.y}px;
                width: ${segment.width}px;
                height: 3px;
                transform-origin: 0 50%;
                transform: rotate(${segment.angle}deg);
                border-top: 3px dashed var(--accent-primary);
                border-radius: 0;
                transition: left 0.05s linear, top 0.05s linear, transform 0.05s linear, width 0.05s linear;
                opacity: 0.7;
            `;
            this.tempConnectionEl!.appendChild(segmentEl);
        });
    }
    
    /**
     * Clear temporary connection
     */
    public clearTempConnection(): void {
        if (this.tempConnectionEl) {
            this.tempConnectionEl.remove();
            this.tempConnectionEl = null;
        }
    }
    
    /**
     * Clean up
     */
    public destroy(): void {
        this.connectionCache.clear();
        this.clearTempConnection();
        if (this.connectionsContainer && this.connectionsContainer.parentElement) {
            this.connectionsContainer.parentElement.removeChild(this.connectionsContainer);
        }
    }
}
