import { WorkflowEngine } from '../core/WorkflowEngine';
import { BlockType, AnyWorkflowBlock, StartBlock } from '../models/workflow-models';
import { VisualBlock, VisualConnection, Position } from './VisualModels';
import { CanvasRenderer } from './CanvasRenderer';
import { BlockPalette } from './BlockPalette';
import { ApiDefinitionLoader } from '../api/ApiDefinitionLoader';
import { DesignerConfig, DEFAULT_CONFIG } from './DesignerConfig';
import { FloatingPanel } from '../components/FloatingPanel';
import { AlertModal } from '../components/AlertModal';
import { Minimap } from '../components/Minimap';
import { BaseComponent } from '../utils/BaseComponent';
import { DOMUpdater } from '../utils/DOMUpdater';

// Type imports for lazy loading
import type { PropertyPanel } from './PropertyPanel';
import type { SettingsModal } from '../components/SettingsModal';

/**
 * Main workflow designer class that manages the visual design experience
 * This is the TypeScript equivalent of the UI functionality
 * Now extends BaseComponent for automatic cleanup and event management
 */
export class WorkflowDesigner extends BaseComponent {
    private config: DesignerConfig;
    private engine: WorkflowEngine;
    private canvas!: CanvasRenderer;
    private propertyPanel!: PropertyPanel;
    private propertyPanelLoaded: boolean = false;
    private floatingPanel!: FloatingPanel;
    private alertModal!: AlertModal;
    private blockPalette!: BlockPalette;
    private minimap!: Minimap;
    private settingsModal!: SettingsModal;
    private settingsModalLoaded: boolean = false;
    
    private visualBlocks: Map<string, VisualBlock>;
    private visualConnections: Map<string, VisualConnection>;
    private selectedBlockId: string | null = null;
    
    /**
     * Get the currently selected block ID
     */
    public getSelectedBlockId(): string | null {
        return this.selectedBlockId;
    }
    
    /**
     * Export workflow as data object
     */
    public exportWorkflow(): any {
        try {
            const workflow = this.engine.getWorkflow();
            const connections = this.getConnectionsData();
            
            return {
                ...workflow,
                connections: connections
            };
        } catch (error) {
            console.error('Error exporting workflow:', error);
            // Return a default workflow structure
            return {
                name: 'New Workflow',
                blocks: [],
                connections: []
            };
        }
    }
    
    /**
     * Import workflow from data object
     */
    public importWorkflow(workflowData: any): void {
        const json = typeof workflowData === 'string' ? workflowData : JSON.stringify(workflowData);
        this.engine.loadWorkflow(json);
        this.visualBlocks.clear();
        this.visualConnections.clear();
        
        // Position blocks
        this.positionBlocks();
        
        // Create connections from block data (handles both block-level and root-level connections)
        this.createVisualConnections();
        
        // Also restore root-level connections if any
        if (workflowData.connections) {
            workflowData.connections.forEach((conn: any) => {
                const connectionId = `${conn.fromBlock}_${conn.fromPort}_${conn.toBlock}_${conn.toPort}`;
                const visualConnection: VisualConnection = {
                    id: connectionId,
                    sourceBlockId: conn.fromBlock,
                    sourcePortName: conn.fromPort || 'output',
                    targetBlockId: conn.toBlock,
                    targetPortName: conn.toPort || 'input',
                    path: ''
                };
                this.visualConnections.set(connectionId, visualConnection);
            });
        }
        
        this.renderWorkflow();
    }
    
    /**
     * Clear the workflow
     */
    public clearWorkflow(): void {
        this.engine = new WorkflowEngine();
        this.visualBlocks.clear();
        this.visualConnections.clear();
        this.initializeDefaultWorkflow();
        this.renderWorkflow();
    }
    
