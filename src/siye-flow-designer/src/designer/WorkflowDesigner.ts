import { WorkflowEngine } from '../core/WorkflowEngine';
import { BlockType, AnyWorkflowBlock, StartBlock } from '../models/workflow-models';
import { VisualBlock, VisualConnection, Position } from './VisualModels';
import { CanvasRenderer } from './CanvasRenderer';
import { PropertyPanel } from './PropertyPanel';
import { BlockPalette } from './BlockPalette';
import { ApiDefinitionLoader } from '../api/ApiDefinitionLoader';
import { DesignerConfig, DEFAULT_CONFIG } from './DesignerConfig';
import { FloatingPanel } from '../components/FloatingPanel';
import { AlertModal } from '../components/AlertModal';
import { Minimap } from '../components/Minimap';
import { SettingsModal } from '../components/SettingsModal';

/**
 * Main workflow designer class that manages the visual design experience
 * This is the TypeScript equivalent of the UI functionality
 */
export class WorkflowDesigner {
    private container: HTMLElement;
    private config: DesignerConfig;
    private engine: WorkflowEngine;
    private canvas!: CanvasRenderer;
    private propertyPanel!: PropertyPanel;
    private floatingPanel!: FloatingPanel;
    private alertModal!: AlertModal;
    private blockPalette!: BlockPalette;
    private minimap!: Minimap;
    private settingsModal!: SettingsModal;
    
    private visualBlocks: Map<string, VisualBlock>;
    private visualConnections: Map<string, VisualConnection>;
    private selectedBlockId: string | null = null;
    
    /**
     * Get the currently selected block ID
     */
    public getSelectedBlockId(): string | null {
        return this.selectedBlockId;
    }
    
    constructor(containerId: string, config?: DesignerConfig) {
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        this.container = element;
        this.config = config || DEFAULT_CONFIG;
        this.engine = new WorkflowEngine();
        this.visualBlocks = new Map();
        this.visualConnections = new Map();
        
        this.setupUI();
        this.initializeDefaultWorkflow();
        
        // Load host APIs if in embedded mode (async, doesn't block initialization)
        this.loadHostApis();
    }
    
