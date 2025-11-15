import { BaseComponent } from '../utils/BaseComponent';
import { DOMUpdater } from '../utils/DOMUpdater';

/**
 * AlertModal - A clean popup modal for showing alert messages (replaces browser alert)
 * Now extends BaseComponent for automatic cleanup
 */
export class AlertModal extends BaseComponent {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onClose?: () => void;
    
    constructor() {
        // Create a unique container ID for this modal instance
        const containerId = `alert-modal-${Date.now()}`;
        const container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
        
        super(containerId);
        
        this.overlay = this.createElement('div', { className: 'alert-modal-overlay' });
        this.overlay.style.display = 'none';
        
        this.modal = this.createElement('div', { className: 'alert-modal' });
        
        this.overlay.appendChild(this.modal);
        this.container.appendChild(this.overlay);
        
        this.setupModal();
        this.setupEventHandlers();
    }
    
    private setupModal(): void {
        this.modal.innerHTML = `
            <div class="alert-modal-header">
                <h3 class="alert-modal-title">Information</h3>
                <button class="alert-modal-close" data-testid="alert-modal-close" title="Close">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
            </div>
            <div class="alert-modal-body">
                <p class="alert-modal-message"></p>
            </div>
            <div class="alert-modal-footer">
                <button class="alert-btn alert-btn-primary" data-testid="alert-modal-ok">OK</button>
            </div>
        `;
    }
    
    private setupEventHandlers(): void {
        // OK button
        const okBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.alert-btn-primary');
        if (okBtn) {
            this.addEventListener(okBtn, 'click', () => {
                this.hide();
            });
        }
        
        // Close button
        const closeBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.alert-modal-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => {
                this.hide();
            });
        }
        
        // Close on overlay click
        this.addEventListener(this.overlay, 'click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // Close on Escape key
        this.addEventListener(document, 'keydown', (e) => {
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Escape' && this.overlay.style.display === 'flex') {
                this.hide();
            }
        });
    }
    
    /**
     * Show alert modal with message
     */
    public show(message: string, title: string = 'Information', type: 'info' | 'success' | 'error' | 'warning' = 'info', onClose?: () => void): void {
        const messageEl = DOMUpdater.query<HTMLElement>(this.modal, '.alert-modal-message');
        const titleEl = DOMUpdater.query<HTMLElement>(this.modal, '.alert-modal-title');
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        if (titleEl) {
            titleEl.textContent = title;
        }
        
        // Update modal class based on type
        DOMUpdater.updateElement(this.modal, {
            classes: [`alert-modal`, `alert-modal-${type}`]
        });
        
        this.onClose = onClose;
        this.overlay.style.display = 'flex';
        
        // Focus OK button with timeout cleanup tracking
        const timeoutId = setTimeout(() => {
            const okBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.alert-btn-primary');
            okBtn?.focus();
        }, 100);
        
        // Register cleanup for timeout
        this.registerCleanup(() => {
            clearTimeout(timeoutId);
        });
    }
    
    /**
     * Hide the modal
     */
    public hide(): void {
        this.overlay.style.display = 'none';
        if (this.onClose) {
            this.onClose();
            this.onClose = undefined;
        }
    }
    
    destroy(): void {
        // Remove overlay from body before calling super.destroy()
        if (this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }
        super.destroy();
    }
}

