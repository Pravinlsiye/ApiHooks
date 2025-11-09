/**
 * SettingsModal - A modal for workflow designer settings
 */
export class SettingsModal {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private minimapEnabled: boolean = true;
    private canvasWidth: number = 4000;
    private canvasHeight: number = 4000;
    private onMinimapToggle?: (enabled: boolean) => void;
    private onCanvasSizeChange?: (width: number, height: number) => void;
    
    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'settings-modal-overlay';
        this.overlay.style.display = 'none';
        
        this.modal = document.createElement('div');
        this.modal.className = 'settings-modal';
        
        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);
        
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
                <div class="settings-section">
                    <h4 class="settings-section-title">Canvas Size</h4>
                    <div class="settings-item">
                        <label class="settings-label">
                            <span>Width (px)</span>
                            <input type="number" id="settings-canvas-width" class="settings-input" value="${this.canvasWidth}" min="1000" max="10000" step="1000">
                        </label>
                    </div>
                    <div class="settings-item">
                        <label class="settings-label">
                            <span>Height (px)</span>
                            <input type="number" id="settings-canvas-height" class="settings-input" value="${this.canvasHeight}" min="1000" max="10000" step="1000">
                        </label>
                    </div>
                    <div class="settings-presets">
                        <button class="settings-preset-btn" data-width="2000" data-height="2000">Small (2000x2000)</button>
                        <button class="settings-preset-btn" data-width="4000" data-height="4000">Medium (4000x4000)</button>
                        <button class="settings-preset-btn" data-width="6000" data-height="6000">Large (6000x6000)</button>
                        <button class="settings-preset-btn" data-width="8000" data-height="8000">Extra Large (8000x8000)</button>
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
        this.modal.querySelector('.settings-modal-close')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Cancel button
        this.modal.querySelector('.settings-btn-cancel')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Apply button
        this.modal.querySelector('.settings-btn-primary')?.addEventListener('click', () => {
            this.applySettings();
        });
        
        // Overlay click to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // Preset buttons
        this.modal.querySelectorAll('.settings-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const width = parseInt((btn as HTMLElement).dataset.width || '4000');
                const height = parseInt((btn as HTMLElement).dataset.height || '4000');
                const widthInput = this.modal.querySelector('#settings-canvas-width') as HTMLInputElement;
                const heightInput = this.modal.querySelector('#settings-canvas-height') as HTMLInputElement;
                if (widthInput) widthInput.value = width.toString();
                if (heightInput) heightInput.value = height.toString();
            });
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display === 'flex') {
                this.hide();
            }
        });
    }
    
    private applySettings(): void {
        const minimapToggle = this.modal.querySelector('#settings-minimap-toggle') as HTMLInputElement;
        const widthInput = this.modal.querySelector('#settings-canvas-width') as HTMLInputElement;
        const heightInput = this.modal.querySelector('#settings-canvas-height') as HTMLInputElement;
        
        const minimapEnabled = minimapToggle?.checked ?? true;
        const width = parseInt(widthInput?.value || '4000');
        const height = parseInt(heightInput?.value || '4000');
        
        if (this.onMinimapToggle) {
            this.onMinimapToggle(minimapEnabled);
        }
        
        if (this.onCanvasSizeChange) {
            this.onCanvasSizeChange(width, height);
        }
        
        this.hide();
    }
    
    public show(
        minimapEnabled: boolean,
        canvasWidth: number,
        canvasHeight: number,
        onMinimapToggle?: (enabled: boolean) => void,
        onCanvasSizeChange?: (width: number, height: number) => void
    ): void {
        this.minimapEnabled = minimapEnabled;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.onMinimapToggle = onMinimapToggle;
        this.onCanvasSizeChange = onCanvasSizeChange;
        
        // Update form values
        const minimapToggle = this.modal.querySelector('#settings-minimap-toggle') as HTMLInputElement;
        const widthInput = this.modal.querySelector('#settings-canvas-width') as HTMLInputElement;
        const heightInput = this.modal.querySelector('#settings-canvas-height') as HTMLInputElement;
        
        if (minimapToggle) minimapToggle.checked = minimapEnabled;
        if (widthInput) widthInput.value = canvasWidth.toString();
        if (heightInput) heightInput.value = canvasHeight.toString();
        
        this.overlay.style.display = 'flex';
    }
    
    public hide(): void {
        this.overlay.style.display = 'none';
    }
}

