/**
 * Minimap Component
 * Shows a scaled-down overview of the canvas with viewport indicator
 */

import { BaseComponent } from '../utils/base-component';
import { VisualBlock, Position } from '../models/visual-models';
import { DOMDiff } from '../utils/dom-diff';
import { DOMUpdater } from '../utils/dom-updater';

export class Minimap extends BaseComponent {
    private minimapElement: HTMLElement | null = null;
    private blocksContainer: SVGGElement | null = null;
    private viewportIndicator: SVGRectElement | null = null;
    private svgElement: SVGSVGElement | null = null;
    
    private blocks: Map<string, VisualBlock> = new Map();
    private isDragging: boolean = false;
    private isVisible: boolean = true;
    
    // Canvas info from CanvasRenderer
    private canvasContainer: HTMLElement | null = null; // The clipping container
    private canvasWrapper: HTMLElement | null = null;   // The 8000x8000 canvas
    private getZoom: () => number = () => 1;
    private getPanOffset: () => Position = () => ({ x: 0, y: 0 });
    private setPanOffset: (x: number, y: number) => void = () => {};
    
    // Canvas dimensions (must match actual canvas)
    private readonly CANVAS_WIDTH = 8000;
    private readonly CANVAS_HEIGHT = 8000;
    
    // Dynamic viewBox for showing relevant area
    private viewBoxX: number = 0;
    private viewBoxY: number = 0;
    private viewBoxWidth: number = 2000;
    private viewBoxHeight: number = 2000;
    private readonly PADDING = 300;