    constructor(containerId: string, config?: DesignerConfig) {
        super(containerId);
        
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
                        <button id="import-btn" data-testid="toolbar-import">Import</button>
                        <button id="export-btn" data-testid="toolbar-export">Export</button>
                        <button id="validate-btn" data-testid="toolbar-validate">Validate</button>
                        <button id="clear-btn" data-testid="toolbar-clear">Clear</button>
                        <button id="settings-btn" class="toolbar-settings-btn" data-testid="toolbar-settings" title="Settings">
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
        
        // Initialize components (AlertModal needed early for BlockPalette)
        this.alertModal = new AlertModal();
        this.blockPalette = new BlockPalette('block-palette', this.alertModal);
        this.canvas = new CanvasRenderer('canvas-container');
        
        // Set default viewport position to reasonable area
        // This ensures blocks appear in a visible area when first added
        const canvasContainer = DOMUpdater.query<HTMLElement>(this.container, '#canvas-container');
        if (canvasContainer) {
            // Default viewport: start at a reasonable position
            const DEFAULT_VIEW_X = 1000; // Give some padding from edge
            const DEFAULT_VIEW_Y = 1000; // Give some padding from edge
            requestAnimationFrame(() => {
                canvasContainer.scrollLeft = DEFAULT_VIEW_X;
                canvasContainer.scrollTop = DEFAULT_VIEW_Y;
            });
        }
        
        // PropertyPanel and SettingsModal will be lazy-loaded on first use
        // This reduces initial bundle size
        
        // Add minimap container after canvas is initialized (since canvas replaces innerHTML)
        if (canvasContainer) {
            const minimapContainer = this.createElement('div', { id: 'minimap-container' });
            canvasContainer.appendChild(minimapContainer);
            this.minimap = new Minimap('minimap-container', 'canvas-container', () => this.canvas.getZoomLevel());
            // Hide minimap by default
            this.minimap.hide();
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
     * Setup event handlers with automatic cleanup tracking
     */
    private setupEventHandlers(): void {
        // Toolbar buttons - use DOMUpdater and BaseComponent's addEventListener
        const importBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#import-btn');
        const exportBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#export-btn');
        const validateBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#validate-btn');
        const clearBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#clear-btn');
        const settingsBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#settings-btn');
        
        if (importBtn) {
            this.addEventListener(importBtn, 'click', () => this.importWorkflowFromFile());
        }
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => this.exportWorkflowToFile());
        }
        if (validateBtn) {
            this.addEventListener(validateBtn, 'click', () => this.validateWorkflow());
        }
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', () => this.clearWorkflowWithConfirm());
        }
        if (settingsBtn) {
            this.addEventListener(settingsBtn, 'click', () => this.openSettings());
        }
        
        // Block palette events - register cleanup
        const blockDragStartHandler = (type: BlockType) => {
            (window as any).__draggedBlockType = type;
        };
        this.blockPalette.on('blockDragStart', blockDragStartHandler);
        this.registerCleanup(() => {
            this.blockPalette.off('blockDragStart', blockDragStartHandler);
        });
        
        const loadApiHandler = async (data: { url: string }) => {
            await this.loadApiDefinition(data.url);
        };
        this.blockPalette.on('loadApiDefinition', loadApiHandler);
        this.registerCleanup(() => {
            this.blockPalette.off('loadApiDefinition', loadApiHandler);
        });
        
        // Canvas events - register cleanup for all handlers
        const canvasHandlers: Array<{ event: string; handler: Function }> = [];
        
        const dropHandler = (position: Position) => {
            const type = (window as any).__draggedBlockType;
            if (type) {
                this.addBlock(type, position);
                delete (window as any).__draggedBlockType;
            }
        };
        this.canvas.on('drop', dropHandler);
        canvasHandlers.push({ event: 'drop', handler: dropHandler });
        
        const blockSelectHandler = async (blockId: string) => {
            await this.selectBlock(blockId);
        };
        this.canvas.on('blockSelect', blockSelectHandler);
        canvasHandlers.push({ event: 'blockSelect', handler: blockSelectHandler });
        
        const blockMoveHandler = (data: { blockId: string, position: Position }) => {
            this.moveBlock(data.blockId, data.position);
        };
        this.canvas.on('blockMove', blockMoveHandler);
        canvasHandlers.push({ event: 'blockMove', handler: blockMoveHandler });
        
