import { WorkflowEngine } from '../core/WorkflowEngine';
import { BrowserWorkflowExecutor } from '../core/BrowserWorkflowExecutor';
import { BlockType, Node, Edge, EdgeType } from '../models/workflow-models';
import { VisualBlock, VisualConnection, Position } from './VisualModels';
import { CanvasRenderer } from './CanvasRenderer';
import { BlockPalette } from './BlockPalette';
import { ApiDefinitionLoader } from '../api/ApiDefinitionLoader';
import { DesignerConfig, DEFAULT_CONFIG } from './DesignerConfig';
import { FloatingPanel } from '../components/FloatingPanel';
import { AlertModal } from '../components/AlertModal';
import { TerminalPanel } from '../components/TerminalPanel';
import { Minimap } from '../components/Minimap';
import { BaseComponent } from '../utils/BaseComponent';
import { DOMUpdater } from '../utils/DOMUpdater';

// Type imports for lazy loading
import type { PropertyPanel } from './PropertyPanel';
import type { SettingsModal } from '../components/SettingsModal';

/**
 * Main workflow designer class that manages the visual design experience
 */
export class WorkflowDesigner extends BaseComponent {
    private config: DesignerConfig;
    private engine: WorkflowEngine;
    private executor!: BrowserWorkflowExecutor;
    private canvas!: CanvasRenderer;
    private propertyPanel!: PropertyPanel;
    private propertyPanelLoaded: boolean = false;
    private floatingPanel!: FloatingPanel;
    private alertModal!: AlertModal;
    private terminalPanel!: TerminalPanel;
    private blockPalette!: BlockPalette;
    private minimap!: Minimap;
    private settingsModal!: SettingsModal;
    private settingsModalLoaded: boolean = false;
    
    private visualBlocks: Map<string, VisualBlock>;
    private visualConnections: Map<string, VisualConnection>;
    private selectedBlockId: string | null = null;
    
    public getSelectedBlockId(): string | null {
        return this.selectedBlockId;
    }
    
    public exportWorkflow(): any {
        try {
            const workflow = this.engine.getWorkflow();
            const layout: any = {};
            this.visualBlocks.forEach(vb => {
                layout[vb.id] = { x: vb.position.x, y: vb.position.y };
            });
            
            return {
                ...workflow,
                layout: layout
            };
        } catch (error) {
            console.error('Error exporting workflow:', error);
            return { name: 'Error', nodes: [], edges: [] };
        }
    }
    
