import { VisualBlock, VisualPort } from '../VisualModels';
import { Node } from '../../models/workflow-models';

/**
 * Base class for rendering blocks
 */
export abstract class BlockRenderer {
    protected block: VisualBlock;
    protected blockData?: Node;
    
    // Layout constants (can be overridden by subclasses)
    protected readonly HEADER_HEIGHT = 65;      // Header with icon and title
    protected readonly ROW_HEIGHT = 32;          // Each port row
    protected readonly ROW_PADDING = 8;          // Padding within row
    protected readonly PORT_CENTER_OFFSET = 16;  // Center of port within row
    
    constructor(block: VisualBlock, blockData?: Node) {
        this.block = block;
        this.blockData = blockData;
    }
    
    /**
     * Calculate Y position for a port at given index
     */
    protected calculatePortY(portIndex: number, extraOffset: number = 0): number {
        // Base: Header + any extra offset (like profile selector)
        const baseY = this.HEADER_HEIGHT + extraOffset;
        
        // Add: (portIndex * row height) + padding + center offset
        return baseY + (portIndex * this.ROW_HEIGHT) + this.ROW_PADDING + this.PORT_CENTER_OFFSET;
    }
    
    /**
     * Get block icon
     */
    protected abstract getIcon(): string;
    
    /**
     * Get block color
     */
    protected abstract getColor(): string;
    
    /**
     * Get block description
     */
    protected getDescription(): string {
        // V2: Description is not standard on Node, checking data or returning empty
        return (this.blockData as any)?.description || '';
    }
    
