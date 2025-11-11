import { VisualBlock } from '../designer/VisualModels';
import { BaseComponent } from '../utils/BaseComponent';
import { DOMUpdater } from '../utils/DOMUpdater';
import { DOMDiff } from '../utils/DOMDiff';

/**
 * Minimap component that shows a scaled-down overview of the canvas
 * Now extends BaseComponent for automatic cleanup and uses DOMDiff for efficient updates
 */
export class Minimap extends BaseComponent {
    private canvasContainer: HTMLElement;
    private canvasWrapper: HTMLElement;
    private minimapElement!: HTMLElement;
    private viewportIndicator!: HTMLElement;
    private blocksContainer!: HTMLElement;
    
    private blocks: Map<string, VisualBlock> = new Map();
    private isDragging: boolean = false;
    
    private getZoomLevel: (() => number) | null = null;
    
    // Dynamic viewBox bounds (calculated from blocks + viewport)
    private viewBoxX: number = 0;
    private viewBoxY: number = 0;
    private viewBoxWidth: number = 200;
    private viewBoxHeight: number = 200;
    private readonly PADDING = 1000; // Padding around blocks and viewport
    
    // Observers for cleanup
    private zoomObserver: MutationObserver | null = null;
    private styleObserver: MutationObserver | null = null;
    
    // Throttled scroll handler
    private throttledScrollHandler: (() => void) | null = null;
    
