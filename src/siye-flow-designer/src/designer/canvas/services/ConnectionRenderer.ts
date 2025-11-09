import { VisualBlock, VisualConnection, VisualPort, Position } from '../../VisualModels';

/**
 * Service for rendering connections between blocks
 */
export class ConnectionRenderer {
    private svg: SVGElement;
    
    constructor(svg: SVGElement) {
        this.svg = svg;
    }
    
    /**
     * Render all connections
     */
    public renderConnections(
        connections: Map<string, VisualConnection>,
        blocks: Map<string, VisualBlock>,
        isConnecting: boolean,
        connectionStart: { blockId: string, portName: string, position: Position } | null,
        mousePosition: Position,
        getPortTabPosition: (block: VisualBlock, port: VisualPort) => Position
    ): void {
        // Clear existing connections
        const existingConnections = this.svg.querySelectorAll('.edge-group, path.connection');
        existingConnections.forEach(el => el.remove());
        
        // Render each connection
        connections.forEach(connection => {
            const element = this.createConnectionPath(connection, blocks, getPortTabPosition);
            if (element) {
                this.svg.appendChild(element);
            }
        });
        
        // Render connection being drawn
        if (isConnecting && connectionStart) {
            const tempPath = this.createTempConnectionPath(connectionStart.position, mousePosition);
            if (tempPath) {
                this.svg.appendChild(tempPath);
            }
        }
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
    private createTempConnectionPath(start: Position, end: Position): SVGPathElement | null {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connection temp-connection');
        path.setAttribute('d', this.getPathData(start, end));
        path.setAttribute('stroke-dasharray', '5,5');
        
        return path;
    }
    
    /**
     * Get SVG path data with straight segments and curve
     */
    private getPathData(start: Position, end: Position): string {
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

