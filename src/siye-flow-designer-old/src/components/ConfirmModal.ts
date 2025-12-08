import { BaseComponent } from '../utils/BaseComponent';
import { DOMUpdater } from '../utils/DOMUpdater';

/**
 * ConfirmModal - A clean popup modal for confirmations
 * Now extends BaseComponent for automatic cleanup
 */
export class ConfirmModal extends BaseComponent {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onConfirm?: () => void;
    private onCancel?: () => void;
    
    constructor() {
        // Create a unique container ID for this modal instance
        const containerId = `confirm-modal-${Date.now()}`;
        const container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
        
        super(containerId);
        
        this.overlay = this.createElement('div', { className: 'confirm-modal-overlay' });
        this.overlay.style.display = 'none';
        
        this.modal = this.createElement('div', { className: 'confirm-modal' });
        
        this.overlay.appendChild(this.modal);
        this.container.appendChild(this.overlay);
        
        this.setupModal();
        this.setupEventHandlers();
    }
    
    private setupModal(): void {
        this.modal.innerHTML = `
            <div class="confirm-modal-header">
                <h3 class="confirm-modal-title">Confirm</h3>
            </div>
            <div class="confirm-modal-body">
                <p class="confirm-modal-message"></p>
            </div>
            <div class="confirm-modal-footer">
                <button class="confirm-btn confirm-btn-cancel" data-testid="confirm-modal-cancel">Cancel</button>
                <button class="confirm-btn confirm-btn-primary" data-testid="confirm-modal-confirm">Confirm</button>
            </div>
        `;
    }
    
    private setupEventHandlers(): void {
        // Cancel button
        const cancelBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.confirm-btn-cancel');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => {
                this.hide();
            });
        }
        
        // Confirm button
        const confirmBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.confirm-btn-primary');
        if (confirmBtn) {
            this.addEventListener(confirmBtn, 'click', () => {
                if (this.onConfirm) {
                    this.onConfirm();
                }
                this.hide();
            });
        }
        
        // Overlay click to close
        this.addEventListener(this.overlay, 'click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // Escape key to close
        this.addEventListener(document, 'keydown', (e) => {
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Escape' && this.overlay.style.display === 'flex') {
                this.hide();
            }
        });
    }
    
    public show(
        message: string,
        title: string = 'Confirm',
        confirmText: string = 'Confirm',
        cancelText: string = 'Cancel',
        onConfirm?: () => void,
        onCancel?: () => void
    ): void {
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        
        // Update content using DOMUpdater
        const titleElement = DOMUpdater.query<HTMLElement>(this.modal, '.confirm-modal-title');
        const messageElement = DOMUpdater.query<HTMLElement>(this.modal, '.confirm-modal-message');
        const confirmBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.confirm-btn-primary');
        const cancelBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.confirm-btn-cancel');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        if (confirmBtn) confirmBtn.textContent = confirmText;
        if (cancelBtn) cancelBtn.textContent = cancelText;
        
        // Show modal
        this.overlay.style.display = 'flex';
        
        // Focus confirm button with timeout cleanup tracking
        const timeoutId = setTimeout(() => {
            confirmBtn?.focus();
        }, 100);
        
        // Register cleanup for timeout
        this.registerCleanup(() => {
            clearTimeout(timeoutId);
        });
    }
    
    public hide(): void {
        this.overlay.style.display = 'none';
        if (this.onCancel) {
            this.onCancel();
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

