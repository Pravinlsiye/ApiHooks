/**
 * AlertModal - A clean popup modal for showing alert messages (replaces browser alert)
 */

import { BaseComponent } from '../utils/base-component';
import { DOMUpdater } from '../utils/dom-updater';

export type AlertType = 'info' | 'success' | 'error' | 'warning';

export class AlertModal extends BaseComponent {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onClose?: () => void;
    
    constructor() {
        // Create a unique container ID for this modal instance
        const containerId = `alert-modal-${Date.now()}`;
        const container = DOMUpdater.create('div', { id: containerId });
        document.body.appendChild(container);
        
        super(containerId);
        
        this.overlay = DOMUpdater.create('div', { 
            className: 'modal-overlay alert-modal-overlay',
            styles: { display: 'none' }
        });
        
        this.modal = DOMUpdater.create('div', { className: 'modal alert-modal' });
        
        this.overlay.appendChild(this.modal);
        this.container.appendChild(this.overlay);
        
        this.setupModal();
        this.setupEventHandlers();
    }
    
    private setupModal(): void {
        DOMUpdater.updateElement(this.modal, {
            html: `
                <div class="modal-header">
                    <h3 class="modal-title">Information</h3>
                    <button class="modal-close" title="Close">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="modal-icon"></div>
                    <p class="modal-message"></p>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-primary">OK</button>
                </div>
            `
        });
    }
    
    private setupEventHandlers(): void {
        // OK button
        const okBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.modal-btn-primary');
        if (okBtn) {
            this.addEventListener(okBtn, 'click', () => this.hide());
        }
        
        // Close button
        const closeBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.modal-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => this.hide());
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
    
    private getIconSvg(type: AlertType): string {
        const icons: Record<AlertType, string> = {
            info: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>`,
            success: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
            warning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
            error: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`
        };
        return icons[type];
    }
    
    /**
     * Show alert modal with message
     */
    public show(
        message: string, 
        title: string = 'Information', 
        type: AlertType = 'info', 
        onClose?: () => void
    ): void {
        const messageEl = DOMUpdater.query<HTMLElement>(this.modal, '.modal-message');
        const titleEl = DOMUpdater.query<HTMLElement>(this.modal, '.modal-title');
        const iconEl = DOMUpdater.query<HTMLElement>(this.modal, '.modal-icon');
        
        if (messageEl) DOMUpdater.updateElement(messageEl, { text: message });
        if (titleEl) DOMUpdater.updateElement(titleEl, { text: title });
        if (iconEl) DOMUpdater.updateElement(iconEl, { html: this.getIconSvg(type) });
        
        // Update modal class based on type
        DOMUpdater.updateElement(this.modal, { 
            classes: ['modal', 'alert-modal', `alert-modal-${type}`] 
        });
        
        this.onClose = onClose;
        DOMUpdater.updateElement(this.overlay, { styles: { display: 'flex' } });
        
        // Focus OK button
        setTimeout(() => {
            const okBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.modal-btn-primary');
            okBtn?.focus();
        }, 100);
    }
    
    /**
     * Hide the modal
     */
    public hide(): void {
        DOMUpdater.updateElement(this.overlay, { styles: { display: 'none' } });
        if (this.onClose) {
            this.onClose();
            this.onClose = undefined;
        }
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