    public importWorkflow(workflowData: any): void {
        console.log('[WorkflowDesigner] Importing workflow data...', workflowData);
        try {
        const json = typeof workflowData === 'string' ? workflowData : JSON.stringify(workflowData);
        this.engine.loadWorkflow(json);
            console.log('[WorkflowDesigner] Loaded into engine');
            
        this.visualBlocks.clear();
        this.visualConnections.clear();
        
            // Position blocks (Node-Edge schema doesn't store UI in Nodes)
            const layout = workflowData.layout || {};
            const nodes = this.engine.getNodes();
            console.log(`[WorkflowDesigner] Found ${nodes.length} nodes`);
            
            const spacing = 250;
            let x = 100;
            let y = 100;

            nodes.forEach(node => {
                let pos = { x, y };
                if (layout[node.id]) {
                    pos = layout[node.id];
                } else if ((node as any).ui) {
                    pos = (node as any).ui;
                } else {
                    // Auto position simple fallback
                    x += spacing;
                    if (x > 2000) { x = 100; y += 150; }
                }
                this.addVisualBlock(node, pos);
            });
            
            this.createVisualConnections();
        this.renderWorkflow();
            console.log('[WorkflowDesigner] Import complete');
            
            this.alertModal.show('Workflow imported successfully', 'Import Success', 'success');
        } catch (error) {
            console.error('[WorkflowDesigner] Import failed:', error);
            this.alertModal.show(`Import failed: ${error}`, 'Error', 'error');
        }
    }
    
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
        this.loadHostApis();
    }
    
    private async loadHostApis(): Promise<void> {
        if (this.config.mode !== 'embedded' || !this.config.hostApis || this.config.hostApis.length === 0) {
            return;
        }
        console.log(`[Embedded Mode] Loading ${this.config.hostApis.length} host API(s)...`);
        for (const hostApi of this.config.hostApis) {
            try {
                const api = await ApiDefinitionLoader.loadFromUrl(hostApi.swaggerUrl);
                api.name = hostApi.name || api.name;
                if (hostApi.version) api.version = hostApi.version;
                this.blockPalette.addApiDefinition(api, true);
                console.log(`✓ Loaded host API: ${api.name}`);
            } catch (error) {
                console.error(`✗ Failed to load host API ${hostApi.name}:`, error);
            }
        }
    }
    
    private setupUI(): void {
        this.container.innerHTML = `
            <div class="siye-flow-designer">
                <div class="designer-header">
                    <h2>SiyeFlow Designer</h2>
                    <div class="toolbar">
                        <button id="import-btn">Import</button>
                        <button id="export-btn">Export</button>
                        <button id="validate-btn">Validate</button>
                        <button id="clear-btn">Clear</button>
                        <button id="settings-btn">Settings</button>
                    </div>
                </div>
                <div class="designer-body">
                    <div id="block-palette" class="block-palette"></div>
                    <div id="canvas-container" class="canvas-container"></div>
                    <div id="property-panel" class="property-panel"></div>
                </div>
                <div id="floating-panel-container"></div>
                <div id="terminal-container"></div>
            </div>
        `;
        
        this.alertModal = new AlertModal();
        this.blockPalette = new BlockPalette('block-palette', this.alertModal);
        this.canvas = new CanvasRenderer('canvas-container');
        
        // Initialize terminal panel and workflow executor
        this.terminalPanel = new TerminalPanel('terminal-container');
        this.executor = new BrowserWorkflowExecutor(this.terminalPanel);
        
        // Handle terminal block click to highlight block
        this.terminalPanel.on('blockClick', (data: { blockId: string }) => {
            this.selectBlock(data.blockId);
            this.canvas.centerOnBlock(data.blockId);
        });
        
        const canvasContainer = DOMUpdater.query<HTMLElement>(this.container, '#canvas-container');
        if (canvasContainer) {
            requestAnimationFrame(() => {
                canvasContainer.scrollLeft = 500;
                canvasContainer.scrollTop = 500;
            });
        }
        
        if (canvasContainer) {
            const minimapContainer = this.createElement('div', { id: 'minimap-container' });
            canvasContainer.appendChild(minimapContainer);
            this.minimap = new Minimap('minimap-container', 'canvas-container', () => this.canvas.getZoomLevel());
            this.minimap.hide();
        }

        // Floating Panel updated to use getNodes
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
        
        this.setupEventHandlers();
    }
    
    private setupEventHandlers(): void {
        const importBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#import-btn');
        const exportBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#export-btn');
        const validateBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#validate-btn');
        const clearBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#clear-btn');
        const settingsBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#settings-btn');
        
        if (importBtn) this.addEventListener(importBtn, 'click', () => this.importWorkflowFromFile());
        if (exportBtn) this.addEventListener(exportBtn, 'click', () => this.exportWorkflowToFile());
        if (validateBtn) this.addEventListener(validateBtn, 'click', () => this.validateWorkflow());
        if (clearBtn) this.addEventListener(clearBtn, 'click', () => this.clearWorkflowWithConfirm());
        if (settingsBtn) this.addEventListener(settingsBtn, 'click', () => this.openSettings());
        
        // Block Palette
        this.blockPalette.on('blockDragStart', (type: BlockType) => {
            (window as any).__draggedBlockType = type;
        });
        this.blockPalette.on('loadApiDefinition', async (data: { url: string }) => {
            await this.loadApiDefinition(data.url);
        });
        
        // Canvas
        this.canvas.on('drop', (position: Position) => {
            const type = (window as any).__draggedBlockType;
            if (type) {
                this.addBlock(type, position);
                delete (window as any).__draggedBlockType;
            }
        });
        this.canvas.on('blockSelect', (blockId: string) => this.selectBlock(blockId));
        this.canvas.on('blockMove', (data: { blockId: string, position: Position }) => this.moveBlock(data.blockId, data.position));
        
        this.canvas.on('connectionCreate', (data: { sourceBlockId: string, sourcePortName: string, targetBlockId: string, targetPortName: string }) => {
            this.onConnectionCreated(data.sourceBlockId, data.targetBlockId, data.sourcePortName, data.targetPortName);
        });

        this.canvas.on('blockDelete', (data: { blockId: string }) => this.onBlockDeleted(data.blockId));
        this.canvas.on('connectionDelete', (data: { connectionId: string }) => this.onConnectionDeleted(data.connectionId));
        
        // Start block input events
        this.canvas.on('startBlockAddInput', (data: { blockId: string }) => {
            console.log('[WorkflowDesigner] Received startBlockAddInput event for block:', data.blockId);
            this.handleStartBlockAddInput(data.blockId);
        });
        this.canvas.on('startBlockDeleteInput', (data: { blockId: string, inputName: string }) => this.handleStartBlockDeleteInput(data.blockId, data.inputName));
        this.canvas.on('startBlockRenameInput', (data: { blockId: string, oldName: string, newName: string }) => this.handleStartBlockRenameInput(data.blockId, data.oldName, data.newName));
        this.canvas.on('startBlockInputValueChange', (data: { blockId: string, inputName: string, value: string }) => this.handleStartBlockInputValueChange(data.blockId, data.inputName, data.value));
        this.canvas.on('startBlockInputTypeChange', (data: { blockId: string, inputName: string, type: string }) => this.handleStartBlockInputTypeChange(data.blockId, data.inputName, data.type));
        
        // End block output events
        this.canvas.on('endBlockAddOutput', (data: { blockId: string }) => this.handleEndBlockAddOutput(data.blockId));
        this.canvas.on('endBlockDeleteOutput', (data: { blockId: string, outputName: string }) => this.handleEndBlockDeleteOutput(data.blockId, data.outputName));
        this.canvas.on('endBlockRenameOutput', (data: { blockId: string, oldName: string, newName: string }) => this.handleEndBlockRenameOutput(data.blockId, data.oldName, data.newName));
        this.canvas.on('endBlockOutputValueChange', (data: { blockId: string, outputName: string, value: string }) => this.handleEndBlockOutputValueChange(data.blockId, data.outputName, data.value));
        this.canvas.on('endBlockOutputTypeChange', (data: { blockId: string, outputName: string, type: string }) => this.handleEndBlockOutputTypeChange(data.blockId, data.outputName, data.type));
        
        // Generic block key-value events
        this.canvas.on('blockAddKeyValue', (data: any) => this.handleBlockAddKeyValue(data));
        this.canvas.on('blockDeleteKeyValue', (data: any) => this.handleBlockDeleteKeyValue(data));
        this.canvas.on('blockRenameKeyValue', (data: any) => this.handleBlockRenameKeyValue(data));
        this.canvas.on('blockKeyValueChange', (data: any) => this.handleBlockKeyValueChange(data));
        this.canvas.on('blockKeyValueTypeChange', (data: any) => this.handleBlockKeyValueTypeChange(data));
        
        // Register cleanup handled by base class
    }
    
    private initializeDefaultWorkflow(): void {
        const startNode = this.engine.createNode(BlockType.Start);
        this.engine.addNode(startNode);
        this.addVisualBlock(startNode, { x: 100, y: 200 });
        
        const endNode = this.engine.createNode(BlockType.End);
        this.engine.addNode(endNode);
        this.addVisualBlock(endNode, { x: 500, y: 200 });
        
        this.renderWorkflow();
    }
    
    private addBlock(type: BlockType, position: Position): void {
        const node = this.engine.createNode(type);
        this.engine.addNode(node);
        this.addVisualBlock(node, position);
        this.renderWorkflow();
        this.selectBlock(node.id);
    }
    
    private addVisualBlock(node: Node, position: Position): void {
        const visualBlock: VisualBlock = {
            id: node.id,
            type: node.type,
            label: node.label,
            data: node.data,
            position,
            width: 250,
            height: 100,
            selected: false
        };
        this.visualBlocks.set(node.id, visualBlock);
    }
    
    private moveBlock(blockId: string, position: Position): void {
        const visualBlock = this.visualBlocks.get(blockId);
        if (visualBlock) {
            visualBlock.position = position;
            this.renderWorkflow();
        }
    }
    
    private async ensurePropertyPanelLoaded(): Promise<void> {
        if (this.propertyPanelLoaded) return;
        try {
            const mod = await import('./PropertyPanel');
            const PropertyPanelClass = mod.PropertyPanel;
            this.propertyPanel = new PropertyPanelClass('property-panel');
            this.propertyPanelLoaded = true;
            
            // Setup handler
            this.propertyPanel.on('propertyChange', (data) => {
                this.updateBlockProperty(data.blockId, data.property, data.value);
            });
        } catch (error) {
            console.error('Failed to load PropertyPanel:', error);
        }
        }
    
    private async selectBlock(blockId: string | null): Promise<void> {
        this.visualBlocks.forEach(vb => vb.selected = false);
        
        if (blockId) {
            const visualBlock = this.visualBlocks.get(blockId);
            if (visualBlock) {
                visualBlock.selected = true;
                this.selectedBlockId = blockId;
                
                const node = this.engine.getNode(blockId);
                if (node) {
                    await this.ensurePropertyPanelLoaded();
                    // Pass the Node object which PropertyPanel must now accept
                    // NOTE: PropertyPanel likely needs updating too, but passing generic object might work
                    this.propertyPanel.showBlock(node as any); 
                }
            }
        } else {
            this.selectedBlockId = null;
            if (this.propertyPanelLoaded) this.propertyPanel.clear();
        }
        
        this.renderWorkflow();
    }
    
    private onConnectionCreated(sourceId: string, targetId: string, sourceHandle: string, targetHandle: string): void {
        // Determine edge type based on handles
        // Heuristic: if handles contain "trigger" or "success"/"fail", it's execution
        // If handles are variable names, it's data
        // For now, simple logic:
        const type = (sourceHandle === 'trigger' || sourceHandle === 'success' || sourceHandle === 'fail' || targetHandle === 'trigger')
            ? EdgeType.Execution 
            : EdgeType.Data;
            
        const edge: Edge = {
            id: `${sourceId}-${sourceHandle}-${targetId}-${targetHandle}`, // temp ID
            type,
            source: sourceId,
            sourceHandle,
            target: targetId,
            targetHandle
        };
        
        this.engine.addEdge(edge);
        this.createVisualConnections(); // refresh all connections
            this.renderWorkflow();
        }
    
    // V2: use engine.getNodes()
    private getAvailableStartBlocks(): Array<{ id: string; name: string }> {
        return this.engine.getNodes()
            .filter(node => node.type === BlockType.Start)
            .map(node => ({
                id: node.id,
                name: node.label || node.id
            }));
        }
    
    private getAvailableProfiles(startBlockId: string): Array<{ name: string; default?: boolean }> {
        const node = this.engine.getNode(startBlockId);
        if (!node || node.type !== BlockType.Start) return [];
        
        // Access node.data.profiles
        const profiles = node.data.profiles || [];
        return profiles.map((p: any) => ({
            name: p.name,
            default: p.default
        }));
            }
    
    private async onRunWorkflow(startBlockId: string, profile: string | null): Promise<void> {
        console.log('Running workflow', { startBlockId, profile });
        
        try {
            const workflow = this.engine.getWorkflow();
            const success = await this.executor.execute(workflow, startBlockId, profile || undefined);
            
            if (success) {
                this.alertModal.show('Workflow completed successfully!', 'Success', 'success');
                } else {
                this.alertModal.show('Workflow completed with errors. Check terminal for details.', 'Warning', 'warning');
            }
        } catch (error) {
            this.alertModal.show(`Workflow failed: ${error}`, 'Error', 'error');
        }
    }
    
    /**
     * Stop the currently running workflow
     */
    public stopWorkflow(): void {
        this.executor.stop();
                }
    
    private onFloatingPanelProfileChange(startBlockId: string, profileName: string): void {
        const node = this.engine.getNode(startBlockId);
        if (node) {
            node.data.selectedProfile = profileName;
        this.renderWorkflow();
        }
    }
    
    private onConnectionDeleted(connectionId: string): void {
        this.engine.removeEdge(connectionId);
        this.createVisualConnections();
        this.renderWorkflow();
    }
    
    private onBlockDeleted(blockId: string): void {
        this.engine.removeNode(blockId);
        this.visualBlocks.delete(blockId);
        this.createVisualConnections();
        this.renderWorkflow();
    }
    
    private updateBlockProperty(blockId: string, property: string, value: any): void {
        const node = this.engine.getNode(blockId);
        if (node) {
            // Update data property via path if needed, for now shallow
            // Logic to update deep properties in node.data
            if (property.startsWith('data.')) {
                const prop = property.substring(5);
                node.data[prop] = value;
            } else {
                (node as any)[property] = value;
            }
            this.renderWorkflow();
        }
    }
    
    private importWorkflowFromFile(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const text = await file.text();
                console.log('File loaded, size:', text.length);
                this.importWorkflow(text);
            }
        };
        input.click();
    }
    
    private exportWorkflowToFile(): void {
        const data = this.exportWorkflow();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workflow-v2.json';
        a.click();
    }
    
    private validateWorkflow(): void {
        const result = this.engine.validate();
        if (result.isValid) this.alertModal.show('Valid Workflow', 'Success', 'success');
        else this.alertModal.show(result.errors.join('\n'), 'Validation Failed', 'error');
        }
    
    private clearWorkflowWithConfirm(): void {
        if (confirm('Clear workflow?')) this.clearWorkflow();
        }
    
    private async openSettings(): Promise<void> {
        // Settings implementation
    }
    
    private async loadApiDefinition(url: string): Promise<void> {
        // Implementation
    }
    
    private renderWorkflow(): void {
        // Pass block data to canvas for rich display
        const blockDataMap = new Map<string, Node>();
        this.engine.getNodes().forEach(node => {
            blockDataMap.set(node.id, node);
        });
        this.canvas.setBlockData(blockDataMap);
        
        // Need to create visual connections from edges
        this.createVisualConnections();
        
        this.canvas.render(this.visualBlocks, this.visualConnections);
    }
    
    private createVisualConnections(): void {
        this.visualConnections.clear();
        const edges = this.engine.getWorkflow().edges;
        
        edges.forEach(edge => {
            this.visualConnections.set(edge.id, {
                id: edge.id,
                type: edge.type,
                sourceBlockId: edge.source,
                sourcePortName: edge.sourceHandle,
                targetBlockId: edge.target,
                targetPortName: edge.targetHandle,
                path: '',
                selected: false
                    });
                });
            }
    
    // ============================================
    // Start Block Input Handlers
    // ============================================
    
    private handleStartBlockAddInput(blockId: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.Start) return;
        
        const data = node.data;
        
        // Ensure profiles exist
        if (!data.profiles || data.profiles.length === 0) {
            data.profiles = [{ name: 'Default', default: true, inputs: {} }];
            data.selectedProfile = 'Default';
        }
        
        // Get or create the selected profile
        const selectedProfile = data.profiles.find((p: any) => p.name === data.selectedProfile) 
            || data.profiles.find((p: any) => p.default) 
            || data.profiles[0];
        
        if (!selectedProfile.inputs) {
            selectedProfile.inputs = {};
        }
        
        // Generate unique input name
        let counter = 1;
        let newName = `input${counter}`;
        while (selectedProfile.inputs[newName]) {
            counter++;
            newName = `input${counter}`;
        }
        
        // Add the new input
        selectedProfile.inputs[newName] = { type: 'string', value: '' };
        
        console.log('[WorkflowDesigner] Added input:', newName, 'to block:', blockId);
        this.renderWorkflow();
    }
    
    private handleStartBlockDeleteInput(blockId: string, inputName: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.Start) return;
        
        const data = node.data;
        const selectedProfile = data.profiles?.find((p: any) => p.name === data.selectedProfile) 
            || data.profiles?.find((p: any) => p.default) 
            || data.profiles?.[0];
        
        if (selectedProfile?.inputs && selectedProfile.inputs[inputName]) {
            delete selectedProfile.inputs[inputName];
            this.renderWorkflow();
        }
    }
    
    private handleStartBlockRenameInput(blockId: string, oldName: string, newName: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.Start || oldName === newName) return;
        
        const data = node.data;
        const selectedProfile = data.profiles?.find((p: any) => p.name === data.selectedProfile) 
            || data.profiles?.find((p: any) => p.default) 
            || data.profiles?.[0];
        
        if (selectedProfile?.inputs && selectedProfile.inputs[oldName]) {
            selectedProfile.inputs[newName] = selectedProfile.inputs[oldName];
            delete selectedProfile.inputs[oldName];
            this.renderWorkflow();
        }
    }
    
    private handleStartBlockInputValueChange(blockId: string, inputName: string, value: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.Start) return;
        
        const data = node.data;
        const selectedProfile = data.profiles?.find((p: any) => p.name === data.selectedProfile) 
            || data.profiles?.find((p: any) => p.default) 
            || data.profiles?.[0];
        
        if (selectedProfile?.inputs && selectedProfile.inputs[inputName]) {
            selectedProfile.inputs[inputName].value = value;
            // No need to re-render for value changes, just update the data
        }
    }
    
    private handleStartBlockInputTypeChange(blockId: string, inputName: string, type: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.Start) return;
        
        const data = node.data;
        const selectedProfile = data.profiles?.find((p: any) => p.name === data.selectedProfile) 
            || data.profiles?.find((p: any) => p.default) 
            || data.profiles?.[0];
        
        if (selectedProfile?.inputs && selectedProfile.inputs[inputName]) {
            selectedProfile.inputs[inputName].type = type;
            this.renderWorkflow();
        }
    }
    
    // ============================================
    // End Block Output Handlers
    // ============================================
    
    private handleEndBlockAddOutput(blockId: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.End) return;
        
        const data = node.data;
        if (!data.outputs) {
            data.outputs = {};
        }
        
        // Generate unique output name
        let counter = 1;
        let newName = `output${counter}`;
        while (data.outputs[newName]) {
            counter++;
            newName = `output${counter}`;
        }
        
        // Add the new output
        data.outputs[newName] = { type: 'string', value: '' };
        
        console.log('[WorkflowDesigner] Added output:', newName, 'to block:', blockId);
        this.renderWorkflow();
    }
    
    private handleEndBlockDeleteOutput(blockId: string, outputName: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.End) return;
        
        if (node.data.outputs && node.data.outputs[outputName]) {
            delete node.data.outputs[outputName];
            this.renderWorkflow();
        }
    }
    
    private handleEndBlockRenameOutput(blockId: string, oldName: string, newName: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.End || oldName === newName) return;
        
        if (node.data.outputs && node.data.outputs[oldName]) {
            node.data.outputs[newName] = node.data.outputs[oldName];
            delete node.data.outputs[oldName];
            this.renderWorkflow();
        }
    }
    
    private handleEndBlockOutputValueChange(blockId: string, outputName: string, value: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.End) return;
        
        if (node.data.outputs && node.data.outputs[outputName]) {
            node.data.outputs[outputName].value = value;
        }
    }
    
    private handleEndBlockOutputTypeChange(blockId: string, outputName: string, type: string): void {
        const node = this.engine.getNode(blockId);
        if (!node || node.type !== BlockType.End) return;
        
        if (node.data.outputs && node.data.outputs[outputName]) {
            node.data.outputs[outputName].type = type;
            this.renderWorkflow();
        }
    }
    
    // ============================================
    // Generic Block Key-Value Handlers
    // ============================================
    
    private handleBlockAddKeyValue(data: any): void {
        const { blockId, itemType, portType } = data;
        const node = this.engine.getNode(blockId);
        if (!node) return;
        
        const config = node.data;
        const targetObj = portType === 'input' 
            ? (config.inputs || (config.inputs = {}))
            : (config.outputs || (config.outputs = {}));
        
        let counter = 1;
        let newName = `${itemType}${counter}`;
        while (targetObj[newName]) {
            counter++;
            newName = `${itemType}${counter}`;
        }
        
        targetObj[newName] = { type: 'string', value: '' };
        this.renderWorkflow();
    }
    
    private handleBlockDeleteKeyValue(data: any): void {
        const { blockId, itemName, portType } = data;
        const node = this.engine.getNode(blockId);
        if (!node) return;
        
        const config = node.data;
        const targetObj = portType === 'input' ? config.inputs : config.outputs;
        
        if (targetObj && targetObj[itemName]) {
            delete targetObj[itemName];
            this.renderWorkflow();
        }
    }
    
    private handleBlockRenameKeyValue(data: any): void {
        const { blockId, oldName, newName, portType } = data;
        const node = this.engine.getNode(blockId);
        if (!node || oldName === newName) return;
        
        const config = node.data;
        const targetObj = portType === 'input' ? config.inputs : config.outputs;
        
        if (targetObj && targetObj[oldName]) {
            targetObj[newName] = targetObj[oldName];
            delete targetObj[oldName];
            this.renderWorkflow();
        }
    }
    
    private handleBlockKeyValueChange(data: any): void {
        const { blockId, itemName, value, portType } = data;
        const node = this.engine.getNode(blockId);
        if (!node) return;
        
        const config = node.data;
        const targetObj = portType === 'input' ? config.inputs : config.outputs;
        
        if (targetObj && targetObj[itemName]) {
            targetObj[itemName].value = value;
        }
    }
    
    private handleBlockKeyValueTypeChange(data: any): void {
        const { blockId, itemName, type, portType } = data;
        const node = this.engine.getNode(blockId);
        if (!node) return;
        
        const config = node.data;
        const targetObj = portType === 'input' ? config.inputs : config.outputs;
        
        if (targetObj && targetObj[itemName]) {
            targetObj[itemName].type = type;
            this.renderWorkflow();
        }
    }
    
    private onToolChange(tool: 'pointer' | 'hand'): void {
        if (tool === 'hand') this.canvas.enablePanMode();
        else this.canvas.disablePanMode();
        }
    
    private async ensureSettingsModalLoaded() {}
}
