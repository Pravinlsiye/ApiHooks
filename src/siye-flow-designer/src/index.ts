/**
 * SiyeFlow Designer - Main Entry Point
 */

import './styles/styles.css';
import { CanvasRenderer } from './canvas/canvas-renderer';
import { BlockPalette } from './components/block-palette';
import { Navbar } from './components/navbar';
import { FloatingToolbar } from './components/floating-toolbar';
import { Minimap } from './components/minimap';
import { TerminalPanel } from './components/terminal-panel';
import { AlertModal } from './components/alert-modal';
import { WorkflowEngine } from './core/workflow-engine';
import { BrowserWorkflowExecutor } from './core/browser-workflow-executor';
import { VisualBlock, VisualConnection, Position, BlockField, VisualPort } from './models/visual-models';
import { BlockType, EdgeType } from './models/workflow-models';
import { generateId } from './utils/dom-helpers';

// Export types and classes for library usage
export { CanvasRenderer } from './canvas/canvas-renderer';
export { BlockPalette } from './components/block-palette';
export { Navbar } from './components/navbar';
export { SettingsDropdown } from './components/settings-dropdown';
export { FloatingToolbar } from './components/floating-toolbar';
export { Minimap } from './components/minimap';
export { TerminalPanel } from './components/terminal-panel';
export { AlertModal } from './components/alert-modal';
export { ConfirmModal } from './components/confirm-modal';
export { WorkflowEngine } from './core/workflow-engine';
export { BrowserWorkflowExecutor } from './core/browser-workflow-executor';
export * from './models/workflow-models';
export * from './models/visual-models';
export { renderBlock, getPortPosition } from './renderers/block-renderer';
export { renderConnection, updateConnection } from './renderers/connection-renderer';

export interface DesignerOptions {
    canvasContainerId: string;
    paletteContainerId?: string;
    navbarContainerId?: string;
    floatingToolbarContainerId?: string;
    minimapContainerId?: string;
    terminalContainerId?: string;
}

/**
 * Simple demo workflow designer
 */
export class WorkflowDesigner {
    private canvas: CanvasRenderer;
    private palette: BlockPalette | null = null;
    private navbar: Navbar | null = null;
    private floatingToolbar: FloatingToolbar | null = null;
    private minimap: Minimap | null = null;
    private terminal: TerminalPanel | null = null;
    private alertModal: AlertModal;
    private engine: WorkflowEngine;
    private executor: BrowserWorkflowExecutor | null = null;
    private blocks: Map<string, VisualBlock> = new Map();
    private connections: Map<string, VisualConnection> = new Map();
    private selectedBlockId: string | null = null;

    constructor(options: DesignerOptions | string, paletteContainerId?: string) {
        // Support both old and new constructor signatures
        const opts: DesignerOptions = typeof options === 'string' 
            ? { canvasContainerId: options, paletteContainerId } 
            : options;

        this.canvas = new CanvasRenderer(opts.canvasContainerId);
        this.alertModal = new AlertModal();
        this.engine = new WorkflowEngine();
        
        if (opts.paletteContainerId) {
            this.palette = new BlockPalette(opts.paletteContainerId);
            this.setupPaletteHandlers();
        }

        if (opts.navbarContainerId) {
            this.navbar = new Navbar(opts.navbarContainerId);
            this.setupNavbarHandlers();
        }

        if (opts.floatingToolbarContainerId) {
            this.floatingToolbar = new FloatingToolbar(opts.floatingToolbarContainerId, {
                onZoomIn: () => this.canvas.zoomIn(),
                onZoomOut: () => this.canvas.zoomOut(),
                onFitToScreen: () => this.canvas.fitToScreen(),
                onRun: () => this.runWorkflow(),
                onTerminalToggle: (visible) => this.toggleTerminal(visible)
            });
        }

        if (opts.minimapContainerId) {
            this.minimap = new Minimap(opts.minimapContainerId);
            this.minimap.connectToCanvas(
                this.canvas.getCanvasContainer(),  // Visible viewport area
                this.canvas.getCanvasWrapper(),    // Full 8000x8000 canvas
                () => this.canvas.getZoom(),
                () => this.canvas.getPanOffset(),
                (x, y) => this.canvas.setPanOffset(x, y)
            );
            
            // Update minimap when zoom changes
            this.canvas.on('zoomChange', () => {
                this.minimap?.updateViewport();
            });

            // Update minimap when pan changes
            this.canvas.on('panChange', () => {
                this.minimap?.updateViewport();
            });

            // Apply saved minimap setting (default off)
            const minimapEnabled = localStorage.getItem('siyeflow-minimap') === 'true';
            if (!minimapEnabled) {
                this.minimap.hide();
            }
        }
        
        if (opts.terminalContainerId) {
            this.terminal = new TerminalPanel(opts.terminalContainerId);
            this.executor = new BrowserWorkflowExecutor(this.terminal);
            
            // Set up block highlighting during execution
            this.executor.setBlockHighlightCallback((blockId) => {
                this.canvas.selectBlock(blockId);
            });
            
            // Handle terminal block click
            this.terminal.on('blockClick', (data: { blockId: string }) => {
                this.canvas.selectBlock(data.blockId);
            });
            
            // Apply saved terminal setting (default collapsed)
            const terminalExpanded = localStorage.getItem('siyeflow-terminal') === 'true';
            if (!terminalExpanded) {
                this.terminal.collapse();
            }
            
            // Save terminal state on toggle
            this.terminal.on('toggle', (data: { expanded: boolean }) => {
                localStorage.setItem('siyeflow-terminal', String(data.expanded));
            });
        }
        
        this.setupCanvasHandlers();
        this.setupDropHandler();
    }

