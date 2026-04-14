/**
 * Block Palette Component
 * Side panel with draggable block types and API definitions
 */

import { BaseComponent } from '../utils/base-component';
import { BlockType } from '../../models/workflow-models';
import { getBlockIcon } from '../utils/icons';
import { ApiDefinitionManager, apiManager } from '../../api/api-definition-manager';
import { ApiDefinition, ApiEndpoint } from '../../api/api-definition-loader';
import { DOMDiff } from '../utils/dom-diff';
import { DOMUpdater } from '../utils/dom-updater';

interface BlockTemplate {
    type: BlockType;
    name: string;
    category: string;
    description: string;
}

const BLOCK_TEMPLATES: BlockTemplate[] = [
    // Core
    { type: BlockType.Start, name: 'Start', category: 'Core', description: 'Entry point' },
    { type: BlockType.End, name: 'End', category: 'Core', description: 'Exit point' },
    { type: BlockType.Variable, name: 'Variable', category: 'Core', description: 'Set/get variables' },
    { type: BlockType.Log, name: 'Log', category: 'Core', description: 'Log messages' },
    { type: BlockType.Evaluate, name: 'Evaluate', category: 'Core', description: 'Evaluate expressions' },

    // Connectivity
    { type: BlockType.HttpRequest, name: 'HTTP Request', category: 'Connectivity', description: 'Make API calls' },

    // Logic
    { type: BlockType.Condition, name: 'Condition', category: 'Logic', description: 'If/else branching' },
    { type: BlockType.Switch, name: 'Switch', category: 'Logic', description: 'Multiple branches' },
    { type: BlockType.Loop, name: 'Loop', category: 'Logic', description: 'Iterate items' },
    { type: BlockType.Delay, name: 'Delay', category: 'Logic', description: 'Wait duration' },
    { type: BlockType.BatchProcess, name: 'Batch', category: 'Logic', description: 'Parallel processing' },
    { type: BlockType.SubWorkflow, name: 'Sub Workflow', category: 'Logic', description: 'Call workflow' },
];

export class BlockPalette extends BaseComponent {
    private searchInput: HTMLInputElement | null = null;
    private apiManager: ApiDefinitionManager;
    private draggedBlockType: BlockType | null = null;
    private draggedEndpoint: ApiEndpoint | null = null;

