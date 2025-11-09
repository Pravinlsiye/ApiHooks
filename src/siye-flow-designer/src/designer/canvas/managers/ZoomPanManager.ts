import { SimpleEventEmitter } from '../../VisualModels';
import { VisualBlock } from '../../VisualModels';

/**
 * Manages zoom and pan functionality for the canvas
 */
export class ZoomPanManager extends SimpleEventEmitter {
    private zoomLevel: number = 1.0;
    private minZoom: number = 0.25;
    private maxZoom: number = 3.0;
    private zoomStep: number = 0.1;
    private container: HTMLElement;
    private canvasWrapper: HTMLElement | null = null;
    
    constructor(container: HTMLElement) {
        super();
        this.container = container;
    }
    
    setCanvasWrapper(wrapper: HTMLElement): void {
        this.canvasWrapper = wrapper;
        this.applyZoom();
    }
    
    /**
     * Apply zoom transform to canvas
     */
    private applyZoom(): void {
        if (this.canvasWrapper) {
            this.canvasWrapper.style.transform = `scale(${this.zoomLevel})`;
            this.canvasWrapper.style.transformOrigin = 'top left';
            
            // Update grid background size on container based on zoom level
            const gridSize = 20 / this.zoomLevel;
            this.container.style.backgroundSize = `${gridSize}px ${gridSize}px`;
            
            this.emit('zoomChanged', this.zoomLevel);
        }
    }
    
    /**
     * Zoom in
     */
    public zoomIn(): void {
        this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
        this.applyZoom();
    }
    
    /**
     * Zoom out
     */
    public zoomOut(): void {
        this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
        this.applyZoom();
    }
    
    /**
     * Reset zoom to 100%
     */
    public zoomReset(): void {
        this.zoomLevel = 1.0;
        this.applyZoom();
    }
    
    /**
     * Fit to screen (calculate zoom to fit all blocks and center them)
     */
    public zoomFitToScreen(blocks: Map<string, VisualBlock>): void {
        if (blocks.size === 0) {
            this.zoomReset();
            return;
        }
        
        if (!this.container) {
            this.zoomReset();
            return;
        }
        
        const containerRect = this.container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Calculate bounding box of all blocks
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        blocks.forEach(block => {
            const blockWidth = block.width || 250;
            const blockHeight = block.height || 100;
            minX = Math.min(minX, block.position.x);
            minY = Math.min(minY, block.position.y);
            maxX = Math.max(maxX, block.position.x + blockWidth);
            maxY = Math.max(maxY, block.position.y + blockHeight);
        });
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        if (contentWidth === 0 || contentHeight === 0) {
            this.zoomReset();
            return;
        }
        
        // Calculate zoom to fit with padding
        const padding = 150;
        const scaleX = (containerWidth - padding * 2) / contentWidth;
        const scaleY = (containerHeight - padding * 2) / contentHeight;
        const scale = Math.min(scaleX, scaleY, this.maxZoom);
        
        this.zoomLevel = Math.max(scale, this.minZoom);
        this.applyZoom();
        
        // Center the viewport on the blocks
        if (this.canvasWrapper) {
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            
            requestAnimationFrame(() => {
                const scrollX = centerX - (containerWidth / (2 * this.zoomLevel));
                const scrollY = centerY - (containerHeight / (2 * this.zoomLevel));
                
                this.canvasWrapper!.scrollLeft = Math.max(0, scrollX);
                this.canvasWrapper!.scrollTop = Math.max(0, scrollY);
            });
        }
    }
    
    /**
     * Get current zoom level
     */
    public getZoomLevel(): number {
        return this.zoomLevel;
    }
    
    /**
     * Convert screen coordinates to canvas coordinates accounting for zoom
     */
    public screenToCanvas(screenX: number, screenY: number): Position {
        if (!this.canvasWrapper) {
            return { x: screenX, y: screenY };
        }
        
        const rect = this.canvasWrapper.getBoundingClientRect();
        return {
            x: (screenX - rect.left + this.canvasWrapper.scrollLeft) / this.zoomLevel,
            y: (screenY - rect.top + this.canvasWrapper.scrollTop) / this.zoomLevel
        };
    }
}

