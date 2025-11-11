import { BaseComponent } from '../utils/BaseComponent';
import { DOMUpdater } from '../utils/DOMUpdater';

/**
 * AddItemModal - A clean popup modal for adding inputs/outputs to blocks
 * Now extends BaseComponent for automatic cleanup
 */
export class AddItemModal extends BaseComponent {
    private overlay: HTMLElement;
    private modal: HTMLElement;
    private onConfirm?: (name: string, type: string, value: string) => void;
    private onCancel?: () => void;
    
    constructor() {
        // Create a unique container ID for this modal instance
        const containerId = `add-item-modal-${Date.now()}`;
        const container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);
        
        super(containerId);
        
        this.overlay = this.createElement('div', { className: 'add-item-modal-overlay' });
        this.overlay.style.display = 'none';
        
        this.modal = this.createElement('div', { className: 'add-item-modal' });
        
        this.overlay.appendChild(this.modal);
        this.container.appendChild(this.overlay);
        
        this.setupModal();
        this.setupEventHandlers();
    }
    
    private setupModal(): void {
        this.modal.innerHTML = `
            <div class="add-item-modal-header">
                <h3 class="add-item-modal-title">Add Item</h3>
                <button class="add-item-modal-close" data-testid="add-item-modal-close" title="Close">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                    </svg>
                </button>
            </div>
            <div class="add-item-modal-body">
                <div class="add-item-form-group">
                    <label class="add-item-label">Name</label>
                    <input type="text" class="add-item-input" id="add-item-name" data-testid="add-item-name-input" placeholder="Enter name" autofocus>
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
                        <button class="add-item-type-btn" data-type="string" data-testid="add-item-type-string" title="String">
                            <span class="type-icon">Aa</span>
                            <span class="type-label">String</span>
                        </button>
                        <button class="add-item-type-btn" data-type="number" data-testid="add-item-type-number" title="Number">
                            <span class="type-icon">123</span>
                            <span class="type-label">Number</span>
                        </button>
                        <button class="add-item-type-btn" data-type="boolean" data-testid="add-item-type-boolean" title="Boolean">
                            <span class="type-icon">✓</span>
                            <span class="type-label">Boolean</span>
                        </button>
                        <button class="add-item-type-btn" data-type="array" data-testid="add-item-type-array" title="Array">
                            <span class="type-icon">[]</span>
                            <span class="type-label">Array</span>
                        </button>
                        <button class="add-item-type-btn" data-type="object" data-testid="add-item-type-object" title="Object">
                            <span class="type-icon">{}</span>
                            <span class="type-label">Object</span>
                        </button>
                    </div>
                </div>
                <div class="add-item-form-group">
                    <label class="add-item-label">Value</label>
                    <input type="text" class="add-item-input" id="add-item-value" data-testid="add-item-value-input" placeholder="Enter value or {{variable}}">
                </div>
            </div>
            <div class="add-item-modal-footer">
                <button class="add-item-btn add-item-btn-cancel" data-testid="add-item-modal-cancel">Cancel</button>
                <button class="add-item-btn add-item-btn-primary" data-testid="add-item-modal-confirm">Add</button>
            </div>
        `;
    }
    
    private setupEventHandlers(): void {
        // Close button
        const closeBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.add-item-modal-close');
        if (closeBtn) {
            this.addEventListener(closeBtn, 'click', () => {
                this.hide();
            });
        }
        
        // Cancel button
        const cancelBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.add-item-btn-cancel');
        if (cancelBtn) {
            this.addEventListener(cancelBtn, 'click', () => {
                this.hide();
            });
        }
        
        // Overlay click to close
        this.addEventListener(this.overlay, 'click', (e) => {
            if (e.target === this.overlay) {
                this.hide();
            }
        });
        
        // Type selector buttons
        const typeButtons = DOMUpdater.queryAll<HTMLButtonElement>(this.modal, '.add-item-type-btn');
        typeButtons.forEach(btn => {
            this.addEventListener(btn, 'click', () => {
                typeButtons.forEach(b => {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
            });
        });
        
        // Add button
        const addBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.add-item-btn-primary');
        if (addBtn) {
            this.addEventListener(addBtn, 'click', () => {
                const nameInput = DOMUpdater.query<HTMLInputElement>(this.modal, '#add-item-name');
                const valueInput = DOMUpdater.query<HTMLInputElement>(this.modal, '#add-item-value');
                const selectedTypeBtn = DOMUpdater.query<HTMLElement>(this.modal, '.add-item-type-btn.selected');
                
                const name = nameInput?.value.trim();
                const value = valueInput?.value.trim() || '';
                const type = selectedTypeBtn?.dataset.type || 'string';
                
                if (name && this.onConfirm) {
                    this.onConfirm(name, type, value);
                    this.hide();
                }
            });
        }
        
        // Enter key to submit
        const inputs = DOMUpdater.queryAll<HTMLInputElement>(this.modal, '.add-item-input');
        inputs.forEach(input => {
            this.addEventListener(input, 'keydown', (e) => {
                const keyEvent = e as KeyboardEvent;
                if (keyEvent.key === 'Enter') {
                    const addBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.add-item-btn-primary');
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
        const title = DOMUpdater.query<HTMLElement>(this.modal, '.add-item-modal-title');
        if (title) {
            title.textContent = isEditMode ? `Edit ${itemType} ${portType}` : `Add ${itemType} ${portType}`;
        }
        
        // Update button text
        const addBtn = DOMUpdater.query<HTMLButtonElement>(this.modal, '.add-item-btn-primary');
        if (addBtn) {
            addBtn.textContent = isEditMode ? 'Save' : 'Add';
        }
        
        // Fill form
        const nameInput = DOMUpdater.query<HTMLInputElement>(this.modal, '#add-item-name');
        const valueInput = DOMUpdater.query<HTMLInputElement>(this.modal, '#add-item-value');
        if (nameInput) {
            nameInput.value = existingName || '';
            nameInput.disabled = isEditMode; // Disable name editing in edit mode
        }
        if (valueInput) {
            valueInput.value = existingValue || '';
        }
        
        // Select type
        const typeToSelect = existingType || 'string';
        const typeButtons = DOMUpdater.queryAll<HTMLElement>(this.modal, '.add-item-type-btn');
        typeButtons.forEach(b => {
            b.classList.remove('selected');
            if (b.dataset.type === typeToSelect) {
                b.classList.add('selected');
            }
        });
        
        // Show modal
        this.overlay.style.display = 'flex';
        
        // Focus appropriate input with timeout cleanup tracking
        const timeoutId = setTimeout(() => {
            if (isEditMode) {
                valueInput?.focus();
            } else {
                nameInput?.focus();
            }
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

