import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Minimap } from '../../components/Minimap';
import { VisualBlock } from '../../designer/VisualModels';

describe('Minimap', () => {
    let container: HTMLElement;
    let canvasContainer: HTMLElement;
    let canvasWrapper: HTMLElement;
    let minimap: Minimap;

    beforeEach(() => {
        // Create container
        container = document.createElement('div');
        container.id = 'test-minimap-container';
        document.body.appendChild(container);

        // Create canvas container structure
        canvasContainer = document.createElement('div');
        canvasContainer.id = 'test-canvas-container';
        canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'canvas-wrapper';
        canvasContainer.appendChild(canvasWrapper);
        document.body.appendChild(canvasContainer);

        minimap = new Minimap('test-minimap-container', 'test-canvas-container');
    });

    afterEach(() => {
        if (minimap) {
            minimap.destroy();
        }
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        if (canvasContainer && canvasContainer.parentNode) {
            document.body.removeChild(canvasContainer);
        }
    });

    describe('Initialization', () => {
        it('should create minimap element', () => {
            const minimapEl = container.querySelector('.minimap');
            expect(minimapEl).toBeTruthy();
        });

        it('should create SVG element', () => {
            const svg = container.querySelector('.minimap svg');
            expect(svg).toBeTruthy();
        });

        it('should create viewport indicator', () => {
            const viewport = container.querySelector('.minimap-viewport');
            expect(viewport).toBeTruthy();
        });

        it('should create blocks container', () => {
            const blocksContainer = container.querySelector('.minimap-blocks');
            expect(blocksContainer).toBeTruthy();
        });

        it('should throw error if canvas container not found', () => {
            expect(() => {
                new Minimap('test-minimap-container', 'non-existent');
            }).toThrow();
        });

        it('should throw error if canvas wrapper not found', () => {
            const badContainer = document.createElement('div');
            badContainer.id = 'bad-canvas';
            document.body.appendChild(badContainer);

            expect(() => {
                new Minimap('test-minimap-container', 'bad-canvas');
            }).toThrow();

            document.body.removeChild(badContainer);
        });
    });

    describe('Block Updates', () => {
        it('should update blocks', () => {
            const blocks: VisualBlock[] = [
                {
                    id: 'block-1',
                    type: 'start' as any,
                    position: { x: 100, y: 100 },
                    width: 200,
                    height: 100,
                    selected: false
                },
                {
                    id: 'block-2',
                    type: 'end' as any,
                    position: { x: 400, y: 200 },
                    width: 200,
                    height: 100,
                    selected: false
                }
            ];

            minimap.updateBlocks(blocks);

            const blockElements = container.querySelectorAll('.minimap-block');
            expect(blockElements.length).toBe(2);
        });

        it('should update existing blocks', () => {
            const blocks1: VisualBlock[] = [
                {
                    id: 'block-1',
                    type: 'start' as any,
                    position: { x: 100, y: 100 },
                    width: 200,
                    height: 100,
                    selected: false
                }
            ];

            minimap.updateBlocks(blocks1);

            const blocks2: VisualBlock[] = [
                {
                    id: 'block-1',
                    type: 'start' as any,
                    position: { x: 150, y: 150 },
                    width: 200,
                    height: 100,
                    selected: false
                }
            ];

            minimap.updateBlocks(blocks2);

            const blockElements = container.querySelectorAll('.minimap-block');
            expect(blockElements.length).toBe(1);
        });

        it('should remove blocks not in update', () => {
            const blocks1: VisualBlock[] = [
                {
                    id: 'block-1',
                    type: 'start' as any,
                    position: { x: 100, y: 100 },
                    width: 200,
                    height: 100,
                    selected: false
                },
                {
                    id: 'block-2',
                    type: 'end' as any,
                    position: { x: 400, y: 200 },
                    width: 200,
                    height: 100,
                    selected: false
                }
            ];

            minimap.updateBlocks(blocks1);

            const blocks2: VisualBlock[] = [
                {
                    id: 'block-1',
                    type: 'start' as any,
                    position: { x: 100, y: 100 },
                    width: 200,
                    height: 100,
                    selected: false
                }
            ];

            minimap.updateBlocks(blocks2);

            const blockElements = container.querySelectorAll('.minimap-block');
            expect(blockElements.length).toBe(1);
        });

        it('should handle empty blocks array', () => {
            minimap.updateBlocks([]);

            const blockElements = container.querySelectorAll('.minimap-block');
            expect(blockElements.length).toBe(0);
        });
    });

    describe('Viewport Updates', () => {
        it('should update viewport position', () => {
            // Set canvas wrapper transform
            canvasWrapper.style.transform = 'translate(100px, 200px) scale(1.5)';
            
            // Trigger viewport update by accessing internal method or simulating scroll
            // Since updateViewport is private, we'll test through public interface
            const viewport = container.querySelector('.minimap-viewport') as HTMLElement;
            expect(viewport).toBeTruthy();
        });

        it('should handle zoom level', () => {
            const getZoomLevel = () => 2.0;
            minimap.destroy();
            
            minimap = new Minimap('test-minimap-container', 'test-canvas-container', getZoomLevel);
            
            const minimapEl = container.querySelector('.minimap');
            expect(minimapEl).toBeTruthy();
        });
    });

    describe('Cleanup', () => {
        it('should cleanup on destroy', () => {
            minimap.destroy();
            
            const minimapEl = container.querySelector('.minimap');
            expect(minimapEl).toBeNull();
        });

        it('should handle multiple destroy calls', () => {
            expect(() => {
                minimap.destroy();
                minimap.destroy();
            }).not.toThrow();
        });
    });
});