    /**
     * Load host APIs in embedded mode
     */
    private async loadHostApis(): Promise<void> {
        if (this.config.mode !== 'embedded' || !this.config.hostApis || this.config.hostApis.length === 0) {
            return;
        }
        
        console.log(`[Embedded Mode] Loading ${this.config.hostApis.length} host API(s)...`);
        
        for (const hostApi of this.config.hostApis) {
            try {
                const api = await ApiDefinitionLoader.loadFromUrl(hostApi.swaggerUrl);
                api.name = hostApi.name || api.name;
                if (hostApi.version) {
                    api.version = hostApi.version;
                }
                
                // Add as locked (cannot be removed)
                this.blockPalette.addApiDefinition(api, true);
                console.log(`✓ Loaded host API: ${api.name} (${api.endpoints.length} endpoints)`);
            } catch (error) {
                console.error(`✗ Failed to load host API ${hostApi.name}:`, error);
            }
        }
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
                        <button id="settings-btn" class="toolbar-settings-btn" title="Settings">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
                                <circle cx="8" cy="8" r="2.5"/>
                                <path d="M8 2.5V1M8 15v-1.5M13.5 8H15M1 8h1.5M12.364 3.636l1.06-1.06M2.576 13.424l-1.06-1.06M12.364 12.364l1.06 1.06M2.576 2.576l-1.06 1.06"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="designer-body">
                    <div id="block-palette" class="block-palette"></div>
                    <div id="canvas-container" class="canvas-container"></div>
                    <div id="property-panel" class="property-panel"></div>
                </div>
                <div id="floating-panel-container"></div>
            </div>
        `;
        
        // Initialize components
        this.alertModal = new AlertModal();
        this.settingsModal = new SettingsModal();
        this.blockPalette = new BlockPalette('block-palette', this.alertModal);
        this.canvas = new CanvasRenderer('canvas-container');
        this.propertyPanel = new PropertyPanel('property-panel');
        
        // Add minimap container after canvas is initialized (since canvas replaces innerHTML)
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            const minimapContainer = document.createElement('div');
            minimapContainer.id = 'minimap-container';
            canvasContainer.appendChild(minimapContainer);
            this.minimap = new Minimap('minimap-container', 'canvas-container', () => this.canvas.getZoomLevel());
        }
        this.floatingPanel = new FloatingPanel(
            'floating-panel-container',
            () => this.getAvailableStartBlocks(),
            (startBlockId: string) => this.getAvailableProfiles(startBlockId),
            (startBlockId: string, profile: string | null) => this.onRunWorkflow(startBlockId, profile),
            (startBlockId: string, profile: string) => this.onFloatingPanelProfileChange(startBlockId, profile),
            () => this.canvas.zoomIn(),
            () => this.canvas.zoomOut(),
            () => this.canvas.zoomFitToScreen(),
            (tool: 'pointer' | 'hand') => this.onToolChange(tool)
        );
        
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
        document.getElementById('settings-btn')?.addEventListener('click', () => this.openSettings());
        
        // Block palette events
        this.blockPalette.on('blockDragStart', (type: BlockType) => {
            // Store the block type being dragged
            (window as any).__draggedBlockType = type;
        });
        
        this.blockPalette.on('loadApiDefinition', async (data: { url: string }) => {
            await this.loadApiDefinition(data.url);
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
        
        this.canvas.on('connectionCreate', (data: { sourceBlockId: string, sourcePortName: string, targetBlockId: string, targetPortName: string }) => {
            this.onConnectionCreated(data.sourceBlockId, data.targetBlockId, data.sourcePortName, data.targetPortName);
        });
        
        this.canvas.on('profileChange', (data: { blockId: string, profile: string }) => {
            this.onProfileChange(data.blockId, data.profile);
        });
        
        // Start block events
        this.canvas.on('startBlockAddInput', (data: { blockId: string, name?: string, type?: string, value?: any }) => {
            if (data.name && data.type !== undefined) {
                // Direct add with name, type, and value
                this.onStartBlockAddInputDirect(data.blockId, data.name, data.type, data.value);
            } else {
                // Legacy: generate name
                this.onStartBlockAddInput(data.blockId);
            }
        });
        
        this.canvas.on('startBlockDeleteInput', (data: { blockId: string, inputName: string }) => {
            this.onStartBlockDeleteInput(data.blockId, data.inputName);
        });
        
        this.canvas.on('startBlockRenameInput', (data: { blockId: string, oldName: string, newName: string }) => {
            this.onStartBlockRenameInput(data.blockId, data.oldName, data.newName);
        });
        
        this.canvas.on('startBlockInputValueChange', (data: { blockId: string, inputName: string, value: string }) => {
            this.onStartBlockInputValueChange(data.blockId, data.inputName, data.value);
        });
        
        this.canvas.on('startBlockInputTypeChange', (data: { blockId: string, inputName: string, type: string }) => {
            this.onStartBlockInputTypeChange(data.blockId, data.inputName, data.type);
        });
        
        // Start block profile management events
        this.canvas.on('startBlockAddProfile', (data: { blockId: string }) => {
            this.onStartBlockAddProfile(data.blockId);
        });
        
        this.canvas.on('startBlockDeleteProfile', (data: { blockId: string, profileName: string }) => {
            this.onStartBlockDeleteProfile(data.blockId, data.profileName);
        });
        
        this.canvas.on('startBlockSetDefaultProfile', (data: { blockId: string, profileName: string }) => {
            this.onStartBlockSetDefaultProfile(data.blockId, data.profileName);
        });
        
        // End block events
        this.canvas.on('endBlockAddOutput', (data: { blockId: string }) => {
            this.onEndBlockAddOutput(data.blockId);
        });
        
        this.canvas.on('endBlockDeleteOutput', (data: { blockId: string, outputName: string }) => {
            this.onEndBlockDeleteOutput(data.blockId, data.outputName);
        });
        
        this.canvas.on('endBlockRenameOutput', (data: { blockId: string, oldName: string, newName: string }) => {
            this.onEndBlockRenameOutput(data.blockId, data.oldName, data.newName);
        });
        
        this.canvas.on('endBlockOutputValueChange', (data: { blockId: string, outputName: string, value: string }) => {
            this.onEndBlockOutputValueChange(data.blockId, data.outputName, data.value);
        });
        
        this.canvas.on('endBlockOutputTypeChange', (data: { blockId: string, outputName: string, type: string }) => {
            this.onEndBlockOutputTypeChange(data.blockId, data.outputName, data.type);
        });
        
        // Block key-value management events (variables, headers, outputs)
        this.canvas.on('blockAddKeyValue', (data: { blockId: string, itemType: string, portType?: string, name?: string, type?: string, value?: any }) => {
            // Ensure portType is provided and valid
            const portType = (data.portType === 'input' || data.portType === 'output') ? data.portType : 'output';
            
            if (data.name && data.type !== undefined) {
                // Direct add with name, type, and value
                this.onBlockAddKeyValueDirect(data.blockId, data.itemType, portType, data.name, data.type, data.value);
            } else {
                // Legacy: generate name
                this.onBlockAddKeyValue(data.blockId, data.itemType, portType);
            }
        });
        
        this.canvas.on('blockDeleteKeyValue', (data: { blockId: string, itemName: string, itemType: string, portType?: string }) => {
            this.onBlockDeleteKeyValue(data.blockId, data.itemName, data.itemType, data.portType);
        });
        
        this.canvas.on('blockRenameKeyValue', (data: { blockId: string, oldName: string, newName: string, itemType: string, portType?: string }) => {
            this.onBlockRenameKeyValue(data.blockId, data.oldName, data.newName, data.itemType, data.portType);
        });
        
        this.canvas.on('blockKeyValueChange', (data: { blockId: string, itemName: string, value: string, itemType: string, portType?: string }) => {
            this.onBlockKeyValueChange(data.blockId, data.itemName, data.value, data.itemType, data.portType);
        });
        
        this.canvas.on('blockKeyValueTypeChange', (data: { blockId: string, itemName: string, type: string, itemType: string, portType?: string }) => {
            this.onBlockKeyValueTypeChange(data.blockId, data.itemName, data.type, data.itemType, data.portType);
        });
        
        this.canvas.on('connectionDelete', (data: { connectionId: string }) => {
            this.onConnectionDeleted(data.connectionId);
        });
        
        this.canvas.on('blockDelete', (data: { blockId: string }) => {
            this.onBlockDeleted(data.blockId);
        });
        
        // Property panel events
        // Accept property changes from both PropertyPanel and inline Canvas editors
        this.canvas.on('propertyChange', (data: { blockId: string, property: string, value: any }) => {
            this.updateBlockProperty(data.blockId, data.property, data.value);
        });
        this.propertyPanel.on('propertyChange', (data: { blockId: string, property: string, value: any }) => {
            this.updateBlockProperty(data.blockId, data.property, data.value);
        });
        
        // Listen for profile changes from property panel (special case for config.selectedProfile)
        this.propertyPanel.on('blockUpdated', (blockId: string, block: any) => {
            if (block.type === BlockType.Start && block.config?.selectedProfile) {
                // Update the block in engine to ensure consistency
                const engineBlock = this.engine.getBlock(blockId);
                if (engineBlock && engineBlock.type === BlockType.Start) {
                    (engineBlock as any).config.selectedProfile = block.config.selectedProfile;
                }
                // Sync FloatingPanel when profile changes in PropertyPanel
                this.syncFloatingPanelProfile(blockId, block.config.selectedProfile);
                // Re-render workflow
                this.renderWorkflow();
            }
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
    private onConnectionCreated(sourceId: string, targetId: string, sourcePortName: string, targetPortName: string): void {
        const sourceBlock = this.engine.getBlock(sourceId);
        if (sourceBlock) {
            if (!sourceBlock.connections) {
                sourceBlock.connections = [];
            }
            
            // Remove any existing connection from this source port
            sourceBlock.connections = sourceBlock.connections.filter(
                conn => !(conn.fromBlock === sourceId && conn.fromPort === sourcePortName)
            );
            
            // Add new connection
            sourceBlock.connections.push({
                fromBlock: sourceId,
                fromPort: sourcePortName,
                toBlock: targetId,
                toPort: targetPortName
            });
            
            const connectionId = `${sourceId}-${sourcePortName}-${targetId}-${targetPortName}`;
            const connection: VisualConnection = {
                id: connectionId,
                sourceBlockId: sourceId,
                sourcePortName: sourcePortName,
                targetBlockId: targetId,
                targetPortName: targetPortName,
                path: ''
            };
            
            this.visualConnections.set(connectionId, connection);
            this.renderWorkflow();
        }
    }
    
    /**
     * Get effective inputs from Start block (from profile or direct inputs)
     */
    private getEffectiveInputs(startBlock: StartBlock): Record<string, any> {
        if (startBlock.config.profiles && startBlock.config.profiles.length > 0) {
            const selectedProfile = startBlock.config.profiles.find(p => p.name === startBlock.config.selectedProfile) ||
                                   startBlock.config.profiles.find(p => p.default) ||
                                   startBlock.config.profiles[0];
            return selectedProfile?.inputs || {};
        }
        return startBlock.config.inputs || {};
    }
    
    /**
     * Handle Start block add input directly with name, type, and value
     */
    private onStartBlockAddInputDirect(blockId: string, name: string, type: string, value: any): void {
        const block = this.engine.getBlock(blockId);
        if (!block || block.type !== BlockType.Start) return;
        
        const startBlock = block as StartBlock;
        if (!startBlock.config) {
            startBlock.config = { profiles: [], selectedProfile: '' };
        }
        
        // Get effective inputs from current profile or create default
        const effectiveInputs = this.getEffectiveInputs(startBlock);
        
        // Check if name already exists, if so append number
        let finalName = name;
        let counter = 1;
        while (effectiveInputs[finalName] !== undefined) {
            finalName = `${name}${counter}`;
            counter++;
        }
        
        // Add to current profile or create default profile
        if (startBlock.config.profiles && startBlock.config.profiles.length > 0) {
            const currentProfile = startBlock.config.profiles.find(p => p.name === startBlock.config.selectedProfile) ||
                                  startBlock.config.profiles.find(p => p.default) ||
                                  startBlock.config.profiles[0];
            
            if (currentProfile) {
                if (!currentProfile.inputs) {
                    currentProfile.inputs = {};
                }
                currentProfile.inputs[finalName] = {
                    type: type,
                    required: false,
                    value: value !== undefined ? value : '',
                    description: ''
                };
            }
        } else {
            // No profiles, add to direct inputs
            if (!startBlock.config.inputs) {
                startBlock.config.inputs = {};
            }
            startBlock.config.inputs[finalName] = {
                type: type,
                required: false,
                value: value !== undefined ? value : '',
                description: ''
            };
        }
        
        this.renderWorkflow();
        if (this.selectedBlockId === blockId) {
            this.propertyPanel.showBlock(block);
        }
    }
    
    /**
     * Handle Start block add input
     */
    private onStartBlockAddInput(blockId: string): void {
        const block = this.engine.getBlock(blockId) as StartBlock;
        if (!block || block.type !== BlockType.Start) return;
        
        const config = block.config;
        if (!config.profiles || config.profiles.length === 0) {
            config.profiles = [{
                name: 'Default',
                description: 'Default configuration',
                default: true,
                inputs: {}
            }];
            config.selectedProfile = 'Default';
        }
        
        const selectedProfile = config.profiles.find(p => p.name === config.selectedProfile)
            || config.profiles.find(p => p.default)
            || config.profiles[0];
        
        if (!selectedProfile.inputs) {
            selectedProfile.inputs = {};
        }
        
        // Generate unique input name
        let counter = 1;
        let newName = `Input ${counter}`;
        while (selectedProfile.inputs[newName] !== undefined) {
            counter++;
            newName = `Input ${counter}`;
        }
        
        selectedProfile.inputs[newName] = {
            type: 'string',
            required: false,
            description: '',
            value: ''
        };
        
        this.renderWorkflow();
        if (this.selectedBlockId === blockId) {
            this.propertyPanel.showBlock(block);
        }
    }
    
    /**
     * Handle Start block delete input
     */
    private onStartBlockDeleteInput(blockId: string, inputName: string): void {
        const block = this.engine.getBlock(blockId) as StartBlock;
        if (!block || block.type !== BlockType.Start) return;
        
        const config = block.config;
        const selectedProfile = config.profiles?.find(p => p.name === config.selectedProfile)
            || config.profiles?.find(p => p.default)
            || config.profiles?.[0];
        
        if (selectedProfile?.inputs && selectedProfile.inputs[inputName] !== undefined) {
            delete selectedProfile.inputs[inputName];
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle Start block rename input
     */
    private onStartBlockRenameInput(blockId: string, oldName: string, newName: string): void {
        const block = this.engine.getBlock(blockId) as StartBlock;
        if (!block || block.type !== BlockType.Start) return;
        
        const config = block.config;
        const selectedProfile = config.profiles?.find(p => p.name === config.selectedProfile)
            || config.profiles?.find(p => p.default)
            || config.profiles?.[0];
        
        if (selectedProfile?.inputs && selectedProfile.inputs[oldName] !== undefined) {
            const inputDef = selectedProfile.inputs[oldName];
            delete selectedProfile.inputs[oldName];
            selectedProfile.inputs[newName] = inputDef;
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle Start block input value change
     */
    private onStartBlockInputValueChange(blockId: string, inputName: string, value: string): void {
        const block = this.engine.getBlock(blockId) as StartBlock;
        if (!block || block.type !== BlockType.Start) return;
        
        const config = block.config;
        const selectedProfile = config.profiles?.find(p => p.name === config.selectedProfile)
            || config.profiles?.find(p => p.default)
            || config.profiles?.[0];
        
        if (selectedProfile?.inputs && selectedProfile.inputs[inputName] !== undefined) {
            selectedProfile.inputs[inputName].value = value;
            this.renderWorkflow();
        }
    }
    
    /**
     * Handle Start block input type change
     */
    private onStartBlockInputTypeChange(blockId: string, inputName: string, type: string): void {
        const block = this.engine.getBlock(blockId) as StartBlock;
        if (!block || block.type !== BlockType.Start) return;
        
        const config = block.config;
        const selectedProfile = config.profiles?.find(p => p.name === config.selectedProfile)
            || config.profiles?.find(p => p.default)
            || config.profiles?.[0];
        
        if (selectedProfile?.inputs && selectedProfile.inputs[inputName] !== undefined) {
            selectedProfile.inputs[inputName].type = type;
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle Start block add profile
     */
    private onStartBlockAddProfile(blockId: string): void {
        const block = this.engine.getBlock(blockId) as StartBlock;
        if (!block || block.type !== BlockType.Start) return;
        
        const config = block.config;
        if (!config.profiles) {
            config.profiles = [];
        }
        
        // Generate unique profile name
        let counter = 1;
        let newName = `Profile ${counter}`;
        while (config.profiles.find(p => p.name === newName)) {
            counter++;
            newName = `Profile ${counter}`;
        }
        
        config.profiles.push({
            name: newName,
            description: '',
            default: false,
            inputs: {}
        });
        
        config.selectedProfile = newName;
        
        this.renderWorkflow();
        if (this.selectedBlockId === blockId) {
            this.propertyPanel.showBlock(block);
        }
    }
    
    /**
     * Handle Start block delete profile
     */
    private onStartBlockDeleteProfile(blockId: string, profileName: string): void {
        const block = this.engine.getBlock(blockId) as StartBlock;
        if (!block || block.type !== BlockType.Start) return;
        
        const config = block.config;
        if (!config.profiles || config.profiles.length <= 1) {
            this.alertModal.show('Cannot delete the last profile. A Start block must have at least one profile.', 'Cannot Delete Profile', 'warning');
            return;
        }
        
        const profileIndex = config.profiles.findIndex(p => p.name === profileName);
        if (profileIndex !== -1) {
            config.profiles.splice(profileIndex, 1);
            
            // If deleted profile was selected, select another one
            if (config.selectedProfile === profileName) {
                const defaultProfile = config.profiles.find(p => p.default);
                config.selectedProfile = defaultProfile?.name || config.profiles[0].name;
            }
            
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle Start block set default profile
     */
    private onStartBlockSetDefaultProfile(blockId: string, profileName: string): void {
        const block = this.engine.getBlock(blockId) as StartBlock;
        if (!block || block.type !== BlockType.Start) return;
        
        const config = block.config;
        if (config.profiles) {
            // Remove default from all profiles
            config.profiles.forEach(p => p.default = false);
            
            // Set the selected profile as default
            const profile = config.profiles.find(p => p.name === profileName);
            if (profile) {
                profile.default = true;
                this.renderWorkflow();
                if (this.selectedBlockId === blockId) {
                    this.propertyPanel.showBlock(block);
                }
            }
        }
    }
    
    /**
     * Handle block add key-value directly with name, type, and value
     */
    private onBlockAddKeyValueDirect(blockId: string, itemType: string, portType: string, name: string, _type: string, value: any): void {
        const block = this.engine.getBlock(blockId);
        if (!block) return;
        
        const config = (block as any).config;
        let items: Record<string, any> | undefined;
        
        switch (itemType) {
            case 'variable':
                if (block.type === BlockType.Variable) {
                    if (portType === 'input') {
                        if (!config.inputs) config.inputs = {};
                        items = config.inputs;
                    } else {
                        if (!config.outputs) config.outputs = {};
                        items = config.outputs;
                    }
                    // Fallback to variables if inputs/outputs don't exist
                    if (!items) {
                        if (!config.variables) config.variables = {};
                        items = config.variables;
                    }
                }
                break;
            case 'header':
                if (block.type === BlockType.HttpRequest) {
                    if (portType === 'input') {
                        if (!config.inputs) config.inputs = {};
                        items = config.inputs;
                    } else {
                        if (!config.outputs) config.outputs = {};
                        items = config.outputs;
                    }
                    // Fallback to headers if inputs/outputs don't exist
                    if (!items) {
                        if (!config.headers) config.headers = {};
                        items = config.headers;
                    }
                }
                break;
            case 'output':
                if (block.type === BlockType.End) {
                    if (portType === 'input') {
                        if (!config.inputs) config.inputs = {};
                        items = config.inputs;
                    } else {
                        if (!config.finalOutputs) config.finalOutputs = {};
                        items = config.finalOutputs;
                    }
                    // Fallback to outputs if inputs/finalOutputs don't exist
                    if (!items) {
                        if (!config.outputs) config.outputs = {};
                        items = config.outputs;
                    }
                }
                break;
        }
        
        if (!items) return;
        
        // Check if name already exists, if so append number
        let finalName = name;
        let counter = 1;
        while (items[finalName] !== undefined) {
            finalName = `${name}${counter}`;
            counter++;
        }
        
        items[finalName] = value !== undefined ? value : '';
        
        this.renderWorkflow();
        if (this.selectedBlockId === blockId) {
            this.propertyPanel.showBlock(block);
        }
    }
    
    /**
     * Handle block add key-value (variable, header, output)
     */
    private onBlockAddKeyValue(blockId: string, itemType: string, portType: string = 'output'): void {
        const block = this.engine.getBlock(blockId);
        if (!block) return;
        
        const config = (block as any).config;
        let items: Record<string, any> | undefined;
        
        // Ensure portType is valid
        if (portType !== 'input' && portType !== 'output') {
            portType = 'output'; // Default fallback
        }
        
        // Determine default name based on portType
        const defaultName = portType === 'input' ? 'input' : 'output';
        
        switch (itemType) {
            case 'variable':
                if (block.type === BlockType.Variable) {
                    if (portType === 'input') {
                        if (!config.inputs) config.inputs = {};
                        items = config.inputs;
                    } else {
                        if (!config.outputs) config.outputs = {};
                        items = config.outputs;
                    }
                }
                break;
            case 'header':
                if (block.type === BlockType.HttpRequest) {
                    if (portType === 'input') {
                        if (!config.inputs) config.inputs = {};
                        items = config.inputs;
                    } else {
                        if (!config.outputs) config.outputs = {};
                        items = config.outputs;
                    }
                }
                break;
            case 'output':
                if (block.type === BlockType.End) {
                    if (portType === 'input') {
                        if (!config.inputs) config.inputs = {};
                        items = config.inputs;
                    } else {
                        if (!config.finalOutputs) config.finalOutputs = {};
                        items = config.finalOutputs;
                    }
                }
                break;
        }
        
        if (!items) return;
        
        // Generate unique name: input1, input2, ... or output1, output2, ...
        let counter = 1;
        let newName = `${defaultName}${counter}`;
        while (items[newName] !== undefined) {
            counter++;
            newName = `${defaultName}${counter}`;
        }
        
        items[newName] = '';
        
        this.renderWorkflow();
        if (this.selectedBlockId === blockId) {
            this.propertyPanel.showBlock(block);
        }
    }
    
    /**
     * Handle block delete key-value
     */
    private onBlockDeleteKeyValue(blockId: string, itemName: string, itemType: string, portType: string = 'output'): void {
        const block = this.engine.getBlock(blockId);
        if (!block) return;
        
        const config = (block as any).config;
        let items: Record<string, any> | undefined;
        
        switch (itemType) {
            case 'variable':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.outputs;
                }
                // Fallback to variables
                if (!items) items = config.variables;
                break;
            case 'header':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.outputs;
                }
                // Fallback to headers
                if (!items) items = config.headers;
                break;
            case 'output':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.finalOutputs;
                }
                // Fallback to outputs
                if (!items) items = config.outputs;
                break;
        }
        
        if (items && items[itemName] !== undefined) {
            delete items[itemName];
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle block rename key-value
     */
    private onBlockRenameKeyValue(blockId: string, oldName: string, newName: string, itemType: string, portType: string = 'output'): void {
        const block = this.engine.getBlock(blockId);
        if (!block) return;
        
        const config = (block as any).config;
        let items: Record<string, any> | undefined;
        
        switch (itemType) {
            case 'variable':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.outputs;
                }
                // Fallback to variables
                if (!items) items = config.variables;
                break;
            case 'header':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.outputs;
                }
                // Fallback to headers
                if (!items) items = config.headers;
                break;
            case 'output':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.finalOutputs;
                }
                // Fallback to outputs
                if (!items) items = config.outputs;
                break;
        }
        
        if (items && items[oldName] !== undefined) {
            const value = items[oldName];
            delete items[oldName];
            items[newName] = value;
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle block key-value change
     */
    private onBlockKeyValueChange(blockId: string, itemName: string, value: string, itemType: string, portType: string = 'output'): void {
        const block = this.engine.getBlock(blockId);
        if (!block) return;
        
        const config = (block as any).config;
        let items: Record<string, any> | undefined;
        
        switch (itemType) {
            case 'variable':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.outputs;
                }
                // Fallback to variables
                if (!items) items = config.variables;
                break;
            case 'header':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.outputs;
                }
                // Fallback to headers
                if (!items) items = config.headers;
                break;
            case 'output':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.finalOutputs;
                }
                // Fallback to outputs
                if (!items) items = config.outputs;
                break;
        }
        
        if (items && items[itemName] !== undefined) {
            // Try to parse as JSON if it looks like JSON, otherwise store as string
            try {
                if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
                    items[itemName] = JSON.parse(value);
                } else {
                    items[itemName] = value;
                }
            } catch {
                items[itemName] = value;
            }
            this.renderWorkflow();
        }
    }
    
    /**
     * Handle block key-value type change
     */
    private onBlockKeyValueTypeChange(blockId: string, itemName: string, type: string, itemType: string, portType: string = 'output'): void {
        const block = this.engine.getBlock(blockId);
        if (!block) return;
        
        const config = (block as any).config;
        let items: Record<string, any> | undefined;
        
        switch (itemType) {
            case 'variable':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.outputs;
                }
                // Fallback to variables
                if (!items) items = config.variables;
                break;
            case 'header':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.outputs;
                }
                // Fallback to headers
                if (!items) items = config.headers;
                break;
            case 'output':
                if (portType === 'input') {
                    items = config.inputs;
                } else {
                    items = config.finalOutputs;
                }
                // Fallback to outputs
                if (!items) items = config.outputs;
                break;
        }
        
        if (items && items[itemName] !== undefined) {
            // Convert value to new type
            const currentValue = items[itemName];
            switch (type) {
                case 'number':
                    items[itemName] = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue)) || 0;
                    break;
                case 'boolean':
                    items[itemName] = typeof currentValue === 'boolean' ? currentValue : String(currentValue).toLowerCase() === 'true';
                    break;
                case 'array':
                    items[itemName] = Array.isArray(currentValue) ? currentValue : [];
                    break;
                case 'object':
                    items[itemName] = typeof currentValue === 'object' && !Array.isArray(currentValue) ? currentValue : {};
                    break;
                default:
                    items[itemName] = String(currentValue);
                    break;
            }
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle profile change for Start blocks
     */
    private onProfileChange(blockId: string, profileName: string): void {
        const block = this.engine.getBlock(blockId);
        if (block && block.type === BlockType.Start) {
            const startBlock = block as StartBlock;
            if (startBlock.config) {
                startBlock.config.selectedProfile = profileName;
                
                // Sync FloatingPanel
                this.syncFloatingPanelProfile(blockId, profileName);
                
                // Re-render the workflow to update ports
                this.renderWorkflow();
                
                // If this is the selected block, update property panel
                if (this.selectedBlockId === blockId) {
                    this.selectBlock(blockId);
                }
            }
        }
    }
    
    /**
     * Handle profile change from FloatingPanel
     */
    private onFloatingPanelProfileChange(startBlockId: string, profileName: string): void {
        // Update the Start block's selected profile
        this.onProfileChange(startBlockId, profileName);
    }
    
    /**
     * Sync FloatingPanel profile selection with Start block
     */
    private syncFloatingPanelProfile(startBlockId: string, profileName: string): void {
        // Only sync if this is the selected Start block in FloatingPanel
        if (this.floatingPanel && this.floatingPanel.getSelectedStartBlockId() === startBlockId) {
            this.floatingPanel.setSelectedProfile(profileName);
        }
    }
    
    /**
     * Handle connection deletion
     */
    private onConnectionDeleted(connectionId: string): void {
        // Remove from visual connections
        this.visualConnections.delete(connectionId);
        
        // Remove from block's connections array
        const connection = Array.from(this.visualConnections.values()).find(c => c.id === connectionId);
        if (connection) {
            const sourceBlock = this.engine.getBlock(connection.sourceBlockId);
            if (sourceBlock && sourceBlock.connections) {
                sourceBlock.connections = sourceBlock.connections.filter(
                    conn => !(conn.fromBlock === connection.sourceBlockId && conn.fromPort === connection.sourcePortName)
                );
            }
        }
        
        // Re-render
        this.renderWorkflow();
    }
    
    /**
     * Handle block deletion
     */
    private onBlockDeleted(blockId: string): void {
        // Remove the block from engine
        this.engine.removeBlock(blockId);
        
        // Remove visual block
        this.visualBlocks.delete(blockId);
        
        // Remove all connections involving this block
        const connectionsToDelete: string[] = [];
        this.visualConnections.forEach((connection, id) => {
            if (connection.sourceBlockId === blockId || connection.targetBlockId === blockId) {
                connectionsToDelete.push(id);
            }
        });
        
        connectionsToDelete.forEach(id => {
            this.visualConnections.delete(id);
        });
        
        // Clear selection if this was the selected block
        if (this.selectedBlockId === blockId) {
            this.selectedBlockId = null;
            this.propertyPanel.clear();
        }
        
        // Re-render
        this.renderWorkflow();
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
                
                // Sync FloatingPanel if profile changed
                if (configProp === 'selectedProfile' && block.type === BlockType.Start) {
                    this.syncFloatingPanelProfile(blockId, value);
                }
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
                    
                    this.alertModal.show('Workflow imported successfully', 'Import Success', 'success');
                } catch (error) {
                    this.alertModal.show(`Failed to import workflow: ${error}`, 'Import Failed', 'error');
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
            this.alertModal.show('Workflow is valid!', 'Validation Success', 'success');
        } else {
            const message = `Validation failed:\n\nErrors:\n${result.errors.join('\n')}\n\nWarnings:\n${result.warnings.join('\n')}`;
            this.alertModal.show(message, 'Validation Failed', 'error');
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
     * Open settings modal
     */
    private openSettings(): void {
        const canvasSize = this.canvas.getCanvasSize();
        const minimapEnabled = this.minimap.isVisible();
        
        this.settingsModal.show(
            minimapEnabled,
            canvasSize.width,
            canvasSize.height,
            (enabled: boolean) => {
                if (enabled) {
                    this.minimap.show();
                } else {
                    this.minimap.hide();
                }
            },
            (width: number, height: number) => {
                this.canvas.setCanvasSize(width, height);
                this.minimap.setCanvasSize(width, height);
            }
        );
    }
    
    /**
     * Load API definition from URL
     */
    private async loadApiDefinition(url: string): Promise<void> {
        try {
            const api = await ApiDefinitionLoader.loadFromUrl(url);
            this.blockPalette.addApiDefinition(api);
            this.alertModal.show(`Loaded ${api.endpoints.length} endpoints from ${api.name}`, 'API Loaded', 'success');
        } catch (error: any) {
            this.alertModal.show(`Failed to load API definition:\n${error.message}`, 'Load Failed', 'error');
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
        
        // Update minimap
        this.minimap.updateBlocks(this.visualBlocks);
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
            // Handle port-based connections
            if (block.connections && block.connections.length > 0) {
                block.connections.forEach(conn => {
                    const connectionId = `${conn.fromBlock}-${conn.fromPort}-${conn.toBlock}-${conn.toPort}`;
                    this.visualConnections.set(connectionId, {
                        id: connectionId,
                        sourceBlockId: conn.fromBlock,
                        sourcePortName: conn.fromPort,
                        targetBlockId: conn.toBlock,
                        targetPortName: conn.toPort,
                        path: '' // Path will be calculated by renderer
                    });
                });
            }
            // Fall back to legacy connections
            else {
                if (block.onSuccess) {
                    const connectionId = `${block.id}-${block.onSuccess}-success`;
                    this.visualConnections.set(connectionId, {
                        id: connectionId,
                        sourceBlockId: block.id,
                        sourcePortName: 'onSuccess',
                        targetBlockId: block.onSuccess,
                        targetPortName: 'in',
                        path: ''
                    });
                }
                
                if (block.onFailure) {
                    const connectionId = `${block.id}-${block.onFailure}-failure`;
                    this.visualConnections.set(connectionId, {
                        id: connectionId,
                        sourceBlockId: block.id,
                        sourcePortName: 'onFailure',
                        targetBlockId: block.onFailure,
                        targetPortName: 'in',
                        path: ''
                    });
                }
                
                if (block.onComplete) {
                    const connectionId = `${block.id}-${block.onComplete}-complete`;
                    this.visualConnections.set(connectionId, {
                        id: connectionId,
                        sourceBlockId: block.id,
                        sourcePortName: 'onComplete',
                        targetBlockId: block.onComplete,
                        targetPortName: 'in',
                        path: ''
                    });
                }
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

    /**
     * Get available Start blocks in the workflow
     */
    private getAvailableStartBlocks(): Array<{ id: string; name: string }> {
        const blocks = this.engine.getBlocks();
        return blocks
            .filter(block => block.type === BlockType.Start)
            .map(block => ({
                id: block.id,
                name: block.name || block.id
            }));
    }

    /**
     * Get available profiles for a specific Start block
     */
    private getAvailableProfiles(startBlockId: string): Array<{ name: string; default?: boolean }> {
        const block = this.engine.getBlock(startBlockId);
        if (!block || block.type !== BlockType.Start) {
            return [];
        }

        const startBlock = block as StartBlock;
        if (!startBlock.config || !startBlock.config.profiles || startBlock.config.profiles.length === 0) {
            return [];
        }

        return startBlock.config.profiles.map((profile: any) => ({
            name: profile.name,
            default: profile.default || false
        }));
    }

    /**
     * Handle workflow execution
     */
    private onRunWorkflow(startBlockId: string, profile: string | null): void {
        console.log('[WorkflowDesigner] Running workflow', {
            startBlockId,
            profile: profile || 'default'
        });
        
        // TODO: Implement actual workflow execution
        // This should:
        // 1. Find the Start block by ID
        // 2. Set the selected profile on that Start block
        // 3. Execute the workflow from that Start block to End block
        // 4. Display results
        
        this.alertModal.show(`Running workflow from Start block "${startBlockId}" with profile "${profile || 'default'}"`, 'Workflow Execution', 'info');
    }
    
    /**
     * Handle End block add output
     */
    private onEndBlockAddOutput(blockId: string): void {
        const block = this.engine.getBlock(blockId);
        if (!block || block.type !== BlockType.End) return;
        
        const config = (block as any).config;
        if (!config.outputs) {
            config.outputs = {};
        }
        
        // Generate unique output name
        let counter = 1;
        let newName = `output${counter}`;
        while (config.outputs[newName] !== undefined) {
            counter++;
            newName = `output${counter}`;
        }
        
        config.outputs[newName] = {
            type: 'string',
            value: '',
            description: ''
        };
        
        this.renderWorkflow();
        if (this.selectedBlockId === blockId) {
            this.propertyPanel.showBlock(block);
        }
    }
    
    /**
     * Handle End block delete output
     */
    private onEndBlockDeleteOutput(blockId: string, outputName: string): void {
        const block = this.engine.getBlock(blockId);
        if (!block || block.type !== BlockType.End) return;
        
        const config = (block as any).config;
        if (config.outputs && config.outputs[outputName] !== undefined) {
            delete config.outputs[outputName];
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle End block rename output
     */
    private onEndBlockRenameOutput(blockId: string, oldName: string, newName: string): void {
        const block = this.engine.getBlock(blockId);
        if (!block || block.type !== BlockType.End) return;
        
        const config = (block as any).config;
        if (config.outputs && config.outputs[oldName] !== undefined) {
            const outputDef = config.outputs[oldName];
            delete config.outputs[oldName];
            config.outputs[newName] = outputDef;
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle End block output value change
     */
    private onEndBlockOutputValueChange(blockId: string, outputName: string, value: string): void {
        const block = this.engine.getBlock(blockId);
        if (!block || block.type !== BlockType.End) return;
        
        const config = (block as any).config;
        if (config.outputs && config.outputs[outputName] !== undefined) {
            config.outputs[outputName].value = value;
            this.renderWorkflow();
        }
    }
    
    /**
     * Handle End block output type change
     */
    private onEndBlockOutputTypeChange(blockId: string, outputName: string, type: string): void {
        const block = this.engine.getBlock(blockId);
        if (!block || block.type !== BlockType.End) return;
        
        const config = (block as any).config;
        if (config.outputs && config.outputs[outputName] !== undefined) {
            config.outputs[outputName].type = type;
            this.renderWorkflow();
            if (this.selectedBlockId === blockId) {
                this.propertyPanel.showBlock(block);
            }
        }
    }
    
    /**
     * Handle tool change (pointer vs hand)
     */
    private onToolChange(tool: 'pointer' | 'hand'): void {
        if (tool === 'hand') {
            this.canvas.enablePanMode();
        } else {
            this.canvas.disablePanMode();
        }
    }
}
