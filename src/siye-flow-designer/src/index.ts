import { WorkflowDesigner } from './designer/WorkflowDesigner';
import { DEFAULT_CONFIG, createEmbeddedConfig } from './designer/DesignerConfig';

// Export for library usage
export { WorkflowDesigner } from './designer/WorkflowDesigner';
export { WorkflowEngine } from './core/WorkflowEngine';
export * from './models/workflow-models';
export { DEFAULT_CONFIG, createEmbeddedConfig } from './designer/DesignerConfig';
export { ApiDefinitionLoader } from './api/ApiDefinitionLoader';
export { ApiDefinitionManager } from './api/ApiDefinitionManager';

// Re-export types (TypeScript only, stripped at runtime)
export type { DesignerConfig, HostApiConfig } from './designer/DesignerConfig';
export type { ApiDefinition, ApiEndpoint, ApiParameter } from './api/ApiDefinitionLoader';

// Initialize designer when DOM is ready (for standalone usage)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const designerContainer = document.getElementById('designer-container');
        if (designerContainer) {
            try {
                // Check for embedded mode configuration
                const config = (window as any).SiyeFlowConfig 
                    ? createEmbeddedConfig(
                        (window as any).SiyeFlowConfig.apiBasePath,
                        (window as any).SiyeFlowConfig.hostApis
                    )
                    : DEFAULT_CONFIG; // Standalone mode by default
                
                const designer = new WorkflowDesigner('designer-container', config);
                console.log(`SiyeFlow Designer initialized in ${config.mode} mode`);
                
                // Expose designer instance for debugging
                (window as any).siyeFlowDesigner = designer;
            } catch (error) {
                console.error('Failed to initialize SiyeFlow Designer:', error);
            }
        }
    });
}
