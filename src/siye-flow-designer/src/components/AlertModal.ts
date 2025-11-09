/**
 * AlertModal - A clean popup modal for showing alert messages (replaces browser alert)
 */
export class AlertModal {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onClose?: () => void;
    
    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'alert-modal-overlay';
        this.overlay.style.display = 'none';
        
        this.modal = document.createElement('div');
        this.modal.className = 'alert-modal';
        
        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);
        
        this.setupModal();
        this.setupEventHandlers();
    }
    
    private setupModal(): void {
        this.modal.innerHTML = `
            <div class="alert-modal-header">
                <h3 class="alert-modal-title">Information</h3>
                <button class="alert-modal-close" title="Close">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
            </div>
            <div class="alert-modal-body">
                <p class="alert-modal-message"></p>
            </div>
            <div class="alert-modal-footer">
                <button class="alert-btn alert-btn-primary">OK</button>
            </div>
        `;
    }
    
    private setupEventHandlers(): void {
        // OK button
        this.modal.querySelector('.alert-btn-primary')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Close button
        this.modal.querySelector('.alert-modal-close')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Close on overlay click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.style.display === 'flex') {
                this.hide();
            }
        });
    }
    
    /**
     * Show alert modal with message
     */
    public show(message: string, title: string = 'Information', type: 'info' | 'success' | 'error' | 'warning' = 'info', onClose?: () => void): void {
        const messageEl = this.modal.querySelector('.alert-modal-message');
        const titleEl = this.modal.querySelector('.alert-modal-title');
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        if (titleEl) {
            titleEl.textContent = title;
        }
        
        // Update modal class based on type
        this.modal.className = `alert-modal alert-modal-${type}`;
        
        this.onClose = onClose;
        this.overlay.style.display = 'flex';
        
        // Focus OK button
        setTimeout(() => {
            const okBtn = this.modal.querySelector('.alert-btn-primary') as HTMLButtonElement;
            okBtn?.focus();
        }, 100);
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
}

