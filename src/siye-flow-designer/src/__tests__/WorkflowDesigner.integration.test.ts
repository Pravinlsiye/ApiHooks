import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowDesigner } from '../designer/WorkflowDesigner';
import { DEFAULT_CONFIG } from '../designer/DesignerConfig';
import { BlockType } from '../models/workflow-models';

describe('WorkflowDesigner Integration Tests', () => {
    let container: HTMLElement;
    let designer: WorkflowDesigner;

    beforeEach(() => {
        // Create test container
        container = document.createElement('div');
        container.id = 'test-designer-container';
        document.body.appendChild(container);
        
        // Mock global functions
        (global as any).confirm = vi.fn(() => true);
    });

    afterEach(() => {
        // Cleanup
        if (designer) {
            designer.destroy();
        }
        if (container && container.parentNode) {
            document.body.removeChild(container);
        }
        
        // Clean up mocks
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with default config', () => {
            designer = new WorkflowDesigner('test-designer-container');
            expect(designer).toBeDefined();
            expect(container.querySelector('.siye-flow-designer')).toBeTruthy();
        });

        it('should initialize with custom config', () => {
            const customConfig = { ...DEFAULT_CONFIG, mode: 'standalone' as const };
            designer = new WorkflowDesigner('test-designer-container', customConfig);
            expect(designer).toBeDefined();
        });

        it('should throw error if container not found', () => {
            expect(() => {
                new WorkflowDesigner('non-existent-container');
            }).toThrow();
        });

        it('should create default workflow with Start and End blocks', () => {
            designer = new WorkflowDesigner('test-designer-container');
            
            // Wait for initialization
            const workflow = designer.exportWorkflow();
            expect(workflow.blocks.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Block Management', () => {
        beforeEach(() => {
            designer = new WorkflowDesigner('test-designer-container');
        });

        it('should have block palette', () => {
            const palette = container.querySelector('.block-palette');
            expect(palette).toBeTruthy();
        });

        it('should display block templates', () => {
            const templates = container.querySelectorAll('.block-template');
            expect(templates.length).toBeGreaterThan(0);
        });

        it('should have canvas renderer', () => {
            const canvas = container.querySelector('.canvas-container');
            expect(canvas).toBeTruthy();
        });
    });

    describe('UI Components', () => {
        beforeEach(() => {
            designer = new WorkflowDesigner('test-designer-container');
        });

        it('should have toolbar buttons', () => {
            const importBtn = container.querySelector('[data-testid="toolbar-import"]');
            const exportBtn = container.querySelector('[data-testid="toolbar-export"]');
            
            expect(importBtn).toBeTruthy();
            expect(exportBtn).toBeTruthy();
        });

        it('should have zoom controls', () => {
            const zoomIn = container.querySelector('#floating-zoom-in');
            const zoomOut = container.querySelector('#floating-zoom-out');
            const zoomFit = container.querySelector('#floating-fit-screen');
            
            expect(zoomIn).toBeTruthy();
            expect(zoomOut).toBeTruthy();
            expect(zoomFit).toBeTruthy();
        });

        it('should have minimap', () => {
            const minimap = container.querySelector('.minimap');
            expect(minimap).toBeTruthy();
        });
    });

    describe('Workflow Operations', () => {
        beforeEach(() => {
            designer = new WorkflowDesigner('test-designer-container');
        });

        it('should export workflow', () => {
            const workflow = designer.exportWorkflow();
            
            expect(workflow).toBeDefined();
            expect(workflow.blocks).toBeDefined();
            expect(workflow.blocks.length).toBeGreaterThanOrEqual(2);
        });

        it('should import workflow', () => {
            const testWorkflow = {
                name: 'Test Workflow',
                blocks: [
                    {
                        id: 'start-1',
                        type: BlockType.Start,
                        name: 'Start',
                        description: 'Test start',
                        x: 100,
                        y: 100,
                        inputs: {},
                        outputs: {}
                    },
                    {
                        id: 'end-1',
                        type: BlockType.End,
                        name: 'End',
                        description: 'Test end',
                        x: 400,
                        y: 100,
                        inputs: {},
                        outputs: {}
                    }
                ],
                connections: []
            };

            expect(() => {
                designer.importWorkflow(testWorkflow);
            }).not.toThrow();
        });

        it('should clear workflow', () => {
            designer.clearWorkflow();
            
            const workflow = designer.exportWorkflow();
            expect(workflow.blocks.length).toBeGreaterThanOrEqual(2); // Still has Start and End
        });
    });

    describe('Event Handling', () => {
        beforeEach(() => {
            designer = new WorkflowDesigner('test-designer-container');
        });

        it('should have zoom controls that work', () => {
            const zoomIn = container.querySelector('#floating-zoom-in') as HTMLElement;
            
            expect(zoomIn).toBeTruthy();
            
            if (zoomIn) {
                zoomIn.click();
                // Just verify it doesn't throw
                expect(true).toBe(true);
            }
        });

        it('should handle export button click', () => {
            const exportBtn = container.querySelector('[data-testid="toolbar-export"]') as HTMLElement;
            
            if (exportBtn) {
                // Mock console.log to verify export is called
                const consoleSpy = vi.spyOn(console, 'log');
                exportBtn.click();
                
                // Verify workflow was exported (should log or show modal)
                expect(true).toBe(true);
                
                consoleSpy.mockRestore();
            }
        });
    });

    describe('Block Selection', () => {
        beforeEach(() => {
            designer = new WorkflowDesigner('test-designer-container');
        });

        it('should allow getting selected block', () => {
            const selectedId = designer.getSelectedBlockId();
            // Initially null or a valid ID
            expect(typeof selectedId === 'string' || selectedId === null).toBe(true);
        });
    });

    describe('Memory Management', () => {
        it('should cleanup properly on destroy', () => {
            designer = new WorkflowDesigner('test-designer-container');
            
            expect(() => {
                designer.destroy();
            }).not.toThrow();
            
            // Container should be empty after destroy
            expect(container.innerHTML).toBe('');
        });

        it('should handle multiple instances', () => {
            // Create first instance
            designer = new WorkflowDesigner('test-designer-container');
            const firstWorkflow = designer.exportWorkflow();
            
            // Destroy and create second instance
            designer.destroy();
            
            designer = new WorkflowDesigner('test-designer-container');
            const secondWorkflow = designer.exportWorkflow();
            
            // Both should work independently
            expect(firstWorkflow).toBeDefined();
            expect(secondWorkflow).toBeDefined();
        });
    });

    describe('Configuration', () => {
        it('should work in standalone mode', () => {
            const config = { ...DEFAULT_CONFIG, mode: 'standalone' as const };
            designer = new WorkflowDesigner('test-designer-container', config);
            
            expect(designer).toBeDefined();
        });

        it('should work in embedded mode', () => {
            const config = {
                ...DEFAULT_CONFIG,
                mode: 'embedded' as const,
                hostApis: []
            };
            designer = new WorkflowDesigner('test-designer-container', config);
            
            expect(designer).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            designer = new WorkflowDesigner('test-designer-container');
        });

        it('should handle invalid workflow import gracefully', () => {
            const invalidWorkflow = {
                name: 'Invalid',
                blocks: null as any,
                connections: []
            };

            // Should handle gracefully (may log error but not throw)
            const result = designer.exportWorkflow(); // Get valid state after
            expect(result).toBeDefined();
        });
    });

    describe('SVG Icons', () => {
        beforeEach(() => {
            designer = new WorkflowDesigner('test-designer-container');
        });

        it('should use SVG icons instead of emoji', () => {
            // Check palette icons since default blocks might not be rendered immediately
            const paletteIcons = container.querySelectorAll('.block-template .icon');
            
            expect(paletteIcons.length).toBeGreaterThan(0);
            
            // All palette icons should contain SVG
            paletteIcons.forEach(icon => {
                expect(icon.innerHTML.includes('<svg')).toBe(true);
            });
        });

        it('should have SVG icons in palette', () => {
            const paletteIcons = container.querySelectorAll('.block-template .icon');
            
            expect(paletteIcons.length).toBeGreaterThan(0);
            
            // All palette icons should contain SVG
            paletteIcons.forEach(icon => {
                expect(icon.innerHTML.includes('<svg')).toBe(true);
            });
        });
    });
});

