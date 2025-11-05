import { WorkflowEngine } from '../core/WorkflowEngine';
import { BlockType, AnyWorkflowBlock } from '../models/workflow-models';
import { VisualBlock, VisualConnection, Position } from './VisualModels';
import { CanvasRenderer } from './CanvasRenderer';
import { PropertyPanel } from './PropertyPanel';
import { BlockPalette } from './BlockPalette';

/**
 * Main workflow designer class that manages the visual design experience
 * This is the TypeScript equivalent of the UI functionality
 */
export class WorkflowDesigner {
    private container: HTMLElement;
    private engine: WorkflowEngine;
    private canvas!: CanvasRenderer;
    private propertyPanel!: PropertyPanel;
    private blockPalette!: BlockPalette;
    
    private visualBlocks: Map<string, VisualBlock>;
    private visualConnections: Map<string, VisualConnection>;
    private selectedBlockId: string | null = null;
    
    /**
     * Get the currently selected block ID
     */
    public getSelectedBlockId(): string | null {
        return this.selectedBlockId;
    }
    
    constructor(containerId: string) {
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        this.container = element;
        this.engine = new WorkflowEngine();
        this.visualBlocks = new Map();
        this.visualConnections = new Map();
        
        this.setupUI();
        this.initializeDefaultWorkflow();
    }
    
    /**
     * Setup the UI components
     */
    private setupUI(): void {
        // Create main layout
        this.container.innerHTML = `
            <div class="siye-flow-designer">
                <div class="designer-header">
                    <h2>SiyeFlow Designer</h2>
                    <div class="toolbar">
                        <button id="import-btn">Import</button>
                        <button id="export-btn">Export</button>
                        <button id="validate-btn">Validate</button>
                        <button id="clear-btn">Clear</button>
                    </div>
                </div>
                <div class="designer-body">
                    <div id="block-palette" class="block-palette"></div>
                    <div id="canvas-container" class="canvas-container"></div>
                    <div id="property-panel" class="property-panel"></div>
                </div>
            </div>
        `;
        
        // Initialize components
        this.blockPalette = new BlockPalette('block-palette');
        this.canvas = new CanvasRenderer('canvas-container');
        this.propertyPanel = new PropertyPanel('property-panel');
        
        // Setup event handlers
        this.setupEventHandlers();
    }
    
    /**
     * Setup event handlers
     */
    private setupEventHandlers(): void {
        // Toolbar buttons
        document.getElementById('import-btn')?.addEventListener('click', () => this.importWorkflow());
        document.getElementById('export-btn')?.addEventListener('click', () => this.exportWorkflow());
        document.getElementById('validate-btn')?.addEventListener('click', () => this.validateWorkflow());
        document.getElementById('clear-btn')?.addEventListener('click', () => this.clearWorkflow());
        
        // Block palette events
        this.blockPalette.on('blockDragStart', (type: BlockType) => {
            // Store the block type being dragged
            (window as any).__draggedBlockType = type;
        });
        
        // Canvas events
        this.canvas.on('drop', (position: Position) => {
            const type = (window as any).__draggedBlockType;
            if (type) {
                this.addBlock(type, position);
                delete (window as any).__draggedBlockType;
            }
        });
        
        this.canvas.on('blockSelect', (blockId: string) => {
            this.selectBlock(blockId);
        });
        
        this.canvas.on('blockMove', (data: { blockId: string, position: Position }) => {
            this.moveBlock(data.blockId, data.position);
        });
        
        this.canvas.on('connectionCreate', (data: { source: string, target: string, type: string }) => {
            this.createConnection(data.source, data.target, data.type);
        });
        
        // Property panel events
        this.propertyPanel.on('propertyChange', (data: { blockId: string, property: string, value: any }) => {
            this.updateBlockProperty(data.blockId, data.property, data.value);
        });
    }
    
    /**
     * Initialize with a default workflow
     */
    private initializeDefaultWorkflow(): void {
        // Add start block
        const startBlock = this.engine.createBlock(BlockType.Start);
        startBlock.name = 'Start';
        this.engine.addBlock(startBlock);
        this.addVisualBlock(startBlock, { x: 100, y: 200 });
        
        // Add end block
        const endBlock = this.engine.createBlock(BlockType.End);
        endBlock.name = 'End';
        this.engine.addBlock(endBlock);
        this.addVisualBlock(endBlock, { x: 500, y: 200 });
        
        this.renderWorkflow();
    }
    
    /**
     * Add a new block to the workflow
     */
    private addBlock(type: BlockType, position: Position): void {
        const block = this.engine.createBlock(type);
        block.name = this.getDefaultBlockName(type);
        
        this.engine.addBlock(block);
        this.addVisualBlock(block, position);
        this.renderWorkflow();
        this.selectBlock(block.id);
    }
    
    /**
     * Add visual representation of a block
     */
    private addVisualBlock(block: AnyWorkflowBlock, position: Position): void {
        const visualBlock: VisualBlock = {
            id: block.id,
            type: block.type,
            position,
            width: 250,
            height: 100,
            selected: false
        };
        
        this.visualBlocks.set(block.id, visualBlock);
    }
    
    /**
     * Move a block to a new position
     */
    private moveBlock(blockId: string, position: Position): void {
        const visualBlock = this.visualBlocks.get(blockId);
        if (visualBlock) {
            visualBlock.position = position;
            this.renderWorkflow();
        }
    }
    
