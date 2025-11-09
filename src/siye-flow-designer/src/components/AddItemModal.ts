/**
 * AddItemModal - A clean popup modal for adding inputs/outputs to blocks
 */
export class AddItemModal {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onConfirm?: (name: string, type: string, value: string) => void;
    private onCancel?: () => void;
    
    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'add-item-modal-overlay';
        this.overlay.style.display = 'none';
        
        this.modal = document.createElement('div');
        this.modal.className = 'add-item-modal';
        
        this.overlay.appendChild(this.modal);
        document.body.appendChild(this.overlay);
        
        this.setupModal();
        this.setupEventHandlers();
    }
    
    private setupModal(): void {
        this.modal.innerHTML = `
            <div class="add-item-modal-header">
                <h3 class="add-item-modal-title">Add Item</h3>
                <button class="add-item-modal-close" title="Close">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
            </div>
            <div class="add-item-modal-body">
                <div class="add-item-form-group">
                    <label class="add-item-label">Name</label>
                    <input type="text" class="add-item-input" id="add-item-name" placeholder="Enter name" autofocus>
                </div>
                <style>
                    .add-item-input:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                </style>
                <div class="add-item-form-group">
                    <label class="add-item-label">Type</label>
                    <div class="add-item-type-selector">
                        <button class="add-item-type-btn" data-type="string" title="String">
                            <span class="type-icon">Aa</span>
                            <span class="type-label">String</span>
                        </button>
                        <button class="add-item-type-btn" data-type="number" title="Number">
                            <span class="type-icon">123</span>
                            <span class="type-label">Number</span>
                        </button>
                        <button class="add-item-type-btn" data-type="boolean" title="Boolean">
                            <span class="type-icon">✓</span>
                            <span class="type-label">Boolean</span>
                        </button>
                        <button class="add-item-type-btn" data-type="array" title="Array">
                            <span class="type-icon">[]</span>
                            <span class="type-label">Array</span>
                        </button>
                        <button class="add-item-type-btn" data-type="object" title="Object">
                            <span class="type-icon">{}</span>
                            <span class="type-label">Object</span>
                        </button>
                    </div>
                </div>
                <div class="add-item-form-group">
                    <label class="add-item-label">Value</label>
                    <input type="text" class="add-item-input" id="add-item-value" placeholder="Enter value or {{variable}}">
                </div>
            </div>
            <div class="add-item-modal-footer">
                <button class="add-item-btn add-item-btn-cancel">Cancel</button>
                <button class="add-item-btn add-item-btn-primary">Add</button>
            </div>
        `;
    }
    
    private setupEventHandlers(): void {
        // Close button
        this.modal.querySelector('.add-item-modal-close')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Cancel button
        this.modal.querySelector('.add-item-btn-cancel')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Overlay click to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // Type selector buttons
        this.modal.querySelectorAll('.add-item-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.modal.querySelectorAll('.add-item-type-btn').forEach(b => {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
            });
        });
        
        // Add button
        this.modal.querySelector('.add-item-btn-primary')?.addEventListener('click', () => {
            const nameInput = this.modal.querySelector('#add-item-name') as HTMLInputElement;
            const valueInput = this.modal.querySelector('#add-item-value') as HTMLInputElement;
            const selectedTypeBtn = this.modal.querySelector('.add-item-type-btn.selected') as HTMLElement;
            
            const name = nameInput?.value.trim();
            const value = valueInput?.value.trim() || '';
            const type = selectedTypeBtn?.dataset.type || 'string';
            
            if (name && this.onConfirm) {
                this.onConfirm(name, type, value);
                this.hide();
            }
        });
        
        // Enter key to submit
        this.modal.querySelectorAll('.add-item-input').forEach(input => {
            input.addEventListener('keydown', (e) => {
                const keyEvent = e as KeyboardEvent;
                if (keyEvent.key === 'Enter') {
                    const addBtn = this.modal.querySelector('.add-item-btn-primary') as HTMLButtonElement;
                    addBtn?.click();
                }
            });
        });
    }
    
    public show(
        itemType: string,
        portType: 'input' | 'output',
        onConfirm: (name: string, type: string, value: string) => void,
        existingName?: string,
        existingType?: string,
        existingValue?: string,
        onCancel?: () => void
    ): void {
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        
        const isEditMode = !!existingName;
        
        // Update title
        const title = this.modal.querySelector('.add-item-modal-title');
        if (title) {
            title.textContent = isEditMode ? `Edit ${itemType} ${portType}` : `Add ${itemType} ${portType}`;
        }
        
        // Update button text
        const addBtn = this.modal.querySelector('.add-item-btn-primary') as HTMLButtonElement;
        if (addBtn) {
            addBtn.textContent = isEditMode ? 'Save' : 'Add';
        }
        
        // Fill form
        const nameInput = this.modal.querySelector('#add-item-name') as HTMLInputElement;
        const valueInput = this.modal.querySelector('#add-item-value') as HTMLInputElement;
        if (nameInput) {
            nameInput.value = existingName || '';
            nameInput.disabled = isEditMode; // Disable name editing in edit mode
        }
        if (valueInput) {
            valueInput.value = existingValue || '';
        }
        
        // Select type
        const typeToSelect = existingType || 'string';
        this.modal.querySelectorAll('.add-item-type-btn').forEach(b => {
            b.classList.remove('selected');
            if ((b as HTMLElement).dataset.type === typeToSelect) {
                b.classList.add('selected');
            }
        });
        
        // Show modal
        this.overlay.style.display = 'flex';
        
        // Focus appropriate input
        setTimeout(() => {
            if (isEditMode) {
                valueInput?.focus();
            } else {
                nameInput?.focus();
            }
        }, 100);
    }
    
    public hide(): void {
        this.overlay.style.display = 'none';
        if (this.onCancel) {
            this.onCancel();
        }
    }
}