        const connectionCreateHandler = (data: { sourceBlockId: string, sourcePortName: string, targetBlockId: string, targetPortName: string }) => {
            this.onConnectionCreated(data.sourceBlockId, data.targetBlockId, data.sourcePortName, data.targetPortName);
        };
        this.canvas.on('connectionCreate', connectionCreateHandler);
        canvasHandlers.push({ event: 'connectionCreate', handler: connectionCreateHandler });
        
        const profileChangeHandler = (data: { blockId: string, profile: string }) => {
            this.onProfileChange(data.blockId, data.profile);
        };
        this.canvas.on('profileChange', profileChangeHandler);
        canvasHandlers.push({ event: 'profileChange', handler: profileChangeHandler });
        
        // Start block events - add to cleanup array
        const startBlockAddInputHandler = (data: { blockId: string, name?: string, type?: string, value?: any }) => {
            if (data.name && data.type !== undefined) {
                this.onStartBlockAddInputDirect(data.blockId, data.name, data.type, data.value);
            } else {
                this.onStartBlockAddInput(data.blockId);
            }
        };
        this.canvas.on('startBlockAddInput', startBlockAddInputHandler);
        canvasHandlers.push({ event: 'startBlockAddInput', handler: startBlockAddInputHandler });
        
        const startBlockDeleteInputHandler = (data: { blockId: string, inputName: string }) => {
            this.onStartBlockDeleteInput(data.blockId, data.inputName);
        };
        this.canvas.on('startBlockDeleteInput', startBlockDeleteInputHandler);
        canvasHandlers.push({ event: 'startBlockDeleteInput', handler: startBlockDeleteInputHandler });
        
        const startBlockRenameInputHandler = (data: { blockId: string, oldName: string, newName: string }) => {
            this.onStartBlockRenameInput(data.blockId, data.oldName, data.newName);
        };
        this.canvas.on('startBlockRenameInput', startBlockRenameInputHandler);
        canvasHandlers.push({ event: 'startBlockRenameInput', handler: startBlockRenameInputHandler });
        
        const startBlockInputValueChangeHandler = (data: { blockId: string, inputName: string, value: string }) => {
            this.onStartBlockInputValueChange(data.blockId, data.inputName, data.value);
        };
        this.canvas.on('startBlockInputValueChange', startBlockInputValueChangeHandler);
        canvasHandlers.push({ event: 'startBlockInputValueChange', handler: startBlockInputValueChangeHandler });
        
        const startBlockInputTypeChangeHandler = (data: { blockId: string, inputName: string, type: string }) => {
            this.onStartBlockInputTypeChange(data.blockId, data.inputName, data.type);
        };
        this.canvas.on('startBlockInputTypeChange', startBlockInputTypeChangeHandler);
        canvasHandlers.push({ event: 'startBlockInputTypeChange', handler: startBlockInputTypeChangeHandler });
        
        // Start block profile management events
        const startBlockAddProfileHandler = (data: { blockId: string }) => {
            this.onStartBlockAddProfile(data.blockId);
        };
        this.canvas.on('startBlockAddProfile', startBlockAddProfileHandler);
        canvasHandlers.push({ event: 'startBlockAddProfile', handler: startBlockAddProfileHandler });
        
        const startBlockDeleteProfileHandler = (data: { blockId: string, profileName: string }) => {
            this.onStartBlockDeleteProfile(data.blockId, data.profileName);
        };
        this.canvas.on('startBlockDeleteProfile', startBlockDeleteProfileHandler);
        canvasHandlers.push({ event: 'startBlockDeleteProfile', handler: startBlockDeleteProfileHandler });
        
        const startBlockSetDefaultProfileHandler = (data: { blockId: string, profileName: string }) => {
            this.onStartBlockSetDefaultProfile(data.blockId, data.profileName);
        };
        this.canvas.on('startBlockSetDefaultProfile', startBlockSetDefaultProfileHandler);
        canvasHandlers.push({ event: 'startBlockSetDefaultProfile', handler: startBlockSetDefaultProfileHandler });
        
