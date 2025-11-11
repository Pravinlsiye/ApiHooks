import { SimpleEventEmitter } from '../../VisualModels';
import { VisualBlock, Position } from '../../VisualModels';

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
    private isInitialized: boolean = false;
    
    constructor(container: HTMLElement) {
        super();
        this.container = container;
    }
    
    setCanvasWrapper(wrapper: HTMLElement): void {
        this.canvasWrapper = wrapper;
        // Initial setup - don't adjust scroll position yet
        this.isInitialized = false;
        this.applyZoom(undefined, false); // false = don't adjust scroll
        this.isInitialized = true;
    }
    
    /**
     * Apply zoom transform to canvas
     * Adjusts scroll position to keep the viewport center at the same canvas position
     */
    private applyZoom(oldZoomLevel?: number, adjustScroll: boolean = true): void {
        if (this.canvasWrapper && this.container) {
            // Use provided old zoom level, or current zoom level if not provided
            const previousZoom = oldZoomLevel !== undefined ? oldZoomLevel : this.zoomLevel;
            
            // Get current scroll position and viewport center BEFORE zoom change
            const oldScrollLeft = this.container.scrollLeft;
            const oldScrollTop = this.container.scrollTop;
            const containerRect = this.container.getBoundingClientRect();
            const viewportCenterX = containerRect.width / 2;
            const viewportCenterY = containerRect.height / 2;
            
            // Calculate the canvas position at the viewport center (using PREVIOUS zoom level)
            // This is the point we want to keep at the center after zoom
            // Only calculate if we're adjusting scroll and zoom actually changed
            let canvasCenterX = 0;
            let canvasCenterY = 0;
            if (adjustScroll && oldZoomLevel !== undefined && oldZoomLevel !== this.zoomLevel) {
                canvasCenterX = (oldScrollLeft + viewportCenterX) / previousZoom;
                canvasCenterY = (oldScrollTop + viewportCenterY) / previousZoom;
            }
            
            // Use requestAnimationFrame for smooth zoom transitions
            requestAnimationFrame(() => {
                if (this.canvasWrapper && this.container) {
                    // Apply scale transform
                    this.canvasWrapper.style.transform = `scale(${this.zoomLevel})`;
                    this.canvasWrapper.style.transformOrigin = 'top left';
                    
                    // Ensure wrapper is visible
                    this.canvasWrapper.style.display = 'block';
                    this.canvasWrapper.style.visibility = 'visible';
                    this.canvasWrapper.style.opacity = '1';
                    
                    // Update grid background size on container based on zoom level
                    const gridSize = 20 / this.zoomLevel;
                    this.container.style.backgroundSize = `${gridSize}px ${gridSize}px`;
                    
                    // Only adjust scroll position if zoom actually changed and we're not in initial setup
                    if (adjustScroll && oldZoomLevel !== undefined && oldZoomLevel !== this.zoomLevel && this.isInitialized) {
                        // Calculate new scroll position to keep canvasCenterX/Y at viewport center
                        // When zoomed, we need to scale the scroll position by the zoom level
                        const newScrollLeft = (canvasCenterX * this.zoomLevel) - viewportCenterX;
                        const newScrollTop = (canvasCenterY * this.zoomLevel) - viewportCenterY;
                        
                        // Apply scroll adjustment
                        this.container.scrollLeft = Math.max(0, newScrollLeft);
                        this.container.scrollTop = Math.max(0, newScrollTop);
                        
                        // Emit zoom changed event after scroll is adjusted
                        this.emit('zoomChanged', this.zoomLevel);
                    } else {
                        // Just emit zoom changed event without scroll adjustment
                        this.emit('zoomChanged', this.zoomLevel);
                    }
                }
            });
        }
    }
    
    /**
     * Zoom in
     */
    public zoomIn(): void {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.min(this.zoomLevel + this.zoomStep, this.maxZoom);
        this.applyZoom(oldZoom);
    }
    
    /**
     * Zoom out
     */
    public zoomOut(): void {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(this.zoomLevel - this.zoomStep, this.minZoom);
        this.applyZoom(oldZoom);
    }
    
    /**
     * Reset zoom to 100%
     */
    public zoomReset(): void {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = 1.0;
        this.applyZoom(oldZoom);
    }
    
    /**
     * Fit to screen (calculate zoom to fit all blocks and center them)
     * Rewritten from scratch with clear logic
     */
    public zoomFitToScreen(blocks: Map<string, VisualBlock>): void {
        // Early returns
        if (blocks.size === 0) {
            this.zoomReset();
            return;
        }
        
        if (!this.container || !this.canvasWrapper) {
            this.zoomReset();
            return;
        }
        
        // Step 1: Get container dimensions
        const containerRect = this.container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        if (containerWidth === 0 || containerHeight === 0) {
            return;
        }
        
        // Step 2: Calculate bounding box of all blocks
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        blocks.forEach(block => {
            const blockWidth = block.width || 250;
            const blockHeight = block.height || 100;
            const blockLeft = block.position.x;
            const blockTop = block.position.y;
            const blockRight = blockLeft + blockWidth;
            const blockBottom = blockTop + blockHeight;
            
            minX = Math.min(minX, blockLeft);
            minY = Math.min(minY, blockTop);
            maxX = Math.max(maxX, blockRight);
            maxY = Math.max(maxY, blockBottom);
        });
        
        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        
        if (contentWidth === 0 || contentHeight === 0) {
            this.zoomReset();
            return;
        }
        
        // Step 3: Calculate zoom level to fit content with padding
        const padding = 150;
        const availableWidth = containerWidth - (padding * 2);
        const availableHeight = containerHeight - (padding * 2);
        
        const scaleX = availableWidth / contentWidth;
        const scaleY = availableHeight / contentHeight;
        
        // Use the smaller scale to ensure everything fits
        let newZoom = Math.min(scaleX, scaleY);
        
        // Clamp zoom level
        newZoom = Math.max(newZoom, this.minZoom);
        newZoom = Math.min(newZoom, this.maxZoom);
        
        // Step 4: Calculate center point of blocks
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Step 5: Calculate scroll position to center the blocks
        // When canvas is scaled by zoomLevel, the visible area in canvas coordinates is:
        // visibleCanvasWidth = containerWidth / zoomLevel
        // visibleCanvasHeight = containerHeight / zoomLevel
        // To center centerX at the viewport center, we need:
        // scrollLeft = centerX - (visibleCanvasWidth / 2)
        const visibleCanvasWidth = containerWidth / newZoom;
        const visibleCanvasHeight = containerHeight / newZoom;
        
        const targetScrollX = centerX - (visibleCanvasWidth / 2);
        const targetScrollY = centerY - (visibleCanvasHeight / 2);
        
        // Step 6: Apply zoom first (synchronously set the zoom level)
        this.zoomLevel = newZoom;
        
        // Step 7: Apply zoom transform WITHOUT scroll adjustment (we'll do it separately)
        if (this.canvasWrapper) {
            // Apply scale transform
            this.canvasWrapper.style.transform = `scale(${this.zoomLevel})`;
            this.canvasWrapper.style.transformOrigin = 'top left';
            
            // Update grid background size
            const gridSize = 20 / this.zoomLevel;
            this.container.style.backgroundSize = `${gridSize}px ${gridSize}px`;
        }
        
        // Step 8: Scroll to center blocks AFTER transform is applied
        requestAnimationFrame(() => {
            // Set scroll position
            // When zoomed, we need to scale the scroll position by the zoom level
            const scaledScrollX = targetScrollX * newZoom;
            const scaledScrollY = targetScrollY * newZoom;
            
            this.container.scrollLeft = Math.max(0, scaledScrollX);
            this.container.scrollTop = Math.max(0, scaledScrollY);
            
            // Emit zoom changed event AFTER scroll is set
            this.emit('zoomChanged', this.zoomLevel);
        });
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
        if (!this.canvasWrapper || !this.container) {
            return { x: screenX, y: screenY };
        }
        
        const containerRect = this.container.getBoundingClientRect();
        
        // Calculate position relative to the container viewport
        const viewportX = screenX - containerRect.left;
        const viewportY = screenY - containerRect.top;
        
        // Add scroll offset and divide by zoom to get canvas coordinates
        return {
            x: (viewportX + this.container.scrollLeft) / this.zoomLevel,
            y: (viewportY + this.container.scrollTop) / this.zoomLevel
        };
    }
    
    /**
     * Convert canvas coordinates to viewport coordinates
     */
    public canvasToViewport(canvasX: number, canvasY: number): Position {
        return {
            x: (canvasX * this.zoomLevel) - this.container.scrollLeft,
            y: (canvasY * this.zoomLevel) - this.container.scrollTop
        };
    }
    
    /**
     * Get viewport center in screen coordinates
     */
    public getViewportCenter(): Position {
        const rect = this.container.getBoundingClientRect();
        return {
            x: rect.width / 2,
            y: rect.height / 2
        };
    }
}

