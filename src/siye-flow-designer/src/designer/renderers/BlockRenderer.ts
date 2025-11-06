import { VisualBlock, VisualPort } from '../VisualModels';
import { AnyWorkflowBlock } from '../../models/workflow-models';

/**
 * Base class for rendering blocks
 */
export abstract class BlockRenderer {
    protected block: VisualBlock;
    protected blockData?: AnyWorkflowBlock;
    
    // Layout constants (can be overridden by subclasses)
    protected readonly HEADER_HEIGHT = 65;      // Header with icon and title
    protected readonly ROW_HEIGHT = 32;          // Each port row
    protected readonly ROW_PADDING = 8;          // Padding within row
    protected readonly PORT_CENTER_OFFSET = 16;  // Center of port within row
    
    constructor(block: VisualBlock, blockData?: AnyWorkflowBlock) {
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
        return this.blockData?.description || '';
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
        const blockName = this.blockData?.name || this.block.id;
        const description = this.getDescription();
        
        return `
            <div class="block-header">
                <span class="block-icon">${this.getIcon()}</span>
                <div class="block-info">
                    <span class="block-name">${blockName}</span>
                    <span class="block-type">${this.block.type}</span>
                </div>
                <button class="block-delete-btn" data-block-id="${this.block.id}" title="Delete block">
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

