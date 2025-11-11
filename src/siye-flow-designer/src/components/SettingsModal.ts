import { BaseComponent } from '../utils/BaseComponent';
import { DOMUpdater } from '../utils/DOMUpdater';

/**
 * SettingsModal - A modal for workflow designer settings
 * Now extends BaseComponent for automatic cleanup
 */
export class SettingsModal extends BaseComponent {
    private modal: HTMLElement;
    private minimapEnabled: boolean = true;
    private onMinimapToggle?: (enabled: boolean) => void;
    
    constructor() {
        // Create a unique container ID for the modal
        const containerId = `settings-modal-${Date.now()}`;
        const overlay = document.createElement('div');
        overlay.id = containerId;
        overlay.className = 'settings-modal-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        
        super(containerId);
        
        this.modal = this.createElement('div', { className: 'settings-modal' });
        this.container.appendChild(this.modal);
        
        this.setupModal();
        this.setupEventHandlers();
    }
    
    private setupModal(): void {
        this.modal.innerHTML = `
            <div class="settings-modal-header">
                <h3 class="settings-modal-title">Settings</h3>
                <button class="settings-modal-close" title="Close">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
            </div>
            <div class="settings-modal-body">
                <div class="settings-section">
                    <h4 class="settings-section-title">Display</h4>
                    <div class="settings-item">
                        <label class="settings-label">
                            <span>Show Minimap</span>
                            <div class="settings-toggle">
                                <input type="checkbox" id="settings-minimap-toggle" ${this.minimapEnabled ? 'checked' : ''}>
                                <span class="settings-toggle-slider"></span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
            <div class="settings-modal-footer">
                <button class="settings-btn settings-btn-primary">Apply</button>
                <button class="settings-btn settings-btn-cancel">Cancel</button>
            </div>
        `;
    }
    
    private setupEventHandlers(): void {
        // Close button
        const closeBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.settings-modal-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => {
                this.hide();
            });
        }
        
        // Cancel button
        const cancelBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.settings-btn-cancel');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => {
                this.hide();
            });
        }
        
        // Apply button
        const applyBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.settings-btn-primary');
        if (applyBtn) {
            this.addEventListener(applyBtn, 'click', () => {
                this.applySettings();
            });
        }
        
        // Overlay click to close
        this.addEventListener(this.container, 'click', (e) => {
            if (e.target === this.container) {
                this.hide();
            }
        });
        
        // ESC key to close
        this.addEventListener(document, 'keydown', (e) => {
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Escape' && this.container.style.display !== 'none') {
                this.hide();
            }
        });
    }
    
    private applySettings(): void {
        const minimapToggle = DOMUpdater.query<HTMLInputElement>(this.modal, '#settings-minimap-toggle');
        
        if (minimapToggle) {
            this.minimapEnabled = minimapToggle.checked;
            if (this.onMinimapToggle) {
                this.onMinimapToggle(this.minimapEnabled);
            }
        }
        
        this.hide();
    }
    
    public show(
        minimapEnabled: boolean,
        onMinimapToggle?: (enabled: boolean) => void
    ): void {
        this.minimapEnabled = minimapEnabled;
        this.onMinimapToggle = onMinimapToggle;
        
        // Update form values
        const minimapToggle = DOMUpdater.query<HTMLInputElement>(this.modal, '#settings-minimap-toggle');
        if (minimapToggle) minimapToggle.checked = minimapEnabled;
        
        this.container.style.display = 'flex';
    }
    
    public hide(): void {
        this.container.style.display = 'none';
    }
    
    public destroy(): void {
        // Remove modal container from body
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        // Call parent destroy to clean up event listeners
        super.destroy();
    }
}

