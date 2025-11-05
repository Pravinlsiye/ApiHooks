import { WorkflowDesigner } from './designer/WorkflowDesigner';

// Export for library usage
export { WorkflowDesigner } from './designer/WorkflowDesigner';
export { WorkflowEngine } from './core/WorkflowEngine';
export * from './models/workflow-models';

// Initialize designer when DOM is ready (for standalone usage)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const designerContainer = document.getElementById('designer-container');
        if (designerContainer) {
            try {
                const designer = new WorkflowDesigner('designer-container');
                console.log('SiyeFlow Designer initialized');
                
                // Expose designer instance for debugging
                (window as any).siyeFlowDesigner = designer;
            } catch (error) {
                console.error('Failed to initialize SiyeFlow Designer:', error);
            }
        }
    });
}