    private setupNavbarHandlers(): void {
        if (!this.navbar) return;

        this.navbar.on('openSettings', () => {
            console.log('Settings clicked - implement settings modal');
        });

        this.navbar.on('minimapToggle', (data: { enabled: boolean }) => {
            if (this.minimap) {
                if (data.enabled) {
                    this.minimap.show();
                    this.updateMinimap();
                } else {
                    this.minimap.hide();
                }
            }
        });

        this.navbar.on('import', () => {
            this.importWorkflow();
        });

        this.navbar.on('export', () => {
            this.exportWorkflow();
        });
    }

    /**
     * Import workflow from JSON file
     */
    private importWorkflow(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    this.loadWorkflowFromSchema(data);
                    console.log('Workflow imported successfully');
                } catch (err) {
                    console.error('Failed to import workflow:', err);
                    this.alertModal.show(
                        'Failed to import workflow. The file contains invalid JSON format.',
                        'Import Error',
                        'error'
                    );
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    /**
     * Export workflow to JSON file (WorkflowDefinition schema)
     */
    private exportWorkflow(): void {
        const data = this.getWorkflowDefinition();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workflow-v2.json';
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('Workflow exported successfully');
    }

    /**
     * Get workflow data in WorkflowDefinition schema format
     */
    getWorkflowDefinition(): {
        id: string;
        name: string;
        description: string;
        version: string;
        nodes: Array<{
            id: string;
            type: string;
            label?: string;
            data: Record<string, unknown>;
        }>;
        edges: Array<{
            id: string;
            type: string;
            source: string;
            sourceHandle: string;
            target: string;
            targetHandle: string;
        }>;
        layout: Record<string, { x: number; y: number }>;
    } {
        // Convert blocks to nodes
        const nodes = Array.from(this.blocks.values()).map(block => ({
            id: block.id,
            type: block.type,
            label: block.name,
            data: block.fieldValues || {}
        }));

        // Convert connections to edges
        const edges = Array.from(this.connections.values()).map(conn => ({
            id: conn.id,
            type: conn.type,
            source: conn.sourceBlockId,
            sourceHandle: conn.sourcePortName,
            target: conn.targetBlockId,
            targetHandle: conn.targetPortName
        }));

        // Create layout object with positions
        const layout: Record<string, { x: number; y: number }> = {};
        this.blocks.forEach(block => {
            layout[block.id] = { x: block.position.x, y: block.position.y };
        });

        return {
            id: generateId('workflow'),
            name: 'Workflow',
            description: '',
            version: '2.0.0',
            nodes,
            edges,
            layout
        };
    }

    /**
     * Load workflow from WorkflowDefinition schema
     */
    loadWorkflowFromSchema(data: {
        nodes?: Array<{
            id: string;
            type: string;
            label?: string;
            data?: Record<string, unknown>;
        }>;
        edges?: Array<{
            id: string;
            type: string;
            source: string;
            sourceHandle: string;
            target: string;
            targetHandle: string;
        }>;
        layout?: Record<string, { x: number; y: number }>;
    }): void {
        // Clear existing
        this.blocks.clear();
        this.connections.clear();

        const layout = data.layout || {};
        let autoX = 100;
        let autoY = 100;
        const spacing = 250;

        // Load nodes as blocks
        if (data.nodes) {
            data.nodes.forEach(node => {
                // Get position from layout or auto-position
                let position = layout[node.id];
                if (!position) {
                    position = { x: autoX, y: autoY };
                    autoX += spacing;
                    if (autoX > 2000) {
                        autoX = 100;
                        autoY += 150;
                    }
                }

                // Create visual block
                const block = createDefaultBlock(
                    node.type as BlockType,
                    position,
                    node.label
                );
                block.id = node.id; // Preserve original ID
                
                // Apply data to field values - preserve objects, stringify only primitives
                if (node.data) {
                    Object.entries(node.data).forEach(([key, value]) => {
                        if (value === null || value === undefined) {
                            block.fieldValues[key] = '';
                        } else if (typeof value === 'object') {
                            // Preserve objects (like outputs, headers, etc.)
                            block.fieldValues[key] = value;
                        } else {
                            block.fieldValues[key] = String(value);
                        }
                    });
                }

                this.blocks.set(block.id, block);
            });
        }

        // Load edges as connections
        if (data.edges) {
            data.edges.forEach(edge => {
                const connection: VisualConnection = {
                    id: edge.id,
                    type: edge.type as EdgeType,
                    sourceBlockId: edge.source,
                    sourcePortName: edge.sourceHandle,
                    targetBlockId: edge.target,
                    targetPortName: edge.targetHandle
                };
                this.connections.set(connection.id, connection);
            });
        }

        // Sync with workflow engine for validation
        this.engine.loadWorkflowData({
            nodes: data.nodes?.map(n => ({
                id: n.id,
                type: n.type as BlockType,
                label: n.label,
                data: n.data || {}
            })) || [],
            edges: data.edges?.map(e => ({
                id: e.id,
                type: e.type as EdgeType,
                source: e.source,
                sourceHandle: e.sourceHandle,
                target: e.target,
                targetHandle: e.targetHandle
            })) || []
        });

        // Re-render
        this.render();

        // Center view on imported blocks
        requestAnimationFrame(() => {
            this.centerOnBlocks();
        });
    }

    /**
     * Center the canvas view on all blocks
     */
    private centerOnBlocks(): void {
        if (this.blocks.size === 0) return;

        // Calculate center of all blocks
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        this.blocks.forEach(block => {
            minX = Math.min(minX, block.position.x);
            minY = Math.min(minY, block.position.y);
            maxX = Math.max(maxX, block.position.x + (block.width || 200));
            maxY = Math.max(maxY, block.position.y + (block.height || 100));
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Use pan offset to center the blocks
        // panX = (4000 - centerX) * zoom
        const zoom = this.canvas.getZoom();
        const panX = (4000 - centerX) * zoom;
        const panY = (4000 - centerY) * zoom;

        this.canvas.setPanOffset(panX, panY);
    }

    /**
     * Get raw workflow data (blocks and connections)
     */
    getWorkflowData(): { blocks: VisualBlock[]; connections: VisualConnection[] } {
        return {
            blocks: Array.from(this.blocks.values()),
            connections: Array.from(this.connections.values())
        };
    }

    /**
     * Load workflow from raw data
     */
    loadWorkflow(data: { blocks: VisualBlock[]; connections: VisualConnection[] }): void {
        this.blocks.clear();
        this.connections.clear();

        if (data.blocks) {
            data.blocks.forEach(block => {
                this.blocks.set(block.id, block);
            });
        }

        if (data.connections) {
            data.connections.forEach(conn => {
                this.connections.set(conn.id, conn);
            });
        }

        this.render();
    }

    private async runWorkflow(): Promise<void> {
        if (!this.executor) {
            this.alertModal.show(
                'Terminal panel is not initialized. Cannot run workflow.',
                'Error',
                'error'
            );
            return;
        }
        
        if (this.executor.getIsRunning()) {
            // Stop the running workflow
            this.executor.stop();
            return;
        }
        
        // Build workflow from visual blocks first (this syncs the engine state)
        const workflow = this.engine.buildFromVisual(this.blocks, this.connections);
        
        // Then validate the built workflow
        const validation = this.engine.validate();
        if (!validation.isValid) {
            this.alertModal.show(
                `Cannot run workflow:\n\n${validation.errors.join('\n')}`,
                'Validation Error',
                'error'
            );
            return;
        }
        
        if (validation.warnings.length > 0) {
            this.terminal?.log('warning', `Warnings: ${validation.warnings.join(', ')}`);
        }
        
        // Execute
        try {
            await this.executor.execute(workflow);
        } catch (error) {
            this.alertModal.show(
                `Workflow execution failed:\n\n${error}`,
                'Execution Error',
                'error'
            );
        }
    }

    private toggleTerminal(visible: boolean): void {
        if (this.terminal) {
            if (visible) {
                this.terminal.expand();
            } else {
                this.terminal.collapse();
            }
        }
    }

    private setupCanvasHandlers(): void {
        this.canvas.on('connectionCreate', (data: {
            sourceBlockId: string;
            sourcePortName: string;
            targetBlockId: string;
            targetPortName: string;
        }) => {
            const connection: VisualConnection = {
                id: generateId('conn'),
                type: EdgeType.Execution,
                sourceBlockId: data.sourceBlockId,
                sourcePortName: data.sourcePortName,
                targetBlockId: data.targetBlockId,
                targetPortName: data.targetPortName
            };
            this.connections.set(connection.id, connection);
            this.canvas.addConnection(connection);
        });

        this.canvas.on('connectionDelete', (data: { connectionId: string }) => {
            this.connections.delete(data.connectionId);
            this.canvas.removeConnection(data.connectionId);
        });

        // blockSelect is handled internally by canvas-renderer, no need to call selectBlock again
        this.canvas.on('blockSelect', (data: { blockId: string }) => {
            // Update internal state if needed (e.g., for property panel)
            this.selectedBlockId = data.blockId;
        });

        this.canvas.on('blockMove', (data: { blockId: string; position: Position }) => {
            const block = this.blocks.get(data.blockId);
            if (block) {
                block.position = data.position;
                this.updateMinimap();
            }
        });

        this.canvas.on('fieldChange', (data: { blockId: string; fieldName: string; value: string }) => {
            const block = this.blocks.get(data.blockId);
            if (block) {
                block.fieldValues[data.fieldName] = data.value;
            }
        });
        
        this.canvas.on('blockDelete', (data: { blockId: string }) => {
            // Remove from internal state
            this.blocks.delete(data.blockId);
            
            // Remove all connections involving this block
            const connectionsToRemove: string[] = [];
            this.connections.forEach((conn, connId) => {
                if (conn.sourceBlockId === data.blockId || conn.targetBlockId === data.blockId) {
                    connectionsToRemove.push(connId);
                }
            });
            connectionsToRemove.forEach(connId => this.connections.delete(connId));
            
            // Update minimap
            this.updateMinimap();
        });

        this.canvas.on('blockDuplicate', (data: { blockId: string }) => {
            this.duplicateBlock(data.blockId);
        });

        this.canvas.on('blockSettings', (data: { blockId: string }) => {
            // TODO: Open property panel when implemented
            this.alertModal.show(
                `Settings panel for block "${data.blockId}" coming soon!`,
                'Block Settings',
                'info'
            );
        });
    }

    /**
     * Duplicate a block with offset position
     */
    private duplicateBlock(blockId: string): void {
        const originalBlock = this.blocks.get(blockId);
        if (!originalBlock) return;

        // Create new block with offset position
        const newPosition: Position = {
            x: originalBlock.position.x + 50,
            y: originalBlock.position.y + 50
        };

        const newBlock = createDefaultBlock(
            originalBlock.type,
            newPosition,
            `${originalBlock.name} (copy)`
        );

        // Copy field values
        Object.assign(newBlock.fieldValues, originalBlock.fieldValues);

        // Add to state and render
        this.blocks.set(newBlock.id, newBlock);
        this.canvas.addBlock(newBlock);
        
        // Select the new block
        this.canvas.selectBlock(newBlock.id);
        
        this.updateMinimap();
    }

    private setupPaletteHandlers(): void {
        if (!this.palette) return;

        this.palette.on('blockDragStart', (_data: { type: BlockType }) => {
            // Block type will be retrieved from dataTransfer on drop
        });

        this.palette.on('blockDragEnd', () => {
            // Drag ended
        });

        this.palette.on('apiLoaded', (data: { api: unknown }) => {
            console.log('API loaded:', data.api);
        });

        this.palette.on('apiLoadError', (data: { url?: string; file?: string; error: string }) => {
            const source = data.url || data.file || 'unknown source';
            console.error('Failed to load API:', source, data.error);
            this.alertModal.show(
                `Failed to load API from ${source}.\n\n${data.error}`,
                'API Load Error',
                'error'
            );
        });
    }

    private setupDropHandler(): void {
        const canvasWrapper = this.canvas.getCanvasWrapper();
        
        canvasWrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'copy';
        });

        canvasWrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const blockType = e.dataTransfer?.getData('text/plain') as BlockType;
            if (!blockType) return;

            // Calculate drop position relative to canvas
            const rect = canvasWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Add block at drop position
            this.addBlock(blockType, { x, y });
        });
    }

    /**
     * Add a block to the workflow
     */
    addBlock(type: BlockType, position: Position, name?: string): VisualBlock {
        const block = createDefaultBlock(type, position, name);
        this.blocks.set(block.id, block);
        this.canvas.addBlock(block);
        this.updateMinimap();
        return block;
    }

    /**
     * Update minimap with current blocks
     */
    private updateMinimap(): void {
        if (this.minimap) {
            // Update block dimensions from rendered elements
            const canvasLayer = this.canvas.getCanvasLayer();
            this.blocks.forEach((block, id) => {
                const element = canvasLayer.querySelector(`[data-block-id="${id}"]`) as HTMLElement;
                if (element) {
                    block.width = element.offsetWidth || block.width || 200;
                    block.height = element.offsetHeight || block.height || 100;
                }
            });
            this.minimap.updateBlocks(this.blocks);
        }
    }

    /**
     * Remove a block from the workflow
     */
    removeBlock(blockId: string): void {
        // Remove connected connections
        this.connections.forEach((conn, id) => {
            if (conn.sourceBlockId === blockId || conn.targetBlockId === blockId) {
                this.connections.delete(id);
                this.canvas.removeConnection(id);
            }
        });

        this.blocks.delete(blockId);
        this.canvas.removeBlock(blockId);
    }

    /**
     * Get all blocks
     */
    getBlocks(): Map<string, VisualBlock> {
        return this.blocks;
    }

    /**
     * Get all connections
     */
    getConnections(): Map<string, VisualConnection> {
        return this.connections;
    }

    /**
     * Render the workflow
     */
    render(): void {
        this.canvas.render(this.blocks, this.connections);
        
        // Update minimap after render (with delay to ensure DOM is ready)
        requestAnimationFrame(() => {
            this.updateMinimap();
        });
    }

    /**
     * Destroy the designer
     */
    destroy(): void {
        this.canvas.destroy();
    }
}

