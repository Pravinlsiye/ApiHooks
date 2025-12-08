/**
 * ConfirmModal - A clean popup modal for confirmations
 */

import { BaseComponent } from '../utils/base-component';
import { DOMUpdater } from '../utils/dom-updater';

export class ConfirmModal extends BaseComponent {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onConfirm?: () => void;
    private onCancel?: () => void;
    
    constructor() {
        // Create a unique container ID for this modal instance
        const containerId = `confirm-modal-${Date.now()}`;
        const container = DOMUpdater.create('div', { id: containerId });
        document.body.appendChild(container);
        
        super(containerId);
        
        this.overlay = DOMUpdater.create('div', { 
            className: 'modal-overlay confirm-modal-overlay',
            styles: { display: 'none' }
        });
        
        this.modal = DOMUpdater.create('div', { className: 'modal confirm-modal' });
        
        this.overlay.appendChild(this.modal);
        this.container.appendChild(this.overlay);
        
        this.setupModal();
        this.setupEventHandlers();
    }
    
    private setupModal(): void {
        DOMUpdater.updateElement(this.modal, {
            html: `
                <div class="modal-header">
                    <h3 class="modal-title">Confirm</h3>
                    <button class="modal-close" title="Close">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="modal-message"></p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-cancel">Cancel</button>
                    <button class="modal-btn modal-btn-primary">Confirm</button>
                </div>
            `
        });
    }
    
    private setupEventHandlers(): void {
        // Cancel button
        const cancelBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.modal-btn-cancel');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => this.hide(false));
        }
        
        // Confirm button
        const confirmBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.modal-btn-primary');
        if (confirmBtn) {
            this.addEventListener(confirmBtn, 'click', () => {
                if (this.onConfirm) {
                    this.onConfirm();
                }
                this.hide(true);
            });
        }
        
        // Close button
        const closeBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.modal-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.hide(false));
        }
        
        // Overlay click to close
        this.addEventListener(this.overlay, 'click', (e) => {
            if (e.target === this.overlay) {
                this.hide(false);
            }
        });
        
        // Escape key to close
        this.addEventListener(document, 'keydown', (e) => {
            const keyEvent = e as KeyboardEvent;
            if (keyEvent.key === 'Escape' && this.overlay.style.display === 'flex') {
                this.hide(false);
            }
        });
    }
    
    /**
     * Show confirm modal
     */
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
        
        const titleEl = DOMUpdater.query<HTMLElement>(this.modal, '.modal-title');
        const messageEl = DOMUpdater.query<HTMLElement>(this.modal, '.modal-message');
        const confirmBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.modal-btn-primary');
        const cancelBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.modal-btn-cancel');
        
        if (titleEl) DOMUpdater.updateElement(titleEl, { text: title });
        if (messageEl) DOMUpdater.updateElement(messageEl, { text: message });
        if (confirmBtn) DOMUpdater.updateElement(confirmBtn, { text: confirmText });
        if (cancelBtn) DOMUpdater.updateElement(cancelBtn, { text: cancelText });
        
        DOMUpdater.updateElement(this.overlay, { styles: { display: 'flex' } });
        
        // Focus confirm button
        setTimeout(() => {
            confirmBtn?.focus();
        }, 100);
    }
    
    /**
     * Show as a promise (async/await friendly)
     */
    public async showAsync(
        message: string,
        title: string = 'Confirm',
        confirmText: string = 'Confirm',
        cancelText: string = 'Cancel'
    ): Promise<boolean> {
        return new Promise((resolve) => {
            this.show(
                message,
                title,
                confirmText,
                cancelText,
                () => resolve(true),
                () => resolve(false)
            );
        });
    }
    
    /**
     * Hide the modal
     */
    public hide(confirmed: boolean = false): void {
        DOMUpdater.updateElement(this.overlay, { styles: { display: 'none' } });
        if (!confirmed && this.onCancel) {
            this.onCancel();
        }
        this.onConfirm = undefined;
        this.onCancel = undefined;
    }
    
    /**
     * Check if modal is visible
     */
    public isVisible(): boolean {
        return this.overlay.style.display === 'flex';
    }
    
    destroy(): void {
        if (this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }
        super.destroy();
    }
}