    constructor(containerId: string) {
        super(containerId);
        this.render();
        this.setupEventHandlers();
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="minimap ${this.isVisible ? '' : 'hidden'}">
                <div class="minimap-content">
                    <svg class="minimap-svg" viewBox="0 0 2000 2000" preserveAspectRatio="xMidYMid meet">
                        <g class="minimap-blocks"></g>
                        <rect class="minimap-viewport" x="0" y="0" width="0" height="0"/>
                    </svg>
                </div>
            </div>
        `;

        this.minimapElement = this.container.querySelector('.minimap');
        this.svgElement = this.container.querySelector('.minimap-svg');
        this.blocksContainer = this.container.querySelector('.minimap-blocks');
        this.viewportIndicator = this.container.querySelector('.minimap-viewport');
    }

    private setupEventHandlers(): void {
        if (this.minimapElement) {
            this.addEventListener(this.minimapElement, 'mousedown', (e) => this.handleMouseDown(e as MouseEvent));
            this.addEventListener(document, 'mousemove', DOMDiff.throttle((e) => this.handleMouseMove(e as MouseEvent), 16) as EventListener);
            this.addEventListener(document, 'mouseup', () => this.handleMouseUp());
        }
    }

    private handleMouseDown(e: MouseEvent): void {
        if (!this.canvasWrapper) return;
        e.preventDefault();
        this.isDragging = true;
        this.jumpToPosition(e);
    }

    private handleMouseMove(e: MouseEvent): void {
        if (!this.isDragging || !this.canvasWrapper) return;
        this.jumpToPosition(e);
    }

    private handleMouseUp(): void {
        this.isDragging = false;
    }

    private jumpToPosition(e: MouseEvent): void {
        if (!this.svgElement || !this.canvasWrapper) return;

        const contentElement = this.minimapElement?.querySelector('.minimap-content') as HTMLElement;
        if (!contentElement) return;

        const contentRect = contentElement.getBoundingClientRect();
        const mouseX = e.clientX - contentRect.left;
        const mouseY = e.clientY - contentRect.top;

        // Convert to canvas coordinates using viewBox
        const canvasX = this.viewBoxX + (mouseX / contentRect.width) * this.viewBoxWidth;
        const canvasY = this.viewBoxY + (mouseY / contentRect.height) * this.viewBoxHeight;

        // The canvas layer is positioned at the center of the wrapper
        // Pan offset moves the view: positive offset shows content to the left of center
        // We want to center the clicked point in the viewport
        // canvasX = 4000 - panX/zoom => panX = (4000 - canvasX) * zoom
        const zoom = this.getZoom();
        const newPanX = (this.CANVAS_WIDTH / 2 - canvasX) * zoom;
        const newPanY = (this.CANVAS_HEIGHT / 2 - canvasY) * zoom;

        this.setPanOffset(newPanX, newPanY);
        this.updateViewport();
    }

    /**
     * Connect to canvas for viewport tracking
     */
    connectToCanvas(
        canvasContainer: HTMLElement,  // The clipping container (visible area)
        canvasWrapper: HTMLElement,    // The full 8000x8000 canvas
        getZoom: () => number,
        getPanOffset: () => Position,
        setPanOffset: (x: number, y: number) => void
    ): void {
        this.canvasContainer = canvasContainer;
        this.canvasWrapper = canvasWrapper;
        this.getZoom = getZoom;
        this.getPanOffset = getPanOffset;
        this.setPanOffset = setPanOffset;

        this.addEventListener(window, 'resize', DOMDiff.throttle(() => this.updateViewport(), 100) as EventListener);
        
        requestAnimationFrame(() => this.updateViewport());
    }

    /**
     * Update blocks display
     */
    updateBlocks(blocks: Map<string, VisualBlock>): void {
        this.blocks = blocks;
        this.renderBlocks();
        this.updateViewport();
    }

    private calculateBoundingBox(): { x: number; y: number; width: number; height: number } {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        // Include all blocks
        if (this.blocks.size > 0) {
            this.blocks.forEach(block => {
                const blockWidth = block.width || 200;
                const blockHeight = block.height || 100;
                
                minX = Math.min(minX, block.position.x);
                minY = Math.min(minY, block.position.y);
                maxX = Math.max(maxX, block.position.x + blockWidth);
                maxY = Math.max(maxY, block.position.y + blockHeight);
            });
        }

        // Include current viewport
        if (this.canvasContainer) {
            const viewport = this.getViewportInCanvasCoords();
            if (this.blocks.size === 0) {
                minX = viewport.x;
                minY = viewport.y;
                maxX = viewport.x + viewport.width;
                maxY = viewport.y + viewport.height;
            } else {
                minX = Math.min(minX, viewport.x);
                minY = Math.min(minY, viewport.y);
                maxX = Math.max(maxX, viewport.x + viewport.width);
                maxY = Math.max(maxY, viewport.y + viewport.height);
            }
        }

        // Default if nothing found
        if (minX === Infinity) {
            minX = 3500; minY = 3500; maxX = 4500; maxY = 4500;
        }

        // Add padding
        return {
            x: minX - this.PADDING,
            y: minY - this.PADDING,
            width: (maxX - minX) + this.PADDING * 2,
            height: (maxY - minY) + this.PADDING * 2
        };
    }

    private getViewportInCanvasCoords(): { x: number; y: number; width: number; height: number } {
        if (!this.canvasContainer) {
            return { x: 3500, y: 3500, width: 1000, height: 1000 };
        }

        const zoom = this.getZoom();
        const panOffset = this.getPanOffset();
        
        // Use container dimensions (the visible viewport), not the canvas wrapper (8000x8000)
        const containerWidth = this.canvasContainer.clientWidth;
        const containerHeight = this.canvasContainer.clientHeight;

        // Viewport size in canvas coordinates
        const viewWidth = containerWidth / zoom;
        const viewHeight = containerHeight / zoom;
        
        // The center of viewport in canvas coords:
        // panX = (4000 - centerX) * zoom => centerX = 4000 - panX/zoom
        const centerX = this.CANVAS_WIDTH / 2 - panOffset.x / zoom;
        const centerY = this.CANVAS_HEIGHT / 2 - panOffset.y / zoom;
        
        // Top-left of viewport
        const viewX = centerX - viewWidth / 2;
        const viewY = centerY - viewHeight / 2;

        return {
            x: viewX,
            y: viewY,
            width: viewWidth,
            height: viewHeight
        };
    }

    private updateViewBox(): void {
        if (!this.svgElement) return;

        const bounds = this.calculateBoundingBox();
        this.viewBoxX = bounds.x;
        this.viewBoxY = bounds.y;
        this.viewBoxWidth = bounds.width;
        this.viewBoxHeight = bounds.height;

        this.svgElement.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
    }

    private renderBlocks(): void {
        if (!this.blocksContainer) return;

        // Update viewBox first
        this.updateViewBox();

        // Clear and re-render blocks
        this.blocksContainer.innerHTML = '';

        this.blocks.forEach(block => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', block.position.x.toString());
            rect.setAttribute('y', block.position.y.toString());
            rect.setAttribute('width', (block.width || 200).toString());
            rect.setAttribute('height', (block.height || 100).toString());
            rect.setAttribute('rx', '4');
            rect.setAttribute('class', 'minimap-block-rect');
            this.blocksContainer!.appendChild(rect);
        });
    }

    updateViewport(): void {
        if (!this.viewportIndicator || !this.canvasContainer) return;

        const viewport = this.getViewportInCanvasCoords();

        this.viewportIndicator.setAttribute('x', viewport.x.toString());
        this.viewportIndicator.setAttribute('y', viewport.y.toString());
        this.viewportIndicator.setAttribute('width', viewport.width.toString());
        this.viewportIndicator.setAttribute('height', viewport.height.toString());

        // Update viewBox to include viewport if needed
        this.updateViewBox();
    }

    show(): void {
        this.isVisible = true;
        if (this.minimapElement) this.minimapElement.classList.remove('hidden');
        this.emit('visibilityChange', { visible: true });
    }

    hide(): void {
        this.isVisible = false;
        if (this.minimapElement) this.minimapElement.classList.add('hidden');
        this.emit('visibilityChange', { visible: false });
    }

    toggle(): void {
        if (this.isVisible) this.hide();
        else this.show();
    }

    getIsVisible(): boolean {
        return this.isVisible;
    }
}
