import { BLOCK_TEMPLATES, BlockTemplate, SimpleEventEmitter } from './VisualModels';
import { ApiDefinition } from '../api/ApiDefinitionLoader';

/**
 * Block palette for dragging blocks onto the canvas
 */
export class BlockPalette extends SimpleEventEmitter {
    private container: HTMLElement;
    private templates: BlockTemplate[] = BLOCK_TEMPLATES;
    private apiDefinitions: ApiDefinition[] = [];
    
    constructor(containerId: string) {
        super();
        
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        this.container = element;
        this.setupPalette();
    }
    
    /**
     * Setup the block palette
     */
    private setupPalette(): void {
        this.container.innerHTML = `
            <div class="palette-content">
                <div class="palette-tabs">
                    <button class="palette-tab active" data-tab="blocks">📦 Blocks</button>
                    <button class="palette-tab" data-tab="apis">🌐 APIs</button>
                </div>
                <div class="palette-tab-content">
                    <div class="tab-panel active" data-panel="blocks">
                        <div class="block-categories"></div>
                    </div>
                    <div class="tab-panel" data-panel="apis">
                        <div class="api-definitions"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupTabHandlers();
        this.renderBlocks();
    }
    
    /**
     * Setup tab switching
     */
    private setupTabHandlers(): void {
        const tabs = this.container.querySelectorAll('.palette-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const tabName = target.getAttribute('data-tab');
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                target.classList.add('active');
                
                // Update active panel
                const panels = this.container.querySelectorAll('.tab-panel');
                panels.forEach(p => {
                    const panel = p as HTMLElement;
                    if (panel.getAttribute('data-panel') === tabName) {
                        panel.classList.add('active');
                    } else {
                        panel.classList.remove('active');
                    }
                });
            });
        });
    }
    
    /**
     * Render blocks and APIs in their respective tabs
     */
    private renderBlocks(): void {
        this.renderBlocksTab();
        this.renderApisTab();
    }
    
    /**
     * Render blocks tab
     */
    private renderBlocksTab(): void {
        const categoriesElement = this.container.querySelector('.block-categories');
        if (!categoriesElement) return;
        
        // Group blocks by category
        const categories = new Map<string, BlockTemplate[]>();
        this.templates.forEach(template => {
            if (!categories.has(template.category)) {
                categories.set(template.category, []);
            }
            categories.get(template.category)!.push(template);
        });
        
        // Render each category
        let html = '';
        categories.forEach((blocks, category) => {
            html += `
                <div class="category">
                    <h4 class="category-title">${category}</h4>
                    <div class="category-blocks">
            `;
            
            blocks.forEach(block => {
                html += this.renderBlockTemplate(block);
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        categoriesElement.innerHTML = html;
        this.setupDragHandlers();
    }
    
    /**
     * Render APIs tab
     */
    private renderApisTab(): void {
        const apisElement = this.container.querySelector('.api-definitions');
        if (!apisElement) return;
        
        let html = '';
        
        if (this.apiDefinitions.length === 0) {
            html = `
                <div class="empty-state">
                    <p style="color: #8b949e; text-align: center; padding: 40px 20px;">
                        No API definitions loaded<br>
                        <small>Load Swagger/OpenAPI to add HTTP endpoints</small>
                    </p>
                    <button class="btn-load-api">
                     Load API Definition
                    </button>
                </div>
            `;
        } else {
            this.apiDefinitions.forEach((api) => {
                const isLocked = (api as any).locked || false;
                
                // API header with remove button (or lock icon if locked)
                html += `
                    <div class="api-section ${isLocked ? 'locked' : ''}">
                        <div class="api-header">
                            <span class="api-name">
                                ${api.name}
                                ${isLocked ? '<span class="lock-icon" title="Host API (cannot be removed)">🔒</span>' : ''}
                            </span>
                            <span class="api-version">${api.version}</span>
                            ${!isLocked ? `<button class="btn-remove-api" data-api-id="${api.id}" title="Remove API">×</button>` : ''}
                        </div>
                        <div class="api-endpoints">
                `;
                
                // Render endpoints
                api.endpoints.forEach(endpoint => {
                    html += this.renderApiEndpoint(endpoint, api);
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            // Add button to load more APIs
            html += `
                <div class="add-more-apis">
                    <button class="btn-load-api">
                      Load Another API
                    </button>
                </div>
            `;
        }
        
        apisElement.innerHTML = html;
        this.setupDragHandlers();
        this.setupApiRemoveHandlers();
        this.setupLoadApiHandlers();
    }
    
    /**
     * Setup load API button handlers
     */
    private setupLoadApiHandlers(): void {
        const loadButtons = this.container.querySelectorAll('.btn-load-api');
        loadButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const url = prompt(
                    'Enter Swagger/OpenAPI URL:',
                    'https://petstore3.swagger.io/api/v3/openapi.json'
                );
                
                if (url) {
                    this.emit('loadApiDefinition', { url });
                }
            });
        });
    }
    
    /**
     * Render a regular block template
     */
    private renderBlockTemplate(block: BlockTemplate): string {
        return `
            <div class="block-template" 
                 draggable="true" 
                 data-block-type="${block.type}"
                 style="border-color: ${block.color}">
                <span class="icon">${block.icon}</span>
                <div class="block-info">
                    <span class="name">${block.name}</span>
                    <span class="description">${block.description}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Render an API endpoint as a draggable HTTP block
     */
    private renderApiEndpoint(endpoint: any, api: ApiDefinition): string {
        const methodColors: Record<string, string> = {
            'GET': '#2196F3',
            'POST': '#4CAF50',
            'PUT': '#FF9800',
            'DELETE': '#f44336',
            'PATCH': '#9C27B0'
        };
        
        const color = methodColors[endpoint.method] || '#666';
        
        return `
            <div class="block-template api-endpoint" 
                 draggable="true" 
                 data-block-type="http-request"
                 data-api-id="${api.id}"
                 data-endpoint-id="${endpoint.id}"
                 data-method="${endpoint.method}"
                 data-path="${endpoint.path}"
                 data-base-url="${api.baseUrl}"
                 style="border-color: ${color}">
                <span class="icon method-badge" style="background: ${color}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">
                    ${endpoint.method}
                </span>
                <div class="block-info">
                    <span class="name">${endpoint.name}</span>
                    <span class="description">${endpoint.path}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Setup remove API handlers
     */
    private setupApiRemoveHandlers(): void {
        const removeButtons = this.container.querySelectorAll('.btn-remove-api');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const apiId = (e.target as HTMLElement).getAttribute('data-api-id');
                if (apiId && confirm(`Remove API definition "${this.apiDefinitions.find(a => a.id === apiId)?.name}"?`)) {
                    this.removeApiDefinition(apiId);
                }
            });
        });
    }
    
    /**
     * Setup drag event handlers
     */
    private setupDragHandlers(): void {
        const blocks = this.container.querySelectorAll('.block-template');
        
        blocks.forEach(block => {
            block.addEventListener('dragstart', (e) => this.onDragStart(e as DragEvent));
            block.addEventListener('dragend', (e) => this.onDragEnd(e as DragEvent));
        });
    }
    
    /**
     * Handle drag start
     */
    private onDragStart(e: DragEvent): void {
        const target = e.target as HTMLElement;
        const blockType = target.closest('.block-template')?.getAttribute('data-block-type');
        
        if (blockType && e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', blockType);
            
            // Add dragging class
            target.classList.add('dragging');
            
            // Emit event
            this.emit('blockDragStart', blockType);
        }
    }
    
    /**
     * Handle drag end
     */
    private onDragEnd(e: DragEvent): void {
        const target = e.target as HTMLElement;
        target.classList.remove('dragging');
    }
    
    /**
     * Filter blocks by search term
     */
    public filterBlocks(searchTerm: string): void {
        const term = searchTerm.toLowerCase();
        const blocks = this.container.querySelectorAll('.block-template');
        
        blocks.forEach(block => {
            const element = block as HTMLElement;
            const name = element.querySelector('.name')?.textContent?.toLowerCase() || '';
            const description = element.querySelector('.description')?.textContent?.toLowerCase() || '';
            
            if (name.includes(term) || description.includes(term)) {
                element.style.display = 'flex';
            } else {
                element.style.display = 'none';
            }
        });
    }
    
    /**
     * Add a search input to the palette
     */
    public addSearchInput(): void {
        const paletteContent = this.container.querySelector('.palette-content');
        if (!paletteContent) return;
        
        const searchDiv = document.createElement('div');
        searchDiv.className = 'search-container';
        searchDiv.innerHTML = `
            <input type="text" class="search-input" placeholder="Search blocks...">
            <button class="btn-add-api" title="Add API Definition">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Add API
            </button>
        `;
        
        // Insert after the title
        const title = paletteContent.querySelector('h3');
        if (title && title.nextSibling) {
            paletteContent.insertBefore(searchDiv, title.nextSibling);
        }
        
        // Setup search handler
        const searchInput = searchDiv.querySelector('.search-input') as HTMLInputElement;
        searchInput.addEventListener('input', (e) => {
            this.filterBlocks((e.target as HTMLInputElement).value);
        });
        
        // Setup add API button
        const addApiBtn = searchDiv.querySelector('.btn-add-api') as HTMLButtonElement;
        addApiBtn.addEventListener('click', () => {
            this.emit('addApiDefinition');
        });
    }
    
    /**
     * Add API definition endpoints to palette
     * @param api The API definition to add
     * @param locked If true, API cannot be removed (for host APIs in embedded mode)
     */
    public addApiDefinition(api: ApiDefinition, locked: boolean = false): void {
        // Mark API as locked if specified
        (api as any).locked = locked;
        this.apiDefinitions.push(api);
        this.renderApisTab();
    }
    
    /**
     * Remove API definition (only if not locked)
     */
    public removeApiDefinition(apiId: string): boolean {
        const api = this.apiDefinitions.find(a => a.id === apiId);
        if (!api) return false;
        
        // Check if locked
        if ((api as any).locked) {
            alert('This API is provided by the host application and cannot be removed.');
            return false;
        }
        
        this.apiDefinitions = this.apiDefinitions.filter(a => a.id !== apiId);
        this.renderApisTab();
        return true;
    }
}
