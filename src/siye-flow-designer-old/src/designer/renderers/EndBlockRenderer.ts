import { BlockRenderer } from './BlockRenderer';
import { VisualBlock } from '../VisualModels';
import { Node } from '../../models/workflow-models';
import { getIconSvg } from '../../utils/Icons';

/**
 * Renderer for End blocks with editable outputs (mirroring Start block structure)
 */
export class EndBlockRenderer extends BlockRenderer {
    
    constructor(block: VisualBlock, blockData?: Node) {
        super(block, blockData);
    }
    
    protected getIcon(): string {
        return getIconSvg('end');
    }
    
    protected getColor(): string {
        return '#f44336';
    }
    
    protected getDescription(): string {
        return 'Workflow exit point';
    }
    
    /**
     * Update ports based on outputs configuration
     */
    public updatePorts(): void {
        const endBlock = this.blockData;
        if (!endBlock || !endBlock.data) return;
        
        const effectiveOutputs = this.getEffectiveOutputs(endBlock);
        
        this.block.inputPorts = [];
        this.block.outputPorts = [];
        
        // Add Execution Input Port (The "Trigger" line) - REQUIRED for connections
        this.block.inputPorts.push({
            name: 'trigger',
            type: 'execution',
            label: 'Trigger',
            position: { x: -14, y: 32 }, // Align with header
            connected: false
        });
        
        Object.keys(effectiveOutputs).forEach((outputName, portIndex) => {
            const outputInfo = effectiveOutputs[outputName];
            
            // Calculate Y using base class helper method (offset for execution port)
            const portY = this.calculatePortY(portIndex, 40); // 40px offset for execution row
            
            // Input port (left side) - to receive data into this output variable
            this.block.inputPorts!.push({
                name: outputName,
                type: outputInfo.type || 'any',
                position: { x: -14, y: portY }, // Extends 14px left
                connected: false
            });
            
            // Output port (right side) - to pass output to next blocks
            this.block.outputPorts!.push({
                name: outputName,
                type: outputInfo.type || 'any',
                position: { x: this.block.width + 14, y: portY }, // Extends 14px right
                connected: false
            });
        });
    }
    
    /**
     * Get effective outputs from config
     */
    private getEffectiveOutputs(endBlock: Node): Record<string, any> {
        return endBlock.data?.outputs || {};
    }
    
    /**
     * Override port rendering - End block renders ports differently
     */
    protected renderInputPorts(): string {
        return ''; // End block renders ports in custom rows
    }
    
    protected renderOutputPorts(): string {
        return ''; // End block renders ports in custom rows
    }
    
    /**
     * Render custom content - empty for End block
     */
    protected renderCustomContent(): string {
        return '';
    }
    
    /**
     * Render output rows with editable name/type/value and output ports on right
     */
    protected renderPorts(): string {
        const endBlock = this.blockData;
        if (!endBlock || !endBlock.data) return '';
        
        const effectiveOutputs = this.getEffectiveOutputs(endBlock);
        const outputEntries = Object.entries(effectiveOutputs);
        
        // Render the "Trigger" execution port first
        let html = `
            <div class="port-row port-input" 
                 data-block="${this.block.id}" 
                 data-port="trigger"
                 data-port-type="input"
                 data-value-type="execution"
                 style="justify-content: flex-start; padding-left: 8px; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 8px;">
                <span class="port-tab" style="background-color: #fff;"></span>
                <span class="port-name" style="font-weight: bold; color: #fff; margin-left: 8px;">Trigger</span>
            </div>
        `;
        
        if (outputEntries.length === 0) {
            html += `
                <div class="block-inputs-empty">
                    <button class="btn-add-item-popup" data-block="${this.block.id}" data-item-type="output" data-port-type="output" title="Add output">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                        </svg>
                        <span>Add Output</span>
                    </button>
                </div>
            `;
            return html;
        }
        
        html += outputEntries.map(([outputName, outputDef]) => {
            const outputInfo = outputDef as any;
            const outputType = outputInfo.type || 'string';
            const outputValue = outputInfo.value || '';
            const typeIcon = this.getTypeIcon(outputType);
            
            return `
                <div class="block-input-row" data-output-name="${this.escapeHtml(outputName)}">
                    <div class="port-input-tab" 
                         data-block="${this.block.id}" 
                         data-port="${this.escapeHtml(outputName)}"
                         data-port-type="input"
                         data-value-type="${outputType}">
                        <span class="port-tab"></span>
                    </div>
                    <div class="input-name-field">
                        <input type="text" 
                               class="block-output-name" 
                               value="${this.escapeHtml(outputName)}" 
                               placeholder="Output name"
                               data-original-name="${this.escapeHtml(outputName)}"
                               data-block="${this.block.id}">
                    </div>
                    <div class="input-type-selector">
                        <button class="output-type-btn" 
                                data-block="${this.block.id}"
                                data-output-name="${this.escapeHtml(outputName)}"
                                data-current-type="${outputType}"
                                title="Type: ${outputType}">
                            ${typeIcon}
                        </button>
                        <div class="output-type-dropdown" 
                             data-block="${this.block.id}"
                             data-output-name="${this.escapeHtml(outputName)}"
                             style="display: none;">
                            ${this.renderTypeOptions(outputType)}
                        </div>
                    </div>
                    <div class="input-value-field">
                        <input type="text" 
                               class="block-output-value" 
                               value="${this.escapeHtml(String(outputValue))}" 
                               placeholder="Enter value or {{variable}}"
                               data-block="${this.block.id}"
                               data-output-name="${this.escapeHtml(outputName)}">
                    </div>
                    <button class="btn-edit-output" 
                            data-block="${this.block.id}"
                            data-output-name="${this.escapeHtml(outputName)}"
                            title="Edit output">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286Z"/>
                        </svg>
                    </button>
                    <button class="btn-delete-output" 
                            data-block="${this.block.id}"
                            data-output-name="${this.escapeHtml(outputName)}"
                            title="Delete output">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                    <div class="port-output-tab" 
                         data-block="${this.block.id}" 
                         data-port="${this.escapeHtml(outputName)}"
                         data-port-type="output"
                         data-value-type="${outputType}">
                        <span class="port-tab"></span>
                    </div>
                </div>
            `;
        }).join('');
        
        return html + `
            <div class="block-add-input-row">
                <button class="btn-add-item-popup" data-block="${this.block.id}" data-item-type="output" data-port-type="output" title="Add output">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                    </svg>
                    <span>Add Output</span>
                </button>
            </div>
        `;
    }
    
    /**
     * Render the complete block
     */
    public render(): string {
        const blockName = this.blockData?.label || this.blockData?.id || this.block.id;
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
            <div class="block-ports-area">
                ${this.renderPorts()}
            </div>
        `;
    }
}
