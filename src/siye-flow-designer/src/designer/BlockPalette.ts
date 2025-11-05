import { BLOCK_TEMPLATES, BlockTemplate, SimpleEventEmitter } from './VisualModels';

/**
 * Block palette for dragging blocks onto the canvas
 */
export class BlockPalette extends SimpleEventEmitter {
    private container: HTMLElement;
    private templates: BlockTemplate[] = BLOCK_TEMPLATES;
    
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
                <h3>Blocks</h3>
                <div class="block-categories"></div>
            </div>
        `;
        
        this.renderBlocks();
    }
    
    /**
     * Render block templates grouped by category
     */
    private renderBlocks(): void {
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
                html += `
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
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        categoriesElement.innerHTML = html;
        
        // Setup drag handlers
        this.setupDragHandlers();
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
    }
}
