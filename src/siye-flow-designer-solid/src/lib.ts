/**
 * Library entry point — UMD/ES build for SiyeFlow.UI embed.
 * Exports a WorkflowDesigner class with the same constructor API as the old designer.
 */
import { render } from 'solid-js/web';
import './styles/styles.css';
import AppFactory from './components/App';
import { storeActions, setCurrentTheme } from './store/designer-store';
import { terminalActions } from './store/terminal-store';

export interface DesignerOptions {
    canvasContainerId: string;
    paletteContainerId?: string;
    navbarContainerId?: string;
    floatingToolbarContainerId?: string;
    minimapContainerId?: string;
    terminalContainerId?: string;
    settingsPanelContainerId?: string;
    homeUrl?: string;
}

/**
 * WorkflowDesigner — drop-in compat class for SiyeFlow.UI embed.
 * Instead of mounting into multiple containers, mounts the entire Solid app
 * into the canvas container's parent element.
 */
export class WorkflowDesigner {
    private dispose: (() => void) | null = null;

    constructor(options: DesignerOptions | string) {
        const opts = typeof options === 'string' ? { canvasContainerId: options } : options;
        const canvasEl = document.getElementById(opts.canvasContainerId);
        const mountEl = canvasEl?.parentElement ?? canvasEl ?? document.body;

        // Clear mount point
        if (mountEl) mountEl.innerHTML = '';

        // Apply default theme from config
        const config = (window as any).SiyeFlowConfig;
        if (config?.theme) setCurrentTheme(config.theme);

        const makeApp = () => AppFactory({ homeUrl: opts.homeUrl });
        this.dispose = render(makeApp, mountEl!);
    }

    loadWorkflow(data: Record<string, unknown>): void {
        storeActions.loadFromSchema(data);
    }

    clearTerminal(): void {
        terminalActions.clear();
    }

    destroy(): void {
        this.dispose?.();
    }
}

// Re-export apiManager for backwards compat (SiyeFlow.UI index.html calls it)
export { apiManager } from './api/api-definition-manager';
export { storeActions } from './store/designer-store';
export * from './models/workflow-models';
export * from './models/visual-models';