/**
 * Create a default block configuration
 */
function createDefaultBlock(type: BlockType, position: Position, name?: string): VisualBlock {
    const id = generateId('block');

    const defaultFields: Record<BlockType, BlockField[]> = {
        [BlockType.Start]: [],
        [BlockType.End]: [],
        [BlockType.HttpRequest]: [
            { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], value: 'GET' },
            { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com' }
        ],
        [BlockType.Variable]: [
            { name: 'name', label: 'Variable Name', type: 'text', placeholder: 'myVariable' },
            { name: 'value', label: 'Value', type: 'text', placeholder: 'value' }
        ],
        [BlockType.Log]: [
            { name: 'message', label: 'Message', type: 'text', placeholder: 'Log message...' },
            { name: 'level', label: 'Level', type: 'select', options: ['info', 'warn', 'error', 'debug'], value: 'info' }
        ],
        [BlockType.Delay]: [
            { name: 'duration', label: 'Duration (ms)', type: 'number', value: '1000' }
        ],
        [BlockType.Condition]: [
            { name: 'expression', label: 'Condition', type: 'text', placeholder: 'value > 10' }
        ],
        [BlockType.Switch]: [
            { name: 'expression', label: 'Expression', type: 'text', placeholder: 'variable' }
        ],
        [BlockType.Loop]: [
            { name: 'items', label: 'Items', type: 'text', placeholder: '[1, 2, 3]' }
        ],
        [BlockType.Evaluate]: [
            { name: 'expression', label: 'Expression', type: 'text', placeholder: 'result = a + b' }
        ],
        [BlockType.BatchProcess]: [
            { name: 'concurrency', label: 'Concurrency', type: 'number', value: '5' }
        ],
        [BlockType.SubWorkflow]: [
            { name: 'workflowId', label: 'Workflow ID', type: 'text', placeholder: 'workflow-123' }
        ],
        [BlockType.WebhookTrigger]: [
            { name: 'path', label: 'Path', type: 'text', placeholder: '/webhook' }
        ]
    };

    const defaultPorts: Record<BlockType, { inputs: VisualPort[]; outputs: VisualPort[] }> = {
        [BlockType.Start]: {
            inputs: [],
            outputs: [{ name: 'trigger', type: 'execution' }]
        },
        [BlockType.End]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: []
        },
        [BlockType.HttpRequest]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'success', type: 'execution' }, { name: 'fail', type: 'execution' }]
        },
        [BlockType.Variable]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'trigger', type: 'execution' }]
        },
        [BlockType.Log]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'trigger', type: 'execution' }]
        },
        [BlockType.Delay]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'trigger', type: 'execution' }]
        },
        [BlockType.Condition]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'true', type: 'execution' }, { name: 'false', type: 'execution' }]
        },
        [BlockType.Switch]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'default', type: 'execution' }]
        },
        [BlockType.Loop]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'each', type: 'execution' }, { name: 'done', type: 'execution' }]
        },
        [BlockType.Evaluate]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'trigger', type: 'execution' }]
        },
        [BlockType.BatchProcess]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'each', type: 'execution' }, { name: 'done', type: 'execution' }]
        },
        [BlockType.SubWorkflow]: {
            inputs: [{ name: 'trigger', type: 'execution' }],
            outputs: [{ name: 'success', type: 'execution' }, { name: 'fail', type: 'execution' }]
        },
        [BlockType.WebhookTrigger]: {
            inputs: [],
            outputs: [{ name: 'trigger', type: 'execution' }]
        }
    };

    const ports = defaultPorts[type] || { inputs: [], outputs: [] };
    const fields = defaultFields[type] || [];

    // Calculate height based on fields and ports
    const fieldsHeight = fields.length * 50;
    const maxPorts = Math.max(ports.inputs.length, ports.outputs.length);
    const portsHeight = maxPorts * 30 + 24;
    const height = 48 + fieldsHeight + portsHeight; // header + fields + ports

    return {
        id,
        type,
        name: name || getBlockTypeName(type),
        position,
        width: 220,
        height,
        selected: false,
        inputPorts: ports.inputs,
        outputPorts: ports.outputs,
        fields,
        fieldValues: {}
    };
}

