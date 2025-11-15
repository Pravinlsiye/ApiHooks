import { BlockRenderer } from './BlockRenderer';
import { VisualBlock } from '../VisualModels';
import { AnyWorkflowBlock, BlockType } from '../../models/workflow-models';
import { getIconSvg, IconType } from '../../utils/Icons';

/**
 * Generic renderer for standard blocks
 */
export class GenericBlockRenderer extends BlockRenderer {
    
    constructor(block: VisualBlock, blockData?: AnyWorkflowBlock) {
        super(block, blockData);
    }
    
    protected getIcon(): string {
        const iconMap: Record<string, IconType> = {
            'end': 'end',
            'http-request': 'http',
            'variable': 'variable',
            'condition': 'condition',
            'delay': 'delay',
            'log': 'log',
            'evaluate': 'evaluate',
            'loop': 'loop',
            'try-catch': 'trycatch'
        };
        
        const iconType = iconMap[this.block.type];
        return iconType ? getIconSvg(iconType) : '<svg viewBox="0 0 24 24"><rect fill="#666" width="24" height="24"/></svg>';
    }
    
    protected getColor(): string {
        const colorMap: Record<string, string> = {
            'end': '#f44336',
            'http-request': '#2196F3',
            'variable': '#FF9800',
            'condition': '#9C27B0',
            'delay': '#00BCD4',
            'log': '#607D8B',
            'evaluate': '#795548',
            'loop': '#E91E63',
            'try-catch': '#FFC107'
        };
        
        return colorMap[this.block.type] || '#666';
    }
    