        // End block events
        const endBlockAddOutputHandler = (data: { blockId: string }) => {
            this.onEndBlockAddOutput(data.blockId);
        };
        this.canvas.on('endBlockAddOutput', endBlockAddOutputHandler);
        canvasHandlers.push({ event: 'endBlockAddOutput', handler: endBlockAddOutputHandler });
        
        const endBlockDeleteOutputHandler = (data: { blockId: string, outputName: string }) => {
            this.onEndBlockDeleteOutput(data.blockId, data.outputName);
        };
        this.canvas.on('endBlockDeleteOutput', endBlockDeleteOutputHandler);
        canvasHandlers.push({ event: 'endBlockDeleteOutput', handler: endBlockDeleteOutputHandler });
        
        const endBlockRenameOutputHandler = (data: { blockId: string, oldName: string, newName: string }) => {
            this.onEndBlockRenameOutput(data.blockId, data.oldName, data.newName);
        };
        this.canvas.on('endBlockRenameOutput', endBlockRenameOutputHandler);
        canvasHandlers.push({ event: 'endBlockRenameOutput', handler: endBlockRenameOutputHandler });
        
        const endBlockOutputValueChangeHandler = (data: { blockId: string, outputName: string, value: string }) => {
            this.onEndBlockOutputValueChange(data.blockId, data.outputName, data.value);
        };
        this.canvas.on('endBlockOutputValueChange', endBlockOutputValueChangeHandler);
        canvasHandlers.push({ event: 'endBlockOutputValueChange', handler: endBlockOutputValueChangeHandler });
        
        const endBlockOutputTypeChangeHandler = (data: { blockId: string, outputName: string, type: string }) => {
            this.onEndBlockOutputTypeChange(data.blockId, data.outputName, data.type);
        };
        this.canvas.on('endBlockOutputTypeChange', endBlockOutputTypeChangeHandler);
        canvasHandlers.push({ event: 'endBlockOutputTypeChange', handler: endBlockOutputTypeChangeHandler });
        
        // Block key-value management events
        const blockAddKeyValueHandler = (data: { blockId: string, itemType: string, portType?: string, name?: string, type?: string, value?: any }) => {
            const portType = (data.portType === 'input' || data.portType === 'output') ? data.portType : 'output';
            if (data.name && data.type !== undefined) {
                this.onBlockAddKeyValueDirect(data.blockId, data.itemType, portType, data.name, data.type, data.value);
            } else {
                this.onBlockAddKeyValue(data.blockId, data.itemType, portType);
            }
        };
        this.canvas.on('blockAddKeyValue', blockAddKeyValueHandler);
        canvasHandlers.push({ event: 'blockAddKeyValue', handler: blockAddKeyValueHandler });
        
        const blockDeleteKeyValueHandler = (data: { blockId: string, itemName: string, itemType: string, portType?: string }) => {
            this.onBlockDeleteKeyValue(data.blockId, data.itemName, data.itemType, data.portType);
        };
        this.canvas.on('blockDeleteKeyValue', blockDeleteKeyValueHandler);
        canvasHandlers.push({ event: 'blockDeleteKeyValue', handler: blockDeleteKeyValueHandler });
        
        const blockRenameKeyValueHandler = (data: { blockId: string, oldName: string, newName: string, itemType: string, portType?: string }) => {
            this.onBlockRenameKeyValue(data.blockId, data.oldName, data.newName, data.itemType, data.portType);
        };
        this.canvas.on('blockRenameKeyValue', blockRenameKeyValueHandler);
        canvasHandlers.push({ event: 'blockRenameKeyValue', handler: blockRenameKeyValueHandler });
        
        const blockKeyValueChangeHandler = (data: { blockId: string, itemName: string, value: string, itemType: string, portType?: string }) => {
            this.onBlockKeyValueChange(data.blockId, data.itemName, data.value, data.itemType, data.portType);
        };
        this.canvas.on('blockKeyValueChange', blockKeyValueChangeHandler);
        canvasHandlers.push({ event: 'blockKeyValueChange', handler: blockKeyValueChangeHandler });
        