    /**
     * Render editable input rows (with input ports on left, no output ports)
     */
    protected renderEditableInputList(
        items: Record<string, any>,
        itemType: 'variable' | 'header' | 'output',
        blockId: string,
        portType: 'input' | 'output' = 'input'
    ): string {
        const itemEntries = Object.entries(items || {});
        
        if (itemEntries.length === 0) {
            return `
                <div class="block-inputs-empty">
                    <button class="btn-add-item-popup" data-block="${blockId}" data-item-type="${itemType}" data-port-type="${portType}" title="Add ${itemType} ${portType}">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                        </svg>
                        <span>Add ${portType === 'input' ? 'Input' : 'Output'}</span>
                    </button>
                </div>
            `;
        }
        
        return itemEntries.map(([itemName, itemValue]) => {
            const displayValue = typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue || '');
            const typeIcon = this.getTypeIconForValue(itemValue);
            const itemTypeValue = this.getTypeForValue(itemValue);
            
            return `
                <div class="block-input-row" data-item-name="${this.escapeHtml(itemName)}" data-item-type="${itemType}" data-port-type="${portType}">
                    <div class="port-input-tab" 
                         data-block="${blockId}" 
                         data-port="${this.escapeHtml(itemName)}"
                         data-port-type="${portType}"
                         data-value-type="${itemTypeValue}">
                        <span class="port-tab"></span>
                    </div>
                    <div class="input-name-field">
                        <input type="text" 
                               class="block-input-name" 
                               value="${this.escapeHtml(itemName)}" 
                               placeholder="${itemType} name"
                               data-original-name="${this.escapeHtml(itemName)}"
                               data-block="${blockId}"
                               data-item-type="${itemType}">
                    </div>
                    <div class="input-type-selector">
                        <button class="input-type-btn" 
                                data-block="${blockId}"
                                data-item-name="${this.escapeHtml(itemName)}"
                                data-item-type="${itemType}"
                                data-current-type="${itemTypeValue}"
                                title="Type: ${itemTypeValue}">
                            ${typeIcon}
                        </button>
                        <div class="input-type-dropdown" 
                             data-block="${blockId}"
                             data-item-name="${this.escapeHtml(itemName)}"
                             data-item-type="${itemType}">
                            ${this.renderTypeOptions(itemTypeValue)}
                        </div>
                    </div>
                    <div class="input-value-field">
                        <input type="text" 
                               class="block-input-value" 
                               value="${this.escapeHtml(displayValue)}" 
                               placeholder="Enter value or {{variable}}"
                               data-block="${blockId}"
                               data-item-name="${this.escapeHtml(itemName)}"
                               data-item-type="${itemType}">
                    </div>
                    <button class="btn-edit-input" 
                            data-block="${blockId}"
                            data-item-name="${this.escapeHtml(itemName)}"
                            data-item-type="${itemType}"
                            data-port-type="${portType}"
                            title="Edit ${itemType}">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286Z"/>
                        </svg>
                    </button>
                    <button class="btn-delete-input" 
                            data-block="${blockId}"
                            data-item-name="${this.escapeHtml(itemName)}"
                            data-item-type="${itemType}"
                            title="Delete ${itemType}">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('') + `
            <div class="block-add-input-row">
                <button class="btn-add-item-popup" data-block="${blockId}" data-item-type="${itemType}" data-port-type="${portType}" title="Add ${itemType} ${portType}">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                    </svg>
                    <span>Add ${portType === 'input' ? 'Input' : 'Output'}</span>
                </button>
            </div>
        `;
    }
    
    /**
     * Render editable output rows (with output ports on right, no input ports)
     */
    protected renderEditableOutputList(
        items: Record<string, any>,
        itemType: 'variable' | 'header' | 'output',
        blockId: string,
        portType: 'input' | 'output' = 'output'
    ): string {
        const itemEntries = Object.entries(items || {});
        
        if (itemEntries.length === 0) {
            return `
                <div class="block-inputs-empty">
                    <button class="btn-add-item-popup" data-block="${blockId}" data-item-type="${itemType}" data-port-type="${portType}" title="Add ${itemType} ${portType}">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                        </svg>
                        <span>Add ${portType === 'input' ? 'Input' : 'Output'}</span>
                    </button>
                </div>
            `;
        }
        
        return itemEntries.map(([itemName, itemValue]) => {
            const displayValue = typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue || '');
            const typeIcon = this.getTypeIconForValue(itemValue);
            const itemTypeValue = this.getTypeForValue(itemValue);
            
            return `
                <div class="block-input-row" data-item-name="${this.escapeHtml(itemName)}" data-item-type="${itemType}" data-port-type="${portType}">
                    <div class="input-name-field">
                        <input type="text" 
                               class="block-input-name" 
                               value="${this.escapeHtml(itemName)}" 
                               placeholder="${itemType} name"
                               data-original-name="${this.escapeHtml(itemName)}"
                               data-block="${blockId}"
                               data-item-type="${itemType}">
                    </div>
                    <div class="input-type-selector">
                        <button class="input-type-btn" 
                                data-block="${blockId}"
                                data-item-name="${this.escapeHtml(itemName)}"
                                data-item-type="${itemType}"
                                data-current-type="${itemTypeValue}"
                                title="Type: ${itemTypeValue}">
                            ${typeIcon}
                        </button>
                        <div class="input-type-dropdown" 
                             data-block="${blockId}"
                             data-item-name="${this.escapeHtml(itemName)}"
                             data-item-type="${itemType}">
                            ${this.renderTypeOptions(itemTypeValue)}
                        </div>
                    </div>
                    <div class="input-value-field">
                        <input type="text" 
                               class="block-input-value" 
                               value="${this.escapeHtml(displayValue)}" 
                               placeholder="Enter value or {{variable}}"
                               data-block="${blockId}"
                               data-item-name="${this.escapeHtml(itemName)}"
                               data-item-type="${itemType}">
                    </div>
                    <button class="btn-edit-input" 
                            data-block="${blockId}"
                            data-item-name="${this.escapeHtml(itemName)}"
                            data-item-type="${itemType}"
                            data-port-type="${portType}"
                            title="Edit ${itemType}">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286Z"/>
                        </svg>
                    </button>
                    <button class="btn-delete-input" 
                            data-block="${blockId}"
                            data-item-name="${this.escapeHtml(itemName)}"
                            data-item-type="${itemType}"
                            title="Delete ${itemType}">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                    <div class="port-output-tab" 
                         data-block="${blockId}" 
                         data-port="${this.escapeHtml(itemName)}"
                         data-port-type="${portType}"
                         data-value-type="${itemTypeValue}">
                        <span class="port-tab"></span>
                    </div>
                </div>
            `;
        }).join('') + `
            <div class="block-add-input-row">
                <button class="btn-add-item-popup" data-block="${blockId}" data-item-type="${itemType}" data-port-type="${portType}" title="Add ${itemType} ${portType}">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                    </svg>
                    <span>Add ${portType === 'input' ? 'Input' : 'Output'}</span>
                </button>
            </div>
        `;
    }
    
    /**
     * Get type icon for a value
     */
    protected getTypeIconForValue(value: any): string {
        return this.getTypeIcon(this.getTypeForValue(value));
    }
    
    /**
     * Get type for a value
     */
    protected getTypeForValue(value: any): string {
        if (value === null || value === undefined) return 'string';
        if (typeof value === 'number') return 'number';
        if (typeof value === 'boolean') return 'boolean';
        if (Array.isArray(value)) return 'array';
        if (typeof value === 'object') return 'object';
        return 'string';
    }
    
    /**
     * Get type icon for display
     */
    protected getTypeIcon(type: string): string {
        const typeIcons: Record<string, string> = {
            'string': 'Aa',
            'number': '#',
            'boolean': '0/1',
            'object': '{}',
            'array': '[]',
            'any': '*'
        };
        return typeIcons[type] || 'Aa';
    }
    
    /**
     * Render type options dropdown
     */
    protected renderTypeOptions(currentType: string): string {
        const types = [
            { value: 'string', icon: 'Aa', label: 'String' },
            { value: 'number', icon: '#', label: 'Number' },
            { value: 'boolean', icon: '0/1', label: 'Boolean' },
            { value: 'object', icon: '{}', label: 'Object' },
            { value: 'array', icon: '[]', label: 'Array' },
            { value: 'any', icon: '*', label: 'Any' }
        ];
        
        return types.map(type => `
            <div class="input-type-option ${type.value === currentType ? 'selected' : ''}" 
                 data-type="${type.value}">
                <span class="type-icon">${type.icon}</span>
                <span class="type-label">${type.label}</span>
            </div>
        `).join('');
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    protected escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Render custom content (override in subclasses)
     */
    protected renderCustomContent(): string {
        return '';
    }
    
    /**
     * Update block ports (override in subclasses)
     */
    public updatePorts(): void {
        // Default implementation - subclasses override
    }
    
    /**
     * Render a single port
     */
    protected renderPort(port: VisualPort, type: 'input' | 'output'): string {
        if (type === 'input') {
            // Input port: connector extends from left edge
            return `
                <div class="port-row port-input" 
                     data-block="${this.block.id}" 
                     data-port="${port.name}"
                     data-port-type="${type}"
                     data-value-type="${port.type}">
                    <span class="port-tab"></span>
                    <span class="port-name">${port.name}</span>
                </div>
            `;
        } else {
            // Output port: connector extends from right edge
            return `
                <div class="port-row port-output" 
                     data-block="${this.block.id}" 
                     data-port="${port.name}"
                     data-port-type="${type}"
                     data-value-type="${port.type}">
                    <span class="port-name">${port.name}</span>
                    <span class="port-tab"></span>
                </div>
            `;
        }
    }
    
    /**
     * Render input ports
     */
    protected renderInputPorts(): string {
        if (!this.block.inputPorts || this.block.inputPorts.length === 0) {
            return '';
        }
        
        return this.block.inputPorts.map(port => this.renderPort(port, 'input')).join('');
    }
    
    /**
     * Render output ports
     */
    protected renderOutputPorts(): string {
        if (!this.block.outputPorts || this.block.outputPorts.length === 0) {
            return '';
        }
        
        return this.block.outputPorts.map(port => this.renderPort(port, 'output')).join('');
    }
    
    /**
     * Render the complete block
     */
    public render(): string {
        const blockName = this.blockData?.label || this.block.id;
        const description = this.getDescription();
        
        return `
            <div class="block-header">
                <span class="block-icon">${this.getIcon()}</span>
                <div class="block-info">
                    <span class="block-name">${blockName}</span>
                    <span class="block-type">${this.block.type}</span>
                </div>
                <button class="block-delete-btn" data-block-id="${this.block.id}" data-testid="block-delete-btn" title="Delete block">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11 3.5v-1A1.5 1.5 0 0 0 9.5 1h-3A1.5 1.5 0 0 0 5 2.5v1H2v1h1v9.5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5V4.5h1v-1H11zm-6 10V6h1v7.5H5zm2.5 0V6h1v7.5h-1zm2.5 0V6h1v7.5H10zM6 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1H6v-1z"/>
                    </svg>
                </button>
            </div>
            ${description ? `<div class="block-description">${description}</div>` : ''}
            ${this.renderCustomContent()}
            <div class="block-ports-area">
                ${this.renderInputPorts()}
                ${this.renderOutputPorts()}
            </div>
        `;
    }
}
