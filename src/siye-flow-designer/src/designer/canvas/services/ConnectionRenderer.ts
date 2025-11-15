import { VisualBlock, VisualConnection, VisualPort, Position } from '../../VisualModels';
import { DOMDiff } from '../../../utils/DOMDiff';

/**
 * Service for rendering connections between blocks
 * Optimized with memoization for path calculations
 */
export class ConnectionRenderer {
    private svg: SVGElement;
    
    // Memoized path calculation
    private memoizedGetPathData: (start: Position, end: Position) => string;
    
    constructor(svg: SVGElement) {
        this.svg = svg;
        
        // Memoize expensive path calculation
        this.memoizedGetPathData = DOMDiff.memoize(
            (start: Position, end: Position) => this.calculatePathData(start, end),
            (start, end) => `${start.x},${start.y}-${end.x},${end.y}`
        );
    }
    
    /**
     * Render all connections - optimized to only update changed connections
     */
    public renderConnections(
        connections: Map<string, VisualConnection>,
        blocks: Map<string, VisualBlock>,
        isConnecting: boolean,
        connectionStart: { blockId: string, portName: string, position: Position } | null,
        mousePosition: Position,
        getPortTabPosition: (block: VisualBlock, port: VisualPort) => Position
    ): void {
        // Get existing connection elements
        const existingConnections = new Map<string, SVGPathElement>();
        const existingElements = this.svg.querySelectorAll('path.connection-line');
        existingElements.forEach(el => {
            const connectionId = el.getAttribute('data-connection-id');
            if (connectionId) {
                existingConnections.set(connectionId, el as SVGPathElement);
            }
        });
        
        const newConnectionIds = new Set(connections.keys());
        
        // Remove deleted connections
        existingConnections.forEach((element, connectionId) => {
            if (!newConnectionIds.has(connectionId)) {
                element.remove();
            }
        });
        
        // Update or add connections
        connections.forEach(connection => {
            const existing = existingConnections.get(connection.id);
            if (existing) {
                // Update existing connection path if positions changed
                this.updateConnectionPath(existing, connection, blocks, getPortTabPosition);
            } else {
                // Create new connection
                const element = this.createConnectionPath(connection, blocks, getPortTabPosition);
                if (element) {
                    this.svg.appendChild(element);
                }
            }
        });
        
        // Handle temporary connection being drawn
        const tempConnection = this.svg.querySelector('path.temp-connection');
        if (isConnecting && connectionStart) {
            if (tempConnection) {
                // Update existing temp connection
                tempConnection.setAttribute('d', this.memoizedGetPathData(connectionStart.position, mousePosition));
            } else {
                // Create new temp connection
                const tempPath = this.createTempConnectionPath(connectionStart.position, mousePosition);
                if (tempPath) {
                    this.svg.appendChild(tempPath);
                }
            }
        } else if (tempConnection) {
            // Remove temp connection if not connecting
            tempConnection.remove();
        }
    }
    
    /**
     * Update an existing connection path element
     */
    private updateConnectionPath(
        pathElement: SVGPathElement,
        connection: VisualConnection,
        blocks: Map<string, VisualBlock>,
        getPortTabPosition: (block: VisualBlock, port: VisualPort) => Position
    ): void {
        const sourceBlock = blocks.get(connection.sourceBlockId);
        const targetBlock = blocks.get(connection.targetBlockId);
        
        if (!sourceBlock || !targetBlock) {
            pathElement.remove();
            return;
        }
        
        const sourcePort = sourceBlock.outputPorts?.find(p => p.name === connection.sourcePortName);
        const targetPort = targetBlock.inputPorts?.find(p => p.name === connection.targetPortName);
        
        if (!sourcePort || !targetPort) {
            pathElement.remove();
            return;
        }
        
        // Update path data if positions changed
        const start = getPortTabPosition(sourceBlock, sourcePort);
        const end = getPortTabPosition(targetBlock, targetPort);
        pathElement.setAttribute('d', this.memoizedGetPathData(start, end));
    }
    
    /**
     * Create a connection path element
     */
    private createConnectionPath(
        connection: VisualConnection,
        blocks: Map<string, VisualBlock>,
        getPortTabPosition: (block: VisualBlock, port: VisualPort) => Position
    ): SVGPathElement | null {
        const sourceBlock = blocks.get(connection.sourceBlockId);
        const targetBlock = blocks.get(connection.targetBlockId);
        
        if (!sourceBlock || !targetBlock) return null;
        
        // Find the ports
        const sourcePort = sourceBlock.outputPorts?.find(p => p.name === connection.sourcePortName);
        const targetPort = targetBlock.inputPorts?.find(p => p.name === connection.targetPortName);
        
        if (!sourcePort || !targetPort) return null;
        
        // Get absolute positions of port tabs
        const start = getPortTabPosition(sourceBlock, sourcePort);
        const end = getPortTabPosition(targetBlock, targetPort);
        
        // Create path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', `connection connection-line`);
        path.setAttribute('d', this.memoizedGetPathData(start, end));
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
    private createTempConnectionPath(start: Position, end: Position): SVGPathElement | null {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connection temp-connection');
        path.setAttribute('d', this.memoizedGetPathData(start, end));
        path.setAttribute('stroke-dasharray', '5,5');
        
        return path;
    }
    
    /**
     * Calculate SVG path data with straight segments and curve (actual calculation)
     */
    private calculatePathData(start: Position, end: Position): string {
        // Fixed constant straight lengths
        const outputStraight = 60; // Always 60px straight from output port
        const inputStraight = 60;  // Always 60px straight to input port
        
        // Calculate straight segment endpoints
        const outEndX = start.x + outputStraight;
        const outEndY = start.y;
        
        const inStartX = end.x - inputStraight;
        const inStartY = end.y;
        
        // Calculate curve between the two straight segments
        const horizontalGap = inStartX - outEndX;
        const curveDistance = Math.min(Math.abs(horizontalGap) / 2, 80);
        
        const cp1x = outEndX + curveDistance;
        const cp1y = outEndY;
        
        const cp2x = inStartX - curveDistance;
        const cp2y = inStartY;
        
        // SVG Path with straight segments on both sides
        return `M ${start.x} ${start.y} L ${outEndX} ${outEndY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${inStartX} ${inStartY} L ${end.x} ${end.y}`;
    }
    
    /**
     * Show delete button for connection hover
     */
    public showDeleteButton(position: Position, connectionId: string, onDelete: (connectionId: string) => void): SVGForeignObjectElement {
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
            onDelete(connectionId);
        });
        
        foreignObject.appendChild(button);
        this.svg.appendChild(foreignObject);
        
        return foreignObject;
    }
    
    /**
     * Hide delete button
     */
    public hideDeleteButton(element: SVGForeignObjectElement | null): void {
        if (element) {
            element.remove();
        }
    }
}