        const blockKeyValueTypeChangeHandler = (data: { blockId: string, itemName: string, type: string, itemType: string, portType?: string }) => {
            this.onBlockKeyValueTypeChange(data.blockId, data.itemName, data.type, data.itemType, data.portType);
        };
        this.canvas.on('blockKeyValueTypeChange', blockKeyValueTypeChangeHandler);
        canvasHandlers.push({ event: 'blockKeyValueTypeChange', handler: blockKeyValueTypeChangeHandler });
        
        const connectionDeleteHandler = (data: { connectionId: string }) => {
            this.onConnectionDeleted(data.connectionId);
        };
        this.canvas.on('connectionDelete', connectionDeleteHandler);
        canvasHandlers.push({ event: 'connectionDelete', handler: connectionDeleteHandler });
        
        const blockDeleteHandler = (data: { blockId: string }) => {
            this.onBlockDeleted(data.blockId);
        };
        this.canvas.on('blockDelete', blockDeleteHandler);
        canvasHandlers.push({ event: 'blockDelete', handler: blockDeleteHandler });
        
        const canvasPropertyChangeHandler = (data: { blockId: string, property: string, value: any }) => {
            this.updateBlockProperty(data.blockId, data.property, data.value);
        };
        this.canvas.on('propertyChange', canvasPropertyChangeHandler);
        canvasHandlers.push({ event: 'propertyChange', handler: canvasPropertyChangeHandler });
        
        // Property panel events will be set up after lazy loading in setupPropertyPanelHandlers()
        