    /**
     * Select a block
     */
    private selectBlock(blockId: string | null): void {
        // Deselect all blocks
        this.visualBlocks.forEach(vb => vb.selected = false);
        
        if (blockId) {
            const visualBlock = this.visualBlocks.get(blockId);
            if (visualBlock) {
                visualBlock.selected = true;
                this.selectedBlockId = blockId;
                
                // Update property panel
                const block = this.engine.getBlock(blockId);
                if (block) {
                    this.propertyPanel.showBlock(block);
                }
            }
        } else {
            this.selectedBlockId = null;
            this.propertyPanel.clear();
        }
        
        this.renderWorkflow();
    }
    
    /**
     * Create a connection between blocks
     */
    private createConnection(sourceId: string, targetId: string, type: string): void {
        const sourceBlock = this.engine.getBlock(sourceId);
        if (sourceBlock) {
            if (type === 'success') {
                sourceBlock.onSuccess = targetId;
            } else if (type === 'failure') {
                sourceBlock.onFailure = targetId;
            } else {
                sourceBlock.onComplete = targetId;
            }
            
            const connectionId = `${sourceId}-${targetId}-${type}`;
            const connection: VisualConnection = {
                id: connectionId,
                source: sourceId,
                target: targetId,
                type
            };
            
            this.visualConnections.set(connectionId, connection);
            this.renderWorkflow();
        }
    }
    
    /**
     * Update a block property
     */
    private updateBlockProperty(blockId: string, property: string, value: any): void {
        const block = this.engine.getBlock(blockId);
        if (block) {
            if (property.startsWith('config.')) {
                const configProp = property.substring(7);
                (block.config as any)[configProp] = value;
            } else {
                (block as any)[property] = value;
            }
            this.renderWorkflow();
        }
    }
    
    /**
     * Import workflow from file
     */
    private importWorkflow(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const text = await file.text();
                try {
                    this.engine.loadWorkflow(text);
                    this.visualBlocks.clear();
                    this.visualConnections.clear();
                    
                    // Create visual representations
                    this.positionBlocks();
                    this.createVisualConnections();
                    this.renderWorkflow();
                    
                    alert('Workflow imported successfully');
                } catch (error) {
                    alert(`Failed to import workflow: ${error}`);
                }
            }
        };
        
        input.click();
    }
    
    /**
     * Export workflow to file
     */
    private exportWorkflow(): void {
        const json = this.engine.saveWorkflow();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.engine.getWorkflow().name || 'workflow'}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Validate the workflow
     */
    private validateWorkflow(): void {
        const result = this.engine.validate();
        
        if (result.isValid) {
            alert('Workflow is valid!');
        } else {
            const message = `Validation failed:\n\nErrors:\n${result.errors.join('\n')}\n\nWarnings:\n${result.warnings.join('\n')}`;
            alert(message);
        }
    }
    
    /**
     * Clear the workflow
     */
    private clearWorkflow(): void {
        if (confirm('Are you sure you want to clear the workflow?')) {
            this.engine = new WorkflowEngine();
            this.visualBlocks.clear();
            this.visualConnections.clear();
            this.selectedBlockId = null;
            this.initializeDefaultWorkflow();
        }
    }
    
    /**
     * Render the workflow
     */
    private renderWorkflow(): void {
        // Pass block data to canvas for rich display
        const blockDataMap = new Map<string, AnyWorkflowBlock>();
        this.engine.getBlocks().forEach(block => {
            blockDataMap.set(block.id, block);
        });
        this.canvas.setBlockData(blockDataMap);
        
        this.canvas.render(this.visualBlocks, this.visualConnections);
    }
    
    /**
     * Position blocks when importing
     */
    private positionBlocks(): void {
        const blocks = this.engine.getBlocks();
        const spacing = 150;
        let x = 100;
        let y = 100;
        
        blocks.forEach((block) => {
            this.addVisualBlock(block, { x, y });
            x += spacing;
            
            if (x > 800) {
                x = 100;
                y += spacing;
            }
        });
    }
    
    /**
     * Create visual connections from block data
     */
    private createVisualConnections(): void {
        const blocks = this.engine.getBlocks();
        
        blocks.forEach(block => {
            if (block.onSuccess) {
                const connectionId = `${block.id}-${block.onSuccess}-success`;
                this.visualConnections.set(connectionId, {
                    id: connectionId,
                    source: block.id,
                    target: block.onSuccess,
                    type: 'success'
                });
            }
            
            if (block.onFailure) {
                const connectionId = `${block.id}-${block.onFailure}-failure`;
                this.visualConnections.set(connectionId, {
                    id: connectionId,
                    source: block.id,
                    target: block.onFailure,
                    type: 'failure'
                });
            }
            
            if (block.onComplete) {
                const connectionId = `${block.id}-${block.onComplete}-complete`;
                this.visualConnections.set(connectionId, {
                    id: connectionId,
                    source: block.id,
                    target: block.onComplete,
                    type: 'complete'
                });
            }
        });
    }
    
    /**
     * Get default block name based on type
     */
    private getDefaultBlockName(type: BlockType): string {
        const typeStr = type.toString();
        return typeStr.charAt(0).toUpperCase() + typeStr.slice(1).replace('-', ' ');
    }
}
