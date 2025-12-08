import { CanvasStateManager } from '../designer/canvas/state/CanvasStateManager';
import { BaseComponent } from './BaseComponent';
import { DOMUpdater } from './DOMUpdater';

/**
 * Custom DevTools panel for debugging and state inspection
 * Similar to React DevTools but for vanilla TypeScript
 * Toggle with Ctrl+Shift+D
 */
export class DevTools extends BaseComponent {
    private panel: HTMLElement | null = null;
    private isOpen = false;
    private stateManager: CanvasStateManager;
    
    constructor(stateManager: CanvasStateManager) {
        // Create a unique container ID for DevTools
        const containerId = `siye-devtools-${Date.now()}`;
        const container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
        
        super(containerId);
        
        this.stateManager = stateManager;
        this.createPanel();
        this.setupKeyboardShortcut();
        
        // Subscribe to state changes and register cleanup
        const stateChangeHandler = () => {
            this.updatePanel();
        };
        this.stateManager.on('stateChanged', stateChangeHandler);
        
        // Register cleanup for state subscription
        this.registerCleanup(() => {
            this.stateManager.off('stateChanged', stateChangeHandler);
        });
    }
    
    private createPanel(): void {
        this.panel = this.createElement('div', { 
            id: 'siye-devtools',
            style: `
                position: fixed;
                top: 0;
                right: -400px;
                width: 400px;
                height: 100vh;
                background: #1e1e1e;
                color: #d4d4d4;
                z-index: 10000;
                transition: right 0.3s;
                overflow-y: auto;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                padding: 20px;
                box-shadow: -2px 0 10px rgba(0,0,0,0.5);
            `
        });
        
        this.container.appendChild(this.panel);
        this.updatePanel();
    }
    
    private updatePanel(): void {
        if (!this.panel) return;
        
        const state = this.stateManager.getState();
        
        this.panel.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h2 style="color: #4ec9b0; margin: 0 0 10px 0;">SiyeFlow DevTools</h2>
                <button id="devtools-close" style="
                    background: #007acc;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    border-radius: 4px;
                ">Close</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #569cd6; margin-top: 0;">State</h3>
                <pre style="background: #252526; padding: 10px; border-radius: 4px; overflow-x: auto; margin: 0;">
${JSON.stringify({
    blocks: state.blocks.size,
    connections: state.connections.size,
    isDragging: state.isDragging,
    isPanning: state.isPanning,
    panMode: state.panMode,
    isConnecting: state.isConnecting
}, null, 2)}
                </pre>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #569cd6;">Blocks</h3>
                <div id="devtools-blocks"></div>
            </div>
            
            <div>
                <h3 style="color: #569cd6;">Connections</h3>
                <div id="devtools-connections"></div>
            </div>
        `;
        
        // Render blocks list
        const blocksDiv = DOMUpdater.query<HTMLElement>(this.panel, '#devtools-blocks');
        if (blocksDiv) {
            blocksDiv.innerHTML = '';
            state.blocks.forEach((block, id) => {
                const blockDiv = this.createElement('div', {
                    style: 'padding: 5px; margin: 5px 0; background: #252526; border-radius: 4px; cursor: pointer;'
                });
                blockDiv.textContent = `${id}: ${block.type} at (${block.position.x}, ${block.position.y})`;
                this.addEventListener(blockDiv, 'click', () => {
                    console.log('Block:', block);
                });
                blocksDiv.appendChild(blockDiv);
            });
        }
        
        // Render connections list
        const connectionsDiv = DOMUpdater.query<HTMLElement>(this.panel, '#devtools-connections');
        if (connectionsDiv) {
            connectionsDiv.innerHTML = '';
            state.connections.forEach((conn, _id) => {
                const connDiv = this.createElement('div', {
                    style: 'padding: 5px; margin: 5px 0; background: #252526; border-radius: 4px;'
                });
                connDiv.textContent = `${conn.sourceBlockId}:${conn.sourcePortName} → ${conn.targetBlockId}:${conn.targetPortName}`;
                connectionsDiv.appendChild(connDiv);
            });
        }
        
        // Setup close button
        const closeBtn = DOMUpdater.query<HTMLButtonElement>(this.panel, '#devtools-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.toggle());
        }
    }
    
    toggle(): void {
        if (!this.panel) return;
        
        this.isOpen = !this.isOpen;
        this.panel.style.right = this.isOpen ? '0' : '-400px';
    }
    
    private setupKeyboardShortcut(): void {
        this.addEventListener(document, 'keydown', (e) => {
            const keyEvent = e as KeyboardEvent;
            // Ctrl+Shift+D to toggle DevTools
            if (keyEvent.ctrlKey && keyEvent.shiftKey && keyEvent.key === 'D') {
                keyEvent.preventDefault();
                this.toggle();
            }
        });
    }
    
    destroy(): void {
        if (this.panel && this.panel.parentElement) {
            this.panel.parentElement.removeChild(this.panel);
        }
        super.destroy();
    }
}