        // Register cleanup for all handlers
        this.registerCleanup(() => {
            canvasHandlers.forEach(({ event, handler }) => {
                this.canvas.off(event, handler as any);
            });
            // Property panel cleanup is handled in setupPropertyPanelHandlers()
        });
    }
    
    /**
     * Initialize with a default workflow
     */
    private initializeDefaultWorkflow(): void {
        // Create default start and end blocks at visible area
        const DEFAULT_VIEW_X = 2000;
        const DEFAULT_VIEW_Y = 2000;
        
        const startBlock = this.engine.createBlock(BlockType.Start);
        startBlock.name = 'Start';
        this.engine.addBlock(startBlock);
        this.addVisualBlock(startBlock, { x: DEFAULT_VIEW_X - 200, y: DEFAULT_VIEW_Y });
        
        // Add end block
        const endBlock = this.engine.createBlock(BlockType.End);
        endBlock.name = 'End';
        this.engine.addBlock(endBlock);
        this.addVisualBlock(endBlock, { x: DEFAULT_VIEW_X + 200, y: DEFAULT_VIEW_Y });
        
        this.renderWorkflow();
        
        // Center blocks after first render with limited zoom (keep zoomed out)
        requestAnimationFrame(() => {
            this.canvas.zoomFitToScreen(0.8); // Max 80% zoom for initial render
        });
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
        this.selectBlock(block.id).catch(err => 
            console.error('Failed to select block:', err)
        );
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
     * Lazy load PropertyPanel on first use
     */
    private async ensurePropertyPanelLoaded(): Promise<void> {
        if (this.propertyPanelLoaded) {
            return;
        }
        
        try {
            const PropertyPanelModule = await import('./PropertyPanel');
            // PropertyPanel is a named export, access it directly
            const PropertyPanelClass = PropertyPanelModule.PropertyPanel;
            if (!PropertyPanelClass) {
                throw new Error('PropertyPanel export not found');
            }
            this.propertyPanel = new PropertyPanelClass('property-panel');
            this.propertyPanelLoaded = true;
            
            // Setup event handlers for property panel
            this.setupPropertyPanelHandlers();
        } catch (error) {
            console.error('Failed to load PropertyPanel:', error);
            throw error;
        }
    }
    
    /**
     * Lazy load SettingsModal on first use
     */
    private async ensureSettingsModalLoaded(): Promise<void> {
        if (this.settingsModalLoaded) {
            return;
        }
        
        try {
            const SettingsModalModule = await import('../components/SettingsModal');
            // SettingsModal is a named export, access it directly
            const SettingsModalClass = SettingsModalModule.SettingsModal;
            if (!SettingsModalClass) {
                throw new Error('SettingsModal export not found');
            }
            this.settingsModal = new SettingsModalClass();
            this.settingsModalLoaded = true;
        } catch (error) {
            console.error('Failed to load SettingsModal:', error);
            throw error;
        }
    }
    
    /**
     * Setup event handlers for property panel (called after lazy loading)
     */
    private setupPropertyPanelHandlers(): void {
        const propertyPanelPropertyChangeHandler = (data: { blockId: string, property: string, value: any }) => {
            this.updateBlockProperty(data.blockId, data.property, data.value);
        };
        this.propertyPanel.on('propertyChange', propertyPanelPropertyChangeHandler);
        
        const propertyPanelBlockUpdatedHandler = (data: { blockId: string, block?: any }) => {
            const blockId = typeof data === 'string' ? data : data.blockId;
            const block = typeof data === 'object' && data.block ? data.block : this.engine.getBlock(blockId);
            
            if (block && block.type === BlockType.Start && block.config?.selectedProfile) {
                const engineBlock = this.engine.getBlock(blockId);
                if (engineBlock && engineBlock.type === BlockType.Start) {
                    (engineBlock as any).config.selectedProfile = block.config.selectedProfile;
                }
                this.syncFloatingPanelProfile(blockId, block.config.selectedProfile);
                this.renderWorkflow();
            } else {
                this.renderWorkflow();
            }
        };
        this.propertyPanel.on('blockUpdated', propertyPanelBlockUpdatedHandler);
        
        this.registerCleanup(() => {
            this.propertyPanel.off('propertyChange', propertyPanelPropertyChangeHandler);
            this.propertyPanel.off('blockUpdated', propertyPanelBlockUpdatedHandler);
        });
    }
    
    /**
     * Ensure PropertyPanel is loaded and execute callback
     * Handles lazy loading transparently
     */
    private async withPropertyPanel<T>(callback: (panel: PropertyPanel) => T | Promise<T>): Promise<T> {
        await this.ensurePropertyPanelLoaded();
        return callback(this.propertyPanel);
    }
    
    /**
     * Select a block
     */
    private async selectBlock(blockId: string | null): Promise<void> {
        // Deselect all blocks
        this.visualBlocks.forEach(vb => vb.selected = false);
        
        if (blockId) {
            const visualBlock = this.visualBlocks.get(blockId);
            if (visualBlock) {
                visualBlock.selected = true;
                this.selectedBlockId = blockId;
                
                // Lazy load PropertyPanel if needed and show block
                const block = this.engine.getBlock(blockId);
                if (block) {
                    await this.withPropertyPanel(panel => panel.showBlock(block));
                }
            }
        } else {
            this.selectedBlockId = null;
            // Only clear if PropertyPanel is loaded
            if (this.propertyPanelLoaded) {
                await this.withPropertyPanel(panel => panel.clear());
            }
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
            // Fire-and-forget: ensure PropertyPanel is loaded and show block
            this.withPropertyPanel(panel => panel.showBlock(block)).catch(err => 
                console.error('Failed to show block in property panel:', err)
            );
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
            // Fire-and-forget: ensure PropertyPanel is loaded and show block
            this.withPropertyPanel(panel => panel.showBlock(block)).catch(err => 
                console.error('Failed to show block in property panel:', err)
            );
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
            // Fire-and-forget: ensure PropertyPanel is loaded and show block
            this.withPropertyPanel(panel => panel.showBlock(block)).catch(err => 
                console.error('Failed to show block in property panel:', err)
            );
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
            // Fire-and-forget: ensure PropertyPanel is loaded and show block
            this.withPropertyPanel(panel => panel.showBlock(block)).catch(err => 
                console.error('Failed to show block in property panel:', err)
            );
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
            // Fire-and-forget: ensure PropertyPanel is loaded and show block
            this.withPropertyPanel(panel => panel.showBlock(block)).catch(err => 
                console.error('Failed to show block in property panel:', err)
            );
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
                    this.selectBlock(blockId).catch(err => 
                        console.error('Failed to select block:', err)
                    );
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
            // Fire-and-forget: clear property panel if loaded
            if (this.propertyPanelLoaded) {
                this.withPropertyPanel(panel => panel.clear()).catch(err => 
                    console.error('Failed to clear property panel:', err)
                );
            }
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
     * Import workflow from file (private method)
     */
    private importWorkflowFromFile(): void {
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
                    
                    // Center blocks after rendering with limited zoom (keep zoomed out)
                    requestAnimationFrame(() => {
                        this.canvas.zoomFitToScreen(0.8); // Max 80% zoom for initial render
                    });
                    
                    this.alertModal.show('Workflow imported successfully', 'Import Success', 'success');
                } catch (error) {
                    this.alertModal.show(`Failed to import workflow: ${error}`, 'Import Failed', 'error');
                }
            }
        };
        
        input.click();
    }
    
    /**
     * Export workflow to file (private method)
     */
    private exportWorkflowToFile(): void {
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
     * Clear the workflow (private method)
     */
    private clearWorkflowWithConfirm(): void {
        if (confirm('Are you sure you want to clear the workflow?')) {
            this.engine = new WorkflowEngine();
            this.visualBlocks.clear();
            this.visualConnections.clear();
            this.selectedBlockId = null;
            this.initializeDefaultWorkflow();
        }
    }
    
    /**
     * Open settings modal (lazy loaded)
     */
    private async openSettings(): Promise<void> {
        // Lazy load SettingsModal if needed
        await this.ensureSettingsModalLoaded();
        
        const minimapEnabled = this.minimap.isVisible();
        
        this.settingsModal.show(
            minimapEnabled,
            (enabled: boolean) => {
                if (enabled) {
                    this.minimap.show();
                } else {
                    this.minimap.hide();
                }
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
        this.minimap.updateBlocks(Array.from(this.visualBlocks.values()));
    }
    
    /**
     * Get connections data for export
     */
    private getConnectionsData(): any[] {
        const connections: any[] = [];
        this.visualConnections.forEach(conn => {
            connections.push({
                fromBlock: conn.sourceBlockId,
                fromPort: conn.sourcePortName,
                toBlock: conn.targetBlockId,
                toPort: conn.targetPortName
            });
        });
        return connections;
    }
    
    /**
     * Position blocks when importing
     * Positions blocks in a visible area with proper spacing
     */
    private positionBlocks(): void {
        const blocks = this.engine.getBlocks();
        const spacing = 150;
        // Start from a reasonable visible position
        const DEFAULT_VIEW_X = 2000;
        const DEFAULT_VIEW_Y = 2000;
        let x = DEFAULT_VIEW_X - 400; // Offset to left of center
        let y = DEFAULT_VIEW_Y - 100; // Offset above center
        
        blocks.forEach((block) => {
            this.addVisualBlock(block, { x, y });
            x += spacing;
            
            // Wrap to next row if too far right
            if (x > DEFAULT_VIEW_X + 400) {
                x = DEFAULT_VIEW_X - 400;
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
            // Fire-and-forget: ensure PropertyPanel is loaded and show block
            this.withPropertyPanel(panel => panel.showBlock(block)).catch(err => 
                console.error('Failed to show block in property panel:', err)
            );
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
    
    /**
     * Cleanup method - destroys all child components
     */
    destroy(): void {
        // Destroy child components (using optional chaining for components that may not have destroy)
        this.canvas?.destroy();
        
        // Destroy PropertyPanel if loaded
        if (this.propertyPanelLoaded && typeof (this.propertyPanel as any).destroy === 'function') {
            (this.propertyPanel as any).destroy();
        }
        
        this.floatingPanel?.destroy?.();
        
        if (typeof (this.minimap as any).destroy === 'function') {
            (this.minimap as any).destroy();
        }
        
        if (typeof (this.blockPalette as any).destroy === 'function') {
            (this.blockPalette as any).destroy();
        }
        
        this.alertModal?.destroy?.();
        
        // Destroy SettingsModal if loaded
        if (this.settingsModalLoaded && typeof (this.settingsModal as any).destroy === 'function') {
            (this.settingsModal as any).destroy();
        }
        
        // Call parent destroy to clean up event listeners
        super.destroy();
    }
}
