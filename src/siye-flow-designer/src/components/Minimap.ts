import { VisualBlock, Position } from '../designer/VisualModels';
import { SimpleEventEmitter } from '../designer/VisualModels';

/**
 * Minimap component that shows a scaled-down overview of the canvas
 */
export class Minimap extends SimpleEventEmitter {
    private container: HTMLElement;
    private canvasContainer: HTMLElement;
    private canvasWrapper: HTMLElement;
    private minimapElement: HTMLElement;
    private viewportIndicator: HTMLElement;
    private blocksContainer: HTMLElement;
    
    private blocks: Map<string, VisualBlock> = new Map();
    private scale: number = 0.05; // Scale factor for minimap (5% of actual size)
    private isDragging: boolean = false;
    
    private canvasWidth: number = 4000;
    private canvasHeight: number = 4000;
    private getZoomLevel: (() => number) | null = null;
    
    constructor(containerId: string, canvasContainerId: string, getZoomLevel?: () => number) {
        super();
        
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        const canvasElement = document.getElementById(canvasContainerId);
        if (!canvasElement) {
            throw new Error(`Canvas container element '${canvasContainerId}' not found`);
        }
        
        this.container = element;
        this.canvasContainer = canvasElement;
        this.canvasWrapper = canvasElement.querySelector('.canvas-wrapper') as HTMLElement;
        this.getZoomLevel = getZoomLevel || null;
        
        this.setupMinimap();
        this.setupEventListeners();
        this.updatePosition();
        this.setupZoomObserver();
        
        // Update position on window resize
        window.addEventListener('resize', () => this.updatePosition());
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
        
        this.minimapElement = this.container.querySelector('.minimap') as HTMLElement;
        this.blocksContainer = this.minimapElement.querySelector('.minimap-blocks') as HTMLElement;
        this.viewportIndicator = this.minimapElement.querySelector('.minimap-viewport') as HTMLElement;
    }
    
    /**
     * Setup event listeners for scroll tracking and interaction
     */
    private setupEventListeners(): void {
        // Update viewport indicator on scroll
        this.canvasContainer.addEventListener('scroll', () => {
            this.updateViewport();
            this.updatePosition(); // Update position on scroll in case layout changes
        });
        
        // Handle minimap clicks/drags for panning
        this.minimapElement.addEventListener('mousedown', (e) => this.onMinimapMouseDown(e));
        document.addEventListener('mousemove', (e) => this.onMinimapMouseMove(e));
        document.addEventListener('mouseup', () => this.onMinimapMouseUp());
    }
    
    /**
     * Setup observer to watch for zoom changes (transform changes on canvas-wrapper)
     */
    private setupZoomObserver(): void {
        if (!this.canvasWrapper) return;
        
        // Watch for transform/style changes on canvas-wrapper (zoom changes)
        const observer = new MutationObserver(() => {
            this.updateViewport();
        });
        
        observer.observe(this.canvasWrapper, {
            attributes: true,
            attributeFilter: ['style', 'transform']
        });
        
        // Also watch for transform changes via CSS (if applied differently)
        const styleObserver = new MutationObserver(() => {
            this.updateViewport();
        });
        
        if (this.canvasWrapper.parentElement) {
            styleObserver.observe(this.canvasWrapper.parentElement, {
                attributes: true,
                attributeFilter: ['style']
            });
        }
    }
    
    /**
     * Update the blocks shown in the minimap
     */
    public updateBlocks(blocks: Map<string, VisualBlock>): void {
        this.blocks = blocks;
        this.renderBlocks();
    }
    
    /**
     * Render blocks in the minimap
     */
    private renderBlocks(): void {
        if (!this.blocksContainer) return;
        
        // Clear existing blocks
        this.blocksContainer.innerHTML = '';
        
        // Calculate minimap dimensions
        const minimapRect = this.minimapElement.getBoundingClientRect();
        const minimapWidth = minimapRect.width - 20; // Account for padding
        const minimapHeight = minimapRect.height - 20;
        
        // Calculate scale based on canvas size
        const scaleX = minimapWidth / this.canvasWidth;
        const scaleY = minimapHeight / this.canvasHeight;
        this.scale = Math.min(scaleX, scaleY);
        
        // Update SVG viewBox to match canvas dimensions (scaled)
        const svg = this.minimapElement.querySelector('.minimap-svg') as SVGSVGElement;
        if (svg) {
            svg.setAttribute('viewBox', `0 0 ${this.canvasWidth} ${this.canvasHeight}`);
        }
        
        // Render each block
        this.blocks.forEach((block) => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            const x = block.position.x;
            const y = block.position.y;
            const width = Math.max(block.width, 10);
            const height = Math.max(block.height, 10);
            
            rect.setAttribute('x', x.toString());
            rect.setAttribute('y', y.toString());
            rect.setAttribute('width', width.toString());
            rect.setAttribute('height', height.toString());
            rect.setAttribute('rx', '2');
            rect.setAttribute('fill', block.selected ? 'rgba(35, 134, 54, 0.5)' : 'rgba(100, 100, 100, 0.3)');
            rect.setAttribute('stroke', block.selected ? 'rgba(35, 134, 54, 0.7)' : 'rgba(150, 150, 150, 0.4)');
            rect.setAttribute('stroke-width', '1');
            rect.setAttribute('data-block-id', block.id);
            
            this.blocksContainer.appendChild(rect);
        });
        
        this.updateViewport();
    }
    
    /**
     * Force update of the viewport indicator (useful after zoom changes)
     */
    public updateViewportIndicator(): void {
        this.updateViewport();
    }
    
    /**
     * Update the viewport indicator
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
        
        // Convert to minimap coordinates (SVG uses canvas coordinates directly)
        this.viewportIndicator.setAttribute('x', scrollLeft.toString());
        this.viewportIndicator.setAttribute('y', scrollTop.toString());
        this.viewportIndicator.setAttribute('width', canvasVisibleWidth.toString());
        this.viewportIndicator.setAttribute('height', canvasVisibleHeight.toString());
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
        
        const svgRect = svg.getBoundingClientRect();
        const contentRect = this.minimapElement.querySelector('.minimap-content')!.getBoundingClientRect();
        
        // Get mouse position relative to SVG content area
        const mouseX = e.clientX - contentRect.left;
        const mouseY = e.clientY - contentRect.top;
        
        // Convert to SVG coordinates using viewBox
        const viewBox = svg.viewBox.baseVal;
        const svgX = (mouseX / contentRect.width) * viewBox.width;
        const svgY = (mouseY / contentRect.height) * viewBox.height;
        
        // Center viewport on clicked position
        const containerRect = this.canvasContainer.getBoundingClientRect();
        this.canvasContainer.scrollLeft = svgX - (containerRect.width / 2);
        this.canvasContainer.scrollTop = svgY - (containerRect.height / 2);
    }
    
    /**
     * Set canvas dimensions
     */
    public setCanvasSize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
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

