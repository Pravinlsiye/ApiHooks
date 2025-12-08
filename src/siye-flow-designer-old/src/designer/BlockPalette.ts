import { BLOCK_TEMPLATES, BlockTemplate } from './VisualModels';
import { ApiDefinition } from '../api/ApiDefinitionLoader';
import { AlertModal } from '../components/AlertModal';
import { BaseComponent } from '../utils/BaseComponent';
import { DOMUpdater } from '../utils/DOMUpdater';
import { DOMDiff } from '../utils/DOMDiff';
import { getIconSvg, IconType } from '../utils/Icons';

/**
 * Block palette for dragging blocks onto the canvas
 * Now extends BaseComponent for automatic cleanup and uses DOMDiff for efficient updates
 */
export class BlockPalette extends BaseComponent {
    private templates: BlockTemplate[] = BLOCK_TEMPLATES;
    private apiDefinitions: ApiDefinition[] = [];
    private alertModal?: AlertModal;
    
    constructor(containerId: string, alertModal?: AlertModal) {
        super(containerId);
        this.alertModal = alertModal;
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
     * Setup tab switching with automatic cleanup tracking
     */
    private setupTabHandlers(): void {
        const tabs = DOMUpdater.queryAll<HTMLElement>(this.container, '.palette-tab');
        
        tabs.forEach(tab => {
            this.addEventListener(tab, 'click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const tabName = target.getAttribute('data-tab');
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                target.classList.add('active');
                
                // Update active panel
                const panels = DOMUpdater.queryAll<HTMLElement>(this.container, '.tab-panel');
                panels.forEach(p => {
                    if (p.getAttribute('data-panel') === tabName) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
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
     * Render blocks tab using DOMUpdater
     */
    private renderBlocksTab(): void {
        const categoriesElement = DOMUpdater.query<HTMLElement>(this.container, '.block-categories');
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
        
        DOMUpdater.updateElement(categoriesElement, { html });
        this.setupDragHandlers();
    }
    
    
    /**
     * Render a regular block template
     */
    private renderBlockTemplate(block: BlockTemplate): string {
        // Get SVG icon (icon field now contains IconType identifier)
        const iconSvg = getIconSvg(block.icon as IconType);
        return `
            <div class="block-template" 
                 draggable="true" 
                 data-block-type="${block.type}"
                 style="border-color: ${block.color}">
                <span class="icon">${iconSvg}</span>
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
     * Render APIs tab using DOMUpdater
     */
    private renderApisTab(): void {
        const apisElement = DOMUpdater.query<HTMLElement>(this.container, '.api-definitions');
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
        
        DOMUpdater.updateElement(apisElement, { html });
        this.setupDragHandlers();
        this.setupApiHandlers();
    }
    
    /**
     * Setup API handlers with event delegation for automatic cleanup
     */
    private setupApiHandlers(): void {
        // Load API buttons - use event delegation
        const apisContainer = DOMUpdater.query<HTMLElement>(this.container, '.api-definitions');
        if (apisContainer) {
            this.addEventListener(apisContainer, 'click', (e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('btn-load-api') || target.closest('.btn-load-api')) {
                    const btn = target.classList.contains('btn-load-api') ? target : target.closest('.btn-load-api') as HTMLElement;
                    if (btn) {
                        this.promptLoadApi();
                    }
                } else if (target.classList.contains('btn-remove-api')) {
                    e.stopPropagation();
                    const apiId = target.getAttribute('data-api-id');
                    if (apiId && confirm(`Remove API definition "${this.apiDefinitions.find(a => a.id === apiId)?.name}"?`)) {
                        this.removeApiDefinition(apiId);
                    }
                }
            });
        }
        
        // Setup drag handlers for API endpoints
        const endpoints = DOMUpdater.queryAll<HTMLElement>(this.container, '.api-endpoint');
        endpoints.forEach(endpoint => {
            this.addEventListener(endpoint, 'dragstart', (e) => this.onEndpointDragStart(e as DragEvent));
            this.addEventListener(endpoint, 'dragend', (e) => this.onDragEnd(e as DragEvent));
        });
    }
    
    /**
     * Prompt user to load API (used by event delegation handler)
     */
    private promptLoadApi(): void {
        const url = prompt(
            'Enter Swagger/OpenAPI URL:',
            'https://petstore3.swagger.io/api/v3/openapi.json'
        );
        
        if (url) {
            this.emit('loadApiDefinition', { url });
        }
    }
    
    /**
     * Handle endpoint drag start
     */
    private onEndpointDragStart(e: DragEvent): void {
        const target = e.target as HTMLElement;
        const endpointElement = target.closest('.api-endpoint') as HTMLElement;
        
        if (endpointElement && e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', 'http-request');
            e.dataTransfer.setData('application/json', JSON.stringify({
                apiId: endpointElement.getAttribute('data-api-id'),
                endpointId: endpointElement.getAttribute('data-endpoint-id'),
                method: endpointElement.getAttribute('data-method'),
                path: endpointElement.getAttribute('data-path'),
                baseUrl: endpointElement.getAttribute('data-base-url')
            }));
            
            endpointElement.classList.add('dragging');
        }
    }
    
    /**
     * Setup drag handlers for blocks with automatic cleanup tracking
     */
    private setupDragHandlers(): void {
        const blocks = DOMUpdater.queryAll<HTMLElement>(this.container, '.block-template');
        
        blocks.forEach(block => {
            this.addEventListener(block, 'dragstart', (e) => this.onDragStart(e as DragEvent));
            this.addEventListener(block, 'dragend', (e) => this.onDragEnd(e as DragEvent));
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
     * Filter blocks by search term using DOMUpdater
     */
    public filterBlocks(searchTerm: string): void {
        const term = searchTerm.toLowerCase();
        const blocks = DOMUpdater.queryAll<HTMLElement>(this.container, '.block-template');
        
        blocks.forEach(block => {
            const name = DOMUpdater.query<HTMLElement>(block, '.name')?.textContent?.toLowerCase() || '';
            const description = DOMUpdater.query<HTMLElement>(block, '.description')?.textContent?.toLowerCase() || '';
            
            if (name.includes(term) || description.includes(term)) {
                block.style.display = 'flex';
            } else {
                block.style.display = 'none';
            }
        });
    }
    
    /**
     * Add a search input to the palette with debouncing
     */
    public addSearchInput(): void {
        const paletteContent = DOMUpdater.query<HTMLElement>(this.container, '.palette-content');
        if (!paletteContent) return;
        
        // Check if search already exists
        if (DOMUpdater.query<HTMLElement>(paletteContent, '.search-container')) {
            return;
        }
        
        const searchDiv = this.createElement('div', { className: 'search-container' });
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
        const title = DOMUpdater.query<HTMLElement>(paletteContent, 'h3');
        if (title && title.nextSibling) {
            paletteContent.insertBefore(searchDiv, title.nextSibling);
        } else if (title) {
            paletteContent.appendChild(searchDiv);
        }
        
        // Setup search handler with debouncing
        const searchInput = DOMUpdater.query<HTMLInputElement>(searchDiv, '.search-input');
        if (searchInput) {
            const debouncedSearch = DOMDiff.debounce((e: Event) => {
                const target = e.target as HTMLInputElement;
                this.filterBlocks(target.value);
            }, 300);
            
            this.addEventListener(searchInput, 'input', debouncedSearch as EventListener);
        }
        
        // Setup add API button
        const addApiBtn = DOMUpdater.query<HTMLButtonElement>(searchDiv, '.btn-add-api');
        if (addApiBtn) {
            this.addEventListener(addApiBtn, 'click', () => {
                this.emit('addApiDefinition', {});
            });
        }
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
            if (this.alertModal) {
                this.alertModal.show('This API is provided by the host application and cannot be removed.', 'Cannot Remove API', 'warning');
            } else {
                alert('This API is provided by the host application and cannot be removed.');
            }
            return false;
        }
        
        this.apiDefinitions = this.apiDefinitions.filter(a => a.id !== apiId);
        this.renderApisTab();
        return true;
    }
}