/**
 * Get display name for block type
 */
function getBlockTypeName(type: BlockType): string {
    const names: Record<BlockType, string> = {
        [BlockType.Start]: 'Start',
        [BlockType.End]: 'End',
        [BlockType.HttpRequest]: 'HTTP Request',
        [BlockType.Variable]: 'Variable',
        [BlockType.Log]: 'Log',
        [BlockType.Delay]: 'Delay',
        [BlockType.Condition]: 'Condition',
        [BlockType.Switch]: 'Switch',
        [BlockType.Loop]: 'Loop',
        [BlockType.Evaluate]: 'Evaluate',
        [BlockType.BatchProcess]: 'Batch Process',
        [BlockType.SubWorkflow]: 'Sub Workflow',
        [BlockType.WebhookTrigger]: 'Webhook Trigger'
    };
    return names[type] || type;
}

// Auto-initialize if container exists
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const canvasContainer = document.getElementById('canvas-container');
        const paletteContainer = document.getElementById('palette-container');
        const navbarContainer = document.getElementById('navbar-container');
        const floatingToolbarContainer = document.getElementById('floating-toolbar-container');
        const minimapContainer = document.getElementById('minimap-container');
        const terminalContainer = document.getElementById('terminal-container');
        
        if (canvasContainer) {
            const designer = new WorkflowDesigner({
                canvasContainerId: 'canvas-container',
                paletteContainerId: paletteContainer ? 'palette-container' : undefined,
                navbarContainerId: navbarContainer ? 'navbar-container' : undefined,
                floatingToolbarContainerId: floatingToolbarContainer ? 'floating-toolbar-container' : undefined,
                minimapContainerId: minimapContainer ? 'minimap-container' : undefined,
                terminalContainerId: terminalContainer ? 'terminal-container' : undefined
            });

            // Center of 8000x8000 canvas
            const centerX = 4000;
            const centerY = 4000;

            // Add demo blocks (centered in canvas)
            designer.addBlock(BlockType.Start, { x: centerX - 300, y: centerY - 50 });
            designer.addBlock(BlockType.HttpRequest, { x: centerX, y: centerY - 100 });
            designer.addBlock(BlockType.End, { x: centerX + 300, y: centerY - 50 });

            designer.render();

            // Expose for debugging
            (window as unknown as Record<string, unknown>).designer = designer;
            console.log('SiyeFlow Designer initialized. Access via window.designer');
            console.log('Drag blocks from the palette on the left to add them to the canvas.');
        }
    });
}