    /**
     * Render custom content for blocks with editable variables/headers/outputs
     * Separated into INPUTS and OUTPUTS sections
     */
    protected renderCustomContent(): string {
        if (!this.blockData) return '';
        
        const config = this.blockData.config as any;
        let html = '';
        const renderDerivedUrlInputs = (url: string | undefined): string => {
            if (!url) return '';
            const names = this.extractTemplateVariables(url);
            if (names.length === 0) return '';
            
            // Render simple, read-only rows with input tabs so they can be wired
            return names.map(name => `
                <div class="block-input-row derived-url-var" data-item-name="${this.escapeHtml(name)}" data-item-type="url-var" data-port-type="input">
                    <div class="port-input-tab" 
                         data-block="${this.block.id}" 
                         data-port="${this.escapeHtml(name)}"
                         data-port-type="input"
                         data-value-type="string">
                        <span class="port-tab"></span>
                    </div>
                    <div class="input-name-field">
                        <span class="static-label">${this.escapeHtml(name)}</span>
                    </div>
                    <div class="input-type-selector">
                        <span class="type-icon">Aa</span>
                    </div>
                    <div class="input-value-field">
                        <span class="hint">from URL</span>
                    </div>
                </div>
            `).join('');
        };
        
        switch (this.blockData.type) {
            case BlockType.Variable:
                const varConfig = config as any;
                // Use separate inputs/outputs if available, otherwise fall back to variables
                const varInputs = varConfig?.inputs || varConfig?.variables || {};
                const varOutputs = varConfig?.outputs || varConfig?.variables || {};
                
                // Always render sections, even if empty, so users can add items
                    html += `
                        <div class="block-variables-section">
                            <div class="block-section-label">Inputs</div>
                            <div class="block-ports-area">
                                ${this.renderEditableInputList(varInputs, 'variable', this.block.id, 'input')}
                            </div>
                        </div>
                        <div class="block-variables-section">
                            <div class="block-section-label">Outputs</div>
                            <div class="block-ports-area">
                                ${this.renderEditableOutputList(varOutputs, 'variable', this.block.id, 'output')}
                            </div>
                        </div>
                    `;
                break;
                
            case BlockType.HttpRequest:
                const httpConfig = config as any;
                const headerInputs = httpConfig?.inputs || httpConfig?.headers || {};
                
                // Body editor (only when method supports it)
                    html += `
                        ${(['POST','PUT','PATCH'].includes((httpConfig?.method || 'GET').toUpperCase())) ? `
                        <div style="margin: 6px 8px 0 8px;">
                            <div class="block-variables-section">
                                <div class="block-section-label">Body</div>
                                <div class="block-ports-area">
                                    <textarea rows="4"
                                              class="http-body-textarea"
                                              data-block="${this.block.id}"
                                              placeholder='JSON body, e.g. {"name":"value"}'
                                              style="width: 100%; box-sizing: border-box;">${httpConfig?.body ? this.escapeHtml(typeof httpConfig.body === 'string' ? httpConfig.body : JSON.stringify(httpConfig.body, null, 2)) : ''}</textarea>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        <div class="block-variables-section">
                            <div class="block-section-label">Inputs</div>
                            <div class="block-ports-area">
                                ${renderDerivedUrlInputs(httpConfig?.url)}
                                ${this.renderEditableInputList(headerInputs, 'header', this.block.id, 'input')}
                            </div>
                        </div>
                        <div class="block-variables-section">
                            <div class="block-section-label" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                                <span>Success Evaluator (TypeScript)</span>
                                <button class="http-evaluator-toggle" 
                                        data-block="${this.block.id}"
                                        title="Toggle evaluator editor"
                                        style="background: none; border: none; color: #8b949e; cursor: pointer; padding: 2px 6px; font-size: 14px;">
                                    ▼
                                </button>
                            </div>
                            <div class="block-ports-area http-evaluator-panel" data-block="${this.block.id}" style="display: none;">
                                <textarea rows="2"
                                          class="http-success-evaluator"
                                          data-block="${this.block.id}"
                                          placeholder="statusCode >= 200 && statusCode < 300"
                                          style="width: 100%; box-sizing: border-box;">${this.escapeHtml(httpConfig?.successEvaluator || '')}</textarea>
                                <small style="color: #8b949e; font-size: 11px; margin-top: 4px; display: block;">
                                    Available: statusCode, status, response, body, headers
                                </small>
                            </div>
                        </div>
                        <div class="block-variables-section">
                            <div class="block-section-label">Outputs</div>
                            <div class="block-ports-area">
                                ${this.block.outputPorts ? this.block.outputPorts.map(port => 
                                    this.renderPort(port, 'output')
                                ).join('') : ''}
                            </div>
                        </div>
                    `;
                break;
        }
        
        return html;
    }
    
    /**
     * Override render to skip separate port sections for blocks with custom content
     */
    public render(): string {
        const blockName = this.blockData?.name || this.block.id;
        const description = this.getDescription();
        const httpHeaderEditor = (this.blockData?.type === BlockType.HttpRequest)
            ? (() => {
                const cfg = (this.blockData as any)?.config || {};
                return `
                    <div class="http-inline-editor">
                        <div class="http-method-row">
                            <label>Method</label>
                            <select class="http-method-select" data-block="${this.block.id}">
                                ${['GET','POST','PUT','DELETE','PATCH'].map(m => 
                                    `<option value="${m}" ${ (cfg?.method || 'GET') === m ? 'selected' : ''}>${m}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="http-url-row">
                            <label>URL</label>
                            <input type="text"
                                   class="http-url-input"
                                   data-block="${this.block.id}"
                                   placeholder="https://api.example.com/resource or {{apiUrl}}{{resourcePath}}"
                                   value="${this.escapeHtml(cfg?.url || '')}"/>
                        </div>
                    </div>
                `;
            })()
            : '';
        
        // Check if this block has custom content (variables/headers/outputs)
        // Always show sections for Variable and HttpRequest blocks
        const hasCustomContent = this.blockData?.type === BlockType.Variable ||
                                 this.blockData?.type === BlockType.HttpRequest;
        
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
            ${this.blockData?.type === BlockType.HttpRequest ? httpHeaderEditor : (description ? `<div class="block-description">${description}</div>` : '')}
            ${this.renderCustomContent()}
            ${!hasCustomContent ? `
                <div class="block-ports-area">
                    ${this.renderInputPorts()}
                    ${this.renderOutputPorts()}
                </div>
            ` : ''}
        `;
    }
    
    /**
     * Get description
     */
    protected getDescription(): string {
        if (!this.blockData) return '';
        
        const config = this.blockData.config as any;
        
        switch (this.blockData.type) {
            case BlockType.HttpRequest:
                return config?.url ? `${config.method || 'GET'} ${config.url}` : '';
            case BlockType.Variable:
                const varCount = config?.variables ? Object.keys(config.variables).length : 0;
                return config?.operation ? `${config.operation} ${varCount} variable(s)` : '';
            case BlockType.Condition:
                return config?.expression || '';
            case BlockType.Delay:
                return config?.milliseconds ? `${config.milliseconds}ms` : '';
            case BlockType.Log:
                return config?.message ? config.message.substring(0, 50) : '';
            case BlockType.End:
                return 'Workflow exit point';
            default:
                return this.blockData.description || '';
        }
    }
    
    /**
     * Update ports from block definition and variables/headers/outputs
     */
    public updatePorts(): void {
        if (!this.blockData) return;
        
        const blockData = this.blockData as any;
        const config = blockData.config as any;
        
        this.block.inputPorts = [];
        this.block.outputPorts = [];
        
        // Add ports from variables/headers/outputs
        // Ports need to align with the rows in custom content
        const SECTION_LABEL_HEIGHT = 32; // Approximate height of section label
        let portIndex = 0;
        let currentYOffset = this.HEADER_HEIGHT;
        
        if (blockData.type === BlockType.Variable) {
            const varInputs = config?.inputs || config?.variables || {};
            const varOutputs = config?.outputs || config?.variables || {};
            const inputs = Object.entries(varInputs);
            const outputs = Object.entries(varOutputs);
            
            // Input ports section
            currentYOffset += SECTION_LABEL_HEIGHT; // "Inputs" label
            inputs.forEach(([varName, varValue]: [string, any], idx: number) => {
                const portY = currentYOffset + (idx * this.ROW_HEIGHT) + this.ROW_PADDING + this.PORT_CENTER_OFFSET;
                const varType = this.getTypeForValue(varValue);
                
                this.block.inputPorts!.push({
                    name: varName,
                    type: varType,
                    position: { x: -14, y: portY },
                    connected: false
                });
            });
            
            // Output ports section
            currentYOffset += SECTION_LABEL_HEIGHT + (inputs.length * this.ROW_HEIGHT) + 8; // "Outputs" label + input rows + spacing
            outputs.forEach(([varName, varValue]: [string, any], idx: number) => {
                const portY = currentYOffset + (idx * this.ROW_HEIGHT) + this.ROW_PADDING + this.PORT_CENTER_OFFSET;
                const varType = this.getTypeForValue(varValue);
                
                this.block.outputPorts!.push({
                    name: varName,
                    type: varType,
                    position: { x: this.block.width + 14, y: portY },
                    connected: false
                });
            });
            
            portIndex = inputs.length + outputs.length;
        } else if (blockData.type === BlockType.HttpRequest) {
            const headerInputs = config?.inputs || config?.headers || {};
            const inputs = Object.entries(headerInputs);
            // Extract variables from URL template like {{var}}
            const urlVars = this.extractTemplateVariables(config?.url);
            
            currentYOffset += SECTION_LABEL_HEIGHT;
            // First: URL variable input ports (read-only rows rendered above)
            urlVars.forEach((varName: string, idx: number) => {
                const portY = currentYOffset + (idx * this.ROW_HEIGHT) + this.ROW_PADDING + this.PORT_CENTER_OFFSET;
                this.block.inputPorts!.push({
                    name: varName,
                    type: 'string',
                    position: { x: -14, y: portY },
                    connected: false
                });
            });
            
            // Then: header input ports continue after URL vars
            const headerOffset = urlVars.length;
            inputs.forEach(([headerName, headerValue]: [string, any], idx: number) => {
                const portY = currentYOffset + ((headerOffset + idx) * this.ROW_HEIGHT) + this.ROW_PADDING + this.PORT_CENTER_OFFSET;
                const headerType = this.getTypeForValue(headerValue);
                
                this.block.inputPorts!.push({
                    name: headerName,
                    type: headerType,
                    position: { x: -14, y: portY },
                    connected: false
                });
            });
            
            // Move to output ports section
            currentYOffset += SECTION_LABEL_HEIGHT + ((urlVars.length + inputs.length) * this.ROW_HEIGHT) + 8;
            
            // Add output ports from block definition if available
            if (blockData.outputPorts && blockData.outputPorts.length > 0) {
                blockData.outputPorts.forEach((port: any, idx: number) => {
                    const portY = currentYOffset + (idx * this.ROW_HEIGHT) + this.ROW_PADDING + this.PORT_CENTER_OFFSET;
                    this.block.outputPorts!.push({
                        name: port.name,
                        type: port.type || 'any',
                        position: { x: this.block.width + 14, y: portY },
                        connected: false
                    });
                });
                portIndex = urlVars.length + inputs.length + blockData.outputPorts.length;
            } else {
                // Fallback: Add default success/fail output ports if not defined
                currentYOffset += 8;
                const successPortY = currentYOffset + this.PORT_CENTER_OFFSET;
                const failPortY = currentYOffset + this.ROW_HEIGHT + this.PORT_CENTER_OFFSET;
                
                this.block.outputPorts!.push({
                    name: 'success',
                    type: 'any',
                    position: { x: this.block.width + 14, y: successPortY },
                    connected: false
                });
                
                this.block.outputPorts!.push({
                    name: 'fail',
                    type: 'any',
                    position: { x: this.block.width + 14, y: failPortY },
                    connected: false
                });
                
                portIndex = urlVars.length + inputs.length + 2; // +2 for success/fail
            }
        }
        
        // Also add ports from block definition for other block types
        // (Skip for Variable and HttpRequest blocks which handle their ports above)
        if (blockData.type !== BlockType.Variable && blockData.type !== BlockType.HttpRequest) {
            if (blockData.inputPorts && blockData.inputPorts.length > 0) {
                // Check if ports already exist to avoid duplicates
                const existingInputNames = new Set(this.block.inputPorts?.map(p => p.name));
                blockData.inputPorts.forEach((port: any, idx: number) => {
                    if (!existingInputNames.has(port.name)) {
                        const y = this.calculatePortY(portIndex + idx, 0);
                        this.block.inputPorts!.push({
                            name: port.name,
                            type: port.type,
                            position: { x: -14, y },
                            connected: false
                        });
                    }
                });
            }
            
            if (blockData.outputPorts && blockData.outputPorts.length > 0) {
                // Check if ports already exist to avoid duplicates
                const existingOutputNames = new Set(this.block.outputPorts?.map(p => p.name));
                blockData.outputPorts.forEach((port: any, idx: number) => {
                    if (!existingOutputNames.has(port.name)) {
                        const y = this.calculatePortY(portIndex + idx, 0);
                        this.block.outputPorts!.push({
                            name: port.name,
                            type: port.type,
                            position: { x: this.block.width + 14, y },
                            connected: false
                        });
                    }
                });
            }
        }
    }
    
    /**
     * Extract {{variable}} placeholders from a template string
     */
    private extractTemplateVariables(text?: string): string[] {
        if (!text) return [];
        // Support both {{var}} and {var} not part of {{ }}
        const patterns: RegExp[] = [
            /\{\{\s*([a-zA-Z_][\w\-]*)\s*\}\}/g,          // {{var}}
            /\{(?!\{)\s*([a-zA-Z_][\w\-]*)\s*\}(?!\})/g   // {var} with negative lookaround to avoid {{ }}
        ];
        const names: string[] = [];
        for (const regex of patterns) {
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
                const name = match[1];
                if (name && !names.includes(name)) {
                    names.push(name);
                }
            }
        }
        return names;
    }
}

// End of GenericBlockRenderer

