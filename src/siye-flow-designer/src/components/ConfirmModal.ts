/**
 * ConfirmModal - A clean popup modal for confirmations
 */
export class ConfirmModal {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onConfirm?: () => void;
    private onCancel?: () => void;
    
    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'confirm-modal-overlay';
        this.overlay.style.display = 'none';
        
        this.modal = document.createElement('div');
        this.modal.className = 'confirm-modal';
        
        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);
        
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
                <button class="confirm-btn confirm-btn-cancel">Cancel</button>
                <button class="confirm-btn confirm-btn-primary">Confirm</button>
            </div>
        `;
    }
    
    private setupEventHandlers(): void {
        // Cancel button
        this.modal.querySelector('.confirm-btn-cancel')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Confirm button
        this.modal.querySelector('.confirm-btn-primary')?.addEventListener('click', () => {
            if (this.onConfirm) {
                this.onConfirm();
            }
            this.hide();
        });
        
        // Overlay click to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display === 'flex') {
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
        
        // Update content
        const titleElement = this.modal.querySelector('.confirm-modal-title');
        const messageElement = this.modal.querySelector('.confirm-modal-message');
        const confirmBtn = this.modal.querySelector('.confirm-btn-primary') as HTMLButtonElement;
        const cancelBtn = this.modal.querySelector('.confirm-btn-cancel') as HTMLButtonElement;
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;
        if (confirmBtn) confirmBtn.textContent = confirmText;
        if (cancelBtn) cancelBtn.textContent = cancelText;
        
        // Show modal
        this.overlay.style.display = 'flex';
        
        // Focus confirm button
        setTimeout(() => {
            confirmBtn?.focus();
        }, 100);
    }
    
    public hide(): void {
        this.overlay.style.display = 'none';
        if (this.onCancel) {
            this.onCancel();
        }
    }
}