    constructor(containerId: string, customApiManager?: ApiDefinitionManager) {
        super(containerId);
        this.apiManager = customApiManager || apiManager;
        
        // Subscribe to API changes
        this.apiManager.onChange(() => this.refreshApiPanel());
        
        this.render();
        this.setupEventHandlers();
        
        // Load saved APIs from storage
        this.apiManager.loadFromStorage();
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="palette-tabs">
                <button class="palette-tab active" data-tab="blocks">Blocks</button>
                <button class="palette-tab" data-tab="api">API</button>
            </div>
            <div class="palette-search">
                <input type="text" placeholder="Search blocks..." class="search-input" />
            </div>
            <div class="palette-content">
                <div class="tab-panel active" data-panel="blocks">
                    ${this.renderBlocksList()}
                </div>
                <div class="tab-panel" data-panel="api">
                    ${this.renderApiPanel()}
                </div>
            </div>
        `;

        this.searchInput = DOMUpdater.query<HTMLInputElement>(this.container, '.search-input');
    }

    private renderBlocksList(filter: string = ''): string {
        const categories = this.groupByCategory(filter);
        
        return Object.entries(categories).map(([category, blocks]) => `
            <div class="palette-category">
                <div class="category-title">${category}</div>
                <div class="category-blocks">
                    ${blocks.map(block => this.renderBlockTemplate(block)).join('')}
                </div>
            </div>
        `).join('');
    }

    private groupByCategory(filter: string): Record<string, BlockTemplate[]> {
        const filtered = filter 
            ? BLOCK_TEMPLATES.filter(b => 
                b.name.toLowerCase().includes(filter.toLowerCase()) ||
                b.description.toLowerCase().includes(filter.toLowerCase()))
            : BLOCK_TEMPLATES;

        return filtered.reduce((acc, block) => {
            if (!acc[block.category]) {
                acc[block.category] = [];
            }
            acc[block.category].push(block);
            return acc;
        }, {} as Record<string, BlockTemplate[]>);
    }

    private renderBlockTemplate(block: BlockTemplate): string {
        const iconSvg = getBlockIcon(block.type);
        return `
            <div class="block-template" 
                 data-block-type="${block.type}" 
                 draggable="true"
                 title="${block.description}">
                <div class="block-template-icon">${iconSvg}</div>
                <div class="block-template-info">
                    <div class="block-template-name">${block.name}</div>
                    <div class="block-template-desc">${block.description}</div>
                </div>
            </div>
        `;
    }

    private renderApiPanel(): string {
        const apis = this.apiManager.getAll();
        return `
            <div class="api-section">
                <div class="api-load">
                    <input type="text" placeholder="Swagger/OpenAPI URL..." class="api-url-input" />
                    <button class="btn-load-api">Load</button>
                    <label class="btn-load-file" title="Load from file">
                        <input type="file" accept=".json,.yaml,.yml" class="api-file-input" hidden />
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                    </label>
                </div>
                <div class="api-list">
                    ${apis.length === 0 
                        ? '<div class="api-empty">No APIs loaded. Enter a Swagger URL or load a file.</div>'
                        : apis.map(api => this.renderApiDefinition(api)).join('')
                    }
                </div>
            </div>
        `;
    }

    private renderApiDefinition(api: ApiDefinition): string {
        const removeBtn = api.locked ? '' : '<button class="btn-remove-api" title="Remove API">×</button>';
        return `
            <div class="api-definition" data-api-id="${api.id}" data-api-name="${api.name}">
                <div class="api-header">
                    <span class="api-name">${api.name}</span>
                    <span class="api-version">${api.version || ''}</span>
                    ${removeBtn}
                </div>
                <div class="api-endpoints">
                    ${api.endpoints.map(endpoint => this.renderApiEndpoint(endpoint, api)).join('')}
                </div>
            </div>
        `;
    }

    private renderApiEndpoint(endpoint: ApiEndpoint, api: ApiDefinition): string {
        const methodColors: Record<string, string> = {
            'GET': '#22c55e',
            'POST': '#3b82f6',
            'PUT': '#f59e0b',
            'DELETE': '#ef4444',
            'PATCH': '#8b5cf6'
        };
        const color = methodColors[endpoint.method.toUpperCase()] || '#666';
        
        // Include API info in the endpoint data for drag
        const endpointData = {
            ...endpoint,
            apiId: api.id,
            apiName: api.name,
            baseUrl: api.baseUrl
        };

        return `
            <div class="api-endpoint" draggable="true" data-endpoint='${JSON.stringify(endpointData)}'>
                <span class="endpoint-method" style="background: ${color}">${endpoint.method}</span>
                <span class="endpoint-path" title="${endpoint.summary || endpoint.path}">${endpoint.path}</span>
            </div>
        `;
    }

    private setupEventHandlers(): void {
        // Tab switching
        DOMUpdater.queryAll<HTMLElement>(this.container, '.palette-tab').forEach(tab => {
            this.addEventListener(tab, 'click', () => {
                const tabName = tab.dataset.tab as 'blocks' | 'api';
                this.switchTab(tabName);
            });
        });

        // Search input with debounce for better performance
        if (this.searchInput) {
            const debouncedFilter = DOMDiff.debounce((query: string) => {
                this.filterBlocks(query);
            }, 150);
            
            this.addEventListener(this.searchInput, 'input', (e) => {
                const target = e.target as HTMLInputElement;
                debouncedFilter(target.value);
            });
        }

        // Block template drag
        this.setupDragHandlers();

        // Load API button
        const loadApiBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '.btn-load-api');
        if (loadApiBtn) {
            this.addEventListener(loadApiBtn, 'click', () => {
                const urlInput = DOMUpdater.query<HTMLInputElement>(this.container, '.api-url-input');
                if (urlInput?.value) {
                    this.loadApiFromUrl(urlInput.value);
                }
            });
        }
        
        // Load API from file
        const fileInput = DOMUpdater.query<HTMLInputElement>(this.container, '.api-file-input');
        if (fileInput) {
            this.addEventListener(fileInput, 'change', (e) => {
                const input = e.target as HTMLInputElement;
                const file = input.files?.[0];
                if (file) {
                    this.loadApiFromFile(file);
                    input.value = ''; // Reset for re-upload
                }
            });
        }
    }

    private setupDragHandlers(): void {
        DOMUpdater.queryAll<HTMLElement>(this.container, '.block-template').forEach(template => {
            this.addEventListener(template, 'dragstart', (e) => {
                const blockType = template.dataset.blockType as BlockType;
                this.draggedBlockType = blockType;
                
                // Set drag data
                (e as DragEvent).dataTransfer?.setData('text/plain', blockType);
                (e as DragEvent).dataTransfer!.effectAllowed = 'copy';
                
                DOMUpdater.addClasses(template, 'dragging');
                this.emit('blockDragStart', { type: blockType });
            });

            this.addEventListener(template, 'dragend', () => {
                DOMUpdater.removeClasses(template, 'dragging');
                this.draggedBlockType = null;
                this.emit('blockDragEnd', {});
            });
        });
    }

    private switchTab(tabName: 'blocks' | 'api'): void {
        // Update tab buttons
        DOMUpdater.queryAll<HTMLElement>(this.container, '.palette-tab').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                DOMUpdater.addClasses(tab, 'active');
            } else {
                DOMUpdater.removeClasses(tab, 'active');
            }
        });

        // Update panels
        DOMUpdater.queryAll<HTMLElement>(this.container, '.tab-panel').forEach(panel => {
            if (panel.dataset.panel === tabName) {
                DOMUpdater.addClasses(panel, 'active');
            } else {
                DOMUpdater.removeClasses(panel, 'active');
            }
        });
    }

    private filterBlocks(query: string): void {
        const blocksPanel = DOMUpdater.query<HTMLElement>(this.container, '[data-panel="blocks"]');
        if (blocksPanel) {
            DOMUpdater.updateElement(blocksPanel, { html: this.renderBlocksList(query) });
            this.setupDragHandlers(); // Re-attach drag handlers
        }
    }

    private async loadApiFromUrl(url: string): Promise<void> {
        try {
            this.emit('loadingApi', { url });
            
            const api = await this.apiManager.loadFromUrl(url);
            this.emit('apiLoaded', { api });
            
            // Clear input
            const urlInput = DOMUpdater.query<HTMLInputElement>(this.container, '.api-url-input');
            if (urlInput) urlInput.value = '';
        } catch (error) {
            console.error('Failed to load API:', error);
            this.emit('apiLoadError', { url, error: String(error) });
        }
    }
    
    private async loadApiFromFile(file: File): Promise<void> {
        try {
            this.emit('loadingApi', { file: file.name });
            
            const api = await this.apiManager.loadFromFile(file);
            this.emit('apiLoaded', { api });
        } catch (error) {
            console.error('Failed to load API from file:', error);
            this.emit('apiLoadError', { file: file.name, error: String(error) });
        }
    }

    private refreshApiPanel(): void {
        const apiPanel = DOMUpdater.query<HTMLElement>(this.container, '[data-panel="api"] .api-list');
        if (apiPanel) {
            const apis = this.apiManager.getAll();
            DOMUpdater.updateElement(apiPanel, {
                html: apis.length === 0 
                    ? '<div class="api-empty">No APIs loaded. Enter a Swagger URL or load a file.</div>'
                    : apis.map(api => this.renderApiDefinition(api)).join('')
            });
            
            // Setup endpoint drag handlers
            this.setupApiEndpointDragHandlers();
            
            // Setup remove buttons
            this.setupRemoveApiHandlers();
        }
    }

    private setupApiEndpointDragHandlers(): void {
        DOMUpdater.queryAll<HTMLElement>(this.container, '.api-endpoint').forEach(endpoint => {
            this.addEventListener(endpoint, 'dragstart', (e) => {
                const endpointData = endpoint.dataset.endpoint;
                const parsedEndpoint = JSON.parse(endpointData || '{}');
                
                this.draggedEndpoint = parsedEndpoint;
                
                (e as DragEvent).dataTransfer?.setData('application/json', endpointData || '');
                (e as DragEvent).dataTransfer?.setData('text/plain', BlockType.HttpRequest);
                (e as DragEvent).dataTransfer!.effectAllowed = 'copy';
                
                DOMUpdater.addClasses(endpoint, 'dragging');
                this.emit('apiEndpointDragStart', { endpoint: parsedEndpoint });
            });

            this.addEventListener(endpoint, 'dragend', () => {
                DOMUpdater.removeClasses(endpoint, 'dragging');
                this.draggedEndpoint = null;
                this.emit('apiEndpointDragEnd', {});
            });
        });
    }

    private setupRemoveApiHandlers(): void {
        DOMUpdater.queryAll<HTMLButtonElement>(this.container, '.btn-remove-api').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const apiDef = (e.currentTarget as HTMLElement).closest('.api-definition');
                const apiId = (apiDef as HTMLElement)?.dataset.apiId;
                if (apiId) {
                    this.apiManager.remove(apiId);
                    this.emit('apiRemoved', { apiId });
                }
            });
        });
    }

    /**
     * Get currently dragged block type
     */
    getDraggedBlockType(): BlockType | null {
        return this.draggedBlockType;
    }
    
    /**
     * Get currently dragged API endpoint
     */
    getDraggedEndpoint(): ApiEndpoint | null {
        return this.draggedEndpoint;
    }

    /**
     * Add an API definition programmatically
     */
    addApiDefinition(json: any, name?: string): ApiDefinition {
        return this.apiManager.loadFromJson(json, name);
    }
    
    /**
     * Get API manager instance
     */
    getApiManager(): ApiDefinitionManager {
        return this.apiManager;
    }
}