    constructor(containerId: string, canvasContainerId: string, getZoomLevel?: () => number) {
        super(containerId);
        
        const canvasElement = DOMUpdater.query<HTMLElement>(document, `#${canvasContainerId}`, true);
        if (!canvasElement) {
            throw new Error(`Canvas container element '${canvasContainerId}' not found`);
        }
        this.canvasContainer = canvasElement;
        const wrapper = DOMUpdater.query<HTMLElement>(canvasElement, '.canvas-wrapper', true);
        if (!wrapper) {
            throw new Error('Canvas wrapper not found');
        }
        this.canvasWrapper = wrapper;
        this.getZoomLevel = getZoomLevel || null;
        
        this.setupMinimap();
        this.setupEventListeners();
        this.updatePosition();
        this.setupZoomObserver();
        
        // Initialize viewport indicator on first render
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            this.updateViewport();
        });
        
        // Update position on window resize - throttle for performance
        this.throttledScrollHandler = DOMDiff.throttle(() => this.updatePosition(), 100);
        this.addEventListener(window, 'resize', this.throttledScrollHandler as EventListener);
    }
    
    /**
     * Update minimap position to be relative to canvas-container viewport
     */
    private updatePosition(): void {
        const canvasRect = this.canvasContainer.getBoundingClientRect();
        // Position relative to canvas-container's viewport (not the entire window)
        const right = window.innerWidth - canvasRect.right + 20; // 20px from right edge of canvas
        const bottom = window.innerHeight - canvasRect.bottom + 20; // 20px from bottom edge of canvas
        
        this.container.style.position = 'fixed';
        this.container.style.right = `${right}px`;
        this.container.style.bottom = `${bottom}px`;
    }
    
    /**
     * Setup the minimap HTML structure
     */
    private setupMinimap(): void {
        this.container.innerHTML = `
            <div class="minimap">
                <div class="minimap-border-dots">
                    <div class="minimap-dot minimap-dot-top" style="left: 8px;"></div>
                    <div class="minimap-dot minimap-dot-top" style="left: calc(25% - 2px);"></div>
                    <div class="minimap-dot minimap-dot-top" style="left: calc(75% - 2px);"></div>
                    <div class="minimap-dot minimap-dot-top" style="right: 8px;"></div>
                    <div class="minimap-dot minimap-dot-right" style="top: 8px;"></div>
                    <div class="minimap-dot minimap-dot-right" style="top: calc(25% - 2px);"></div>
                    <div class="minimap-dot minimap-dot-right" style="top: calc(75% - 2px);"></div>
                    <div class="minimap-dot minimap-dot-right" style="bottom: 8px;"></div>
                    <div class="minimap-dot minimap-dot-bottom" style="left: 8px;"></div>
                    <div class="minimap-dot minimap-dot-bottom" style="left: calc(25% - 2px);"></div>
                    <div class="minimap-dot minimap-dot-bottom" style="left: calc(75% - 2px);"></div>
                    <div class="minimap-dot minimap-dot-bottom" style="right: 8px;"></div>
                    <div class="minimap-dot minimap-dot-left" style="top: 8px;"></div>
                    <div class="minimap-dot minimap-dot-left" style="top: calc(25% - 2px);"></div>
                    <div class="minimap-dot minimap-dot-left" style="top: calc(75% - 2px);"></div>
                    <div class="minimap-dot minimap-dot-left" style="bottom: 8px;"></div>
                </div>
                <div class="minimap-content">
                    <svg class="minimap-svg" viewBox="0 0 200 200" preserveAspectRatio="none">
                        <g class="minimap-blocks"></g>
                        <rect class="minimap-viewport" x="0" y="0" width="0" height="0" fill="rgba(255, 255, 255, 0.2)" stroke="rgba(255, 255, 255, 0.5)" stroke-width="0.5"/>
                    </svg>
                </div>
            </div>
        `;
        
        this.minimapElement = DOMUpdater.query<HTMLElement>(this.container, '.minimap', true)!;
        this.blocksContainer = DOMUpdater.query<HTMLElement>(this.minimapElement, '.minimap-blocks', true)!;
        this.viewportIndicator = DOMUpdater.query<HTMLElement>(this.minimapElement, '.minimap-viewport', true)!;
    }
    
    /**
     * Setup event listeners for scroll tracking and interaction with automatic cleanup tracking
     */
    private setupEventListeners(): void {
        // Throttle scroll events for better performance
        const throttledUpdateViewport = DOMDiff.throttle(() => {
            this.updateViewport();
            this.updatePosition();
        }, 16); // ~60fps
        
        // Update viewport indicator on scroll
        this.addEventListener(this.canvasContainer, 'scroll', throttledUpdateViewport);
        
        // Handle minimap clicks/drags for panning
        this.addEventListener(this.minimapElement, 'mousedown', (e) => this.onMinimapMouseDown(e as MouseEvent));
        this.addEventListener(document, 'mousemove', (e) => this.onMinimapMouseMove(e as MouseEvent));
        this.addEventListener(document, 'mouseup', () => this.onMinimapMouseUp());
    }
    
    /**
     * Setup observer to watch for zoom changes (transform changes on canvas-wrapper)
     * Registers cleanup for observers
     */
    private setupZoomObserver(): void {
        if (!this.canvasWrapper) return;
        
        // Watch for transform/style changes on canvas-wrapper (zoom changes)
        this.zoomObserver = new MutationObserver(() => {
            this.updateViewport();
        });
        
        this.zoomObserver.observe(this.canvasWrapper, {
            attributes: true,
            attributeFilter: ['style', 'transform']
        });
        
        // Register cleanup
        this.registerCleanup(() => {
            if (this.zoomObserver) {
                this.zoomObserver.disconnect();
            }
        });
        
        // Also watch for transform changes via CSS (if applied differently)
        if (this.canvasWrapper.parentElement) {
            this.styleObserver = new MutationObserver(() => {
                this.updateViewport();
            });
            
            this.styleObserver.observe(this.canvasWrapper.parentElement, {
                attributes: true,
                attributeFilter: ['style']
            });
            
            // Register cleanup
            this.registerCleanup(() => {
                if (this.styleObserver) {
                    this.styleObserver.disconnect();
                }
            });
        }
    }
    
    /**
     * Update the blocks shown in the minimap
     */
    public updateBlocks(blocks: Map<string, VisualBlock>): void {
        this.blocks = blocks;
        // Render blocks (which will update viewBox internally)
        this.renderBlocks();
        // Also update viewport indicator
        this.updateViewport();
    }
    
    /**
     * Render blocks in the minimap
     */
    private renderBlocks(): void {
        if (!this.blocksContainer) return;
        
        // Update viewBox before rendering to ensure correct scaling
        this.updateViewBox();
        
        // For SVG elements, we need to manually track and update since they're not HTMLElement
        // Get existing block elements
        const existingBlocks = new Map<string, SVGRectElement>();
        Array.from(this.blocksContainer.children).forEach(child => {
            const blockId = child.getAttribute('data-block-id');
            if (blockId) {
                existingBlocks.set(blockId, child as SVGRectElement);
            }
        });
        
        // Remove blocks that no longer exist
        existingBlocks.forEach((element, blockId) => {
            if (!this.blocks.has(blockId)) {
                element.remove();
            }
        });
        
        // Add or update blocks
        this.blocks.forEach((block) => {
            let rect = existingBlocks.get(block.id);
            const x = block.position.x;
            const y = block.position.y;
            const width = Math.max(block.width || 250, 10);
            const height = Math.max(block.height || 100, 10);
            
            if (!rect) {
                // Create new rect
                rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('data-block-id', block.id);
                this.blocksContainer.appendChild(rect);
            }
            
            // Update attributes (coordinates are in canvas space, viewBox handles scaling)
            rect.setAttribute('x', x.toString());
            rect.setAttribute('y', y.toString());
            rect.setAttribute('width', width.toString());
            rect.setAttribute('height', height.toString());
            rect.setAttribute('rx', '2');
            rect.setAttribute('fill', block.selected ? 'rgba(35, 134, 54, 0.5)' : 'rgba(100, 100, 100, 0.3)');
            rect.setAttribute('stroke', block.selected ? 'rgba(35, 134, 54, 0.7)' : 'rgba(150, 150, 150, 0.4)');
            rect.setAttribute('stroke-width', '1');
        });
    }
    
    /**
     * Calculate the bounding box that includes all blocks + viewport + padding
     * Returns { x, y, width, height } in canvas coordinates
     * @param includeViewport If true, includes viewport in bounds; if false, only blocks
     */
    private calculateBoundingBox(includeViewport: boolean = true): { x: number; y: number; width: number; height: number } {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        // Include all blocks
        if (this.blocks.size > 0) {
            this.blocks.forEach((block) => {
                const blockX = block.position.x;
                const blockY = block.position.y;
                const blockWidth = Math.max(block.width, 10);
                const blockHeight = Math.max(block.height, 10);
                
                minX = Math.min(minX, blockX);
                minY = Math.min(minY, blockY);
                maxX = Math.max(maxX, blockX + blockWidth);
                maxY = Math.max(maxY, blockY + blockHeight);
            });
        }
        
        // Include viewport indicator if requested
        if (includeViewport && this.viewportIndicator && this.canvasContainer) {
            const zoomLevel = this.getZoomLevel ? this.getZoomLevel() : 1.0;
            const scrollLeft = this.canvasContainer.scrollLeft;
            const scrollTop = this.canvasContainer.scrollTop;
            const containerRect = this.canvasContainer.getBoundingClientRect();
            const visibleWidth = containerRect.width / zoomLevel;
            const visibleHeight = containerRect.height / zoomLevel;
            
            const viewportX = scrollLeft;
            const viewportY = scrollTop;
            const viewportRight = scrollLeft + visibleWidth;
            const viewportBottom = scrollTop + visibleHeight;
            
            if (this.blocks.size === 0) {
                // If no blocks, use viewport as the base
                minX = viewportX;
                minY = viewportY;
                maxX = viewportRight;
                maxY = viewportBottom;
            } else {
                // Expand bounds to include viewport
                minX = Math.min(minX, viewportX);
                minY = Math.min(minY, viewportY);
                maxX = Math.max(maxX, viewportRight);
                maxY = Math.max(maxY, viewportBottom);
            }
        }
        
        // If no blocks and no viewport, use default center
        if (minX === Infinity) {
            const DEFAULT_VIEW_X = 50000;
            const DEFAULT_VIEW_Y = 50000;
            minX = DEFAULT_VIEW_X - 1000;
            minY = DEFAULT_VIEW_Y - 1000;
            maxX = DEFAULT_VIEW_X + 1000;
            maxY = DEFAULT_VIEW_Y + 1000;
        }
        
        // Add padding
        minX -= this.PADDING;
        minY -= this.PADDING;
        maxX += this.PADDING;
        maxY += this.PADDING;
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    
    /**
     * Update the viewBox to fit all blocks + viewport + padding
     */
    private updateViewBox(): void {
        const svg = this.minimapElement.querySelector('.minimap-svg') as SVGSVGElement;
        if (!svg) return;
        
        const bounds = this.calculateBoundingBox(true); // Include viewport
        this.viewBoxX = bounds.x;
        this.viewBoxY = bounds.y;
        this.viewBoxWidth = bounds.width;
        this.viewBoxHeight = bounds.height;
        
        svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    }
    
    /**
     * Force update of the viewport indicator (useful after zoom changes)
     */
    public updateViewportIndicator(): void {
        this.updateViewport();
    }
    
    /**
     * Update the viewport indicator
     * Also updates viewBox if viewport moves outside current bounds
     * Shrinks viewBox when viewport comes back to blocks-only area
     */
    private updateViewport(): void {
        if (!this.viewportIndicator || !this.canvasContainer) return;
        
        // Get zoom level (default to 1.0 if not provided)
        const zoomLevel = this.getZoomLevel ? this.getZoomLevel() : 1.0;
        
        // Calculate visible area
        const scrollLeft = this.canvasContainer.scrollLeft;
        const scrollTop = this.canvasContainer.scrollTop;
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const visibleWidth = containerRect.width;
        const visibleHeight = containerRect.height;
        
        // When zoomed in, the viewport shows less of the canvas
        // So we need to divide by zoom level to get the actual canvas area visible
        const canvasVisibleWidth = visibleWidth / zoomLevel;
        const canvasVisibleHeight = visibleHeight / zoomLevel;
        
        // Update viewport indicator (coordinates are in canvas space)
        this.viewportIndicator.setAttribute('x', scrollLeft.toString());
        this.viewportIndicator.setAttribute('y', scrollTop.toString());
        this.viewportIndicator.setAttribute('width', canvasVisibleWidth.toString());
        this.viewportIndicator.setAttribute('height', canvasVisibleHeight.toString());
        
        // Calculate bounds for blocks only (without viewport)
        const blocksOnlyBounds = this.calculateBoundingBox(false);
        
        // Check if viewport is within blocks-only bounds (with some margin)
        const margin = this.PADDING * 0.5;
        const viewportRight = scrollLeft + canvasVisibleWidth;
        const viewportBottom = scrollTop + canvasVisibleHeight;
        
        const viewportInBlocksBounds = 
            scrollLeft >= blocksOnlyBounds.x + margin &&
            scrollTop >= blocksOnlyBounds.y + margin &&
            viewportRight <= blocksOnlyBounds.x + blocksOnlyBounds.width - margin &&
            viewportBottom <= blocksOnlyBounds.y + blocksOnlyBounds.height - margin;
        
        // Check if viewport is outside current viewBox bounds (with some margin)
        const viewportOutsideCurrentBounds = 
            scrollLeft < this.viewBoxX + margin ||
            scrollTop < this.viewBoxY + margin ||
            viewportRight > this.viewBoxX + this.viewBoxWidth - margin ||
            viewportBottom > this.viewBoxY + this.viewBoxHeight - margin;
        
        // If viewport is back within blocks-only bounds, shrink to blocks-only
        if (viewportInBlocksBounds && this.blocks.size > 0) {
            const currentBounds = this.calculateBoundingBox(true);
            // Only shrink if current bounds are significantly larger than blocks-only bounds
            const currentArea = currentBounds.width * currentBounds.height;
            const blocksArea = blocksOnlyBounds.width * blocksOnlyBounds.height;
            // Shrink if current area is more than 20% larger than blocks-only area
            if (currentArea > blocksArea * 1.2) {
                this.viewBoxX = blocksOnlyBounds.x;
                this.viewBoxY = blocksOnlyBounds.y;
                this.viewBoxWidth = blocksOnlyBounds.width;
                this.viewBoxHeight = blocksOnlyBounds.height;
                
                const svg = this.minimapElement.querySelector('.minimap-svg') as SVGSVGElement;
                if (svg) {
                    svg.setAttribute('viewBox', `${blocksOnlyBounds.x} ${blocksOnlyBounds.y} ${blocksOnlyBounds.width} ${blocksOnlyBounds.height}`);
                }
            }
        }
        // If viewport moved outside current bounds, expand to include it
        else if (viewportOutsideCurrentBounds) {
            // Recalculate viewBox to include viewport
            this.updateViewBox();
        }
    }
    
    /**
     * Handle minimap mouse down for panning
     */
    private onMinimapMouseDown(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        
        // Ignore clicks on block rectangles (they're children of minimap-blocks group)
        if (target.tagName === 'rect' && target.hasAttribute('data-block-id')) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        if (target.classList.contains('minimap-viewport')) {
            // Dragging viewport
            this.isDragging = true;
        } else if (target.classList.contains('minimap') || target.classList.contains('minimap-content') || target.classList.contains('minimap-svg')) {
            // Clicking on minimap background - jump to that position
            this.jumpToPosition(e);
        }
    }
    
    /**
     * Handle minimap mouse move
     */
    private onMinimapMouseMove(e: MouseEvent): void {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.jumpToPosition(e);
    }
    
    /**
     * Handle minimap mouse up
     */
    private onMinimapMouseUp(): void {
        this.isDragging = false;
    }
    
    /**
     * Jump canvas to clicked position in minimap
     */
    private jumpToPosition(e: MouseEvent): void {
        const svg = this.minimapElement.querySelector('.minimap-svg') as SVGSVGElement;
        if (!svg) return;
        
        const contentElement = this.minimapElement.querySelector('.minimap-content') as HTMLElement;
        if (!contentElement) return;
        const contentRect = contentElement.getBoundingClientRect();
        
        // Get mouse position relative to SVG content area
        const mouseX = e.clientX - contentRect.left;
        const mouseY = e.clientY - contentRect.top;
        
        // Convert to SVG coordinates using current viewBox
        const viewBox = svg.viewBox.baseVal;
        const svgX = this.viewBoxX + (mouseX / contentRect.width) * viewBox.width;
        const svgY = this.viewBoxY + (mouseY / contentRect.height) * viewBox.height;
        
        // Center viewport on clicked position
        const containerRect = this.canvasContainer.getBoundingClientRect();
        this.canvasContainer.scrollLeft = svgX - (containerRect.width / 2);
        this.canvasContainer.scrollTop = svgY - (containerRect.height / 2);
    }
    
    /**
     * Set canvas dimensions
     * Canvas is now infinite - this method is kept for compatibility but does nothing
     */
    public setCanvasSize(_width: number, _height: number): void {
        // Canvas is infinite - no need to update size
        // Just update canvas wrapper reference in case it was recreated
        const newWrapper = DOMUpdater.query<HTMLElement>(this.canvasContainer, '.canvas-wrapper');
        if (newWrapper && newWrapper !== this.canvasWrapper) {
            // Disconnect old observers
            if (this.zoomObserver) {
                this.zoomObserver.disconnect();
            }
            if (this.styleObserver) {
                this.styleObserver.disconnect();
            }
            
            // Update reference
            this.canvasWrapper = newWrapper;
            
            // Reconnect observers to new wrapper
            this.setupZoomObserver();
        }
        
        // Re-render blocks to update minimap view
        this.renderBlocks();
    }
    
    /**
     * Show the minimap
     */
    public show(): void {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }
    
    /**
     * Hide the minimap
     */
    public hide(): void {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
    
    /**
     * Check if minimap is visible
     */
    public isVisible(): boolean {
        return this.container ? this.container.style.display !== 'none' : true;
    }
}

