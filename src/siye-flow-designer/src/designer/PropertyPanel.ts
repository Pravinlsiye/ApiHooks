import { AnyWorkflowBlock, BlockType } from '../models/workflow-models';
import { SimpleEventEmitter } from './VisualModels';

/**
 * Property panel for editing block properties
 */
export class PropertyPanel extends SimpleEventEmitter {
    private container: HTMLElement;
    private currentBlock: AnyWorkflowBlock | null = null;
    
    constructor(containerId: string) {
        super();
        
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        
        this.container = element;
        this.setupPanel();
    }
    
    /**
     * Setup the property panel
     */
    private setupPanel(): void {
        this.container.innerHTML = `
            <div class="property-panel-content">
                <h3>Properties</h3>
                <div class="property-form"></div>
            </div>
        `;
    }
    
    /**
     * Show properties for a block
     */
    public showBlock(block: AnyWorkflowBlock): void {
        this.currentBlock = block;
        this.renderProperties();
    }
    
    /**
     * Clear the property panel
     */
    public clear(): void {
        this.currentBlock = null;
        const form = this.container.querySelector('.property-form');
        if (form) {
            form.innerHTML = '<p class="no-selection">Select a block to view properties</p>';
        }
    }
    
    /**
     * Render block properties
     */
    private renderProperties(): void {
        const form = this.container.querySelector('.property-form');
        if (!form || !this.currentBlock) return;
        
        let html = '';
        
        // Basic properties
        html += `
            <div class="property-group">
                <label>ID</label>
                <input type="text" value="${this.currentBlock.id}" readonly class="readonly">
            </div>
            
            <div class="property-group">
                <label>Type</label>
                <input type="text" value="${this.currentBlock.type}" readonly class="readonly">
            </div>
            
            <div class="property-group">
                <label>Name</label>
                <input type="text" id="prop-name" value="${this.currentBlock.name || ''}" 
                       data-property="name">
            </div>
            
            <div class="property-group">
                <label>Description</label>
                <textarea id="prop-description" rows="3" 
                          data-property="description">${this.currentBlock.description || ''}</textarea>
            </div>
        `;
        
        // Block-specific properties
        html += this.renderBlockSpecificProperties();
        
        form.innerHTML = html;
        
        // Setup event handlers
        this.setupPropertyHandlers();
    }
    
    /**
     * Render block-specific properties based on type
     */
    private renderBlockSpecificProperties(): string {
        if (!this.currentBlock) return '';
        
        let html = '<h4>Configuration</h4>';
        
        const config = this.currentBlock.config as any;
        
        switch (this.currentBlock.type) {
            case BlockType.Start:
                html += `
                    <div class="property-group">
                        <label>Profiles</label>
                        ${this.renderProfileSelector()}
                    </div>
                    
                    <div class="property-group">
                        <label>Profile Details</label>
                        ${this.renderProfileDetails()}
                    </div>
                    
                    <div class="property-group">
                        <label>Overrides (JSON)</label>
                        <textarea rows="3" data-property="config.overrides" 
                                  data-type="json">${JSON.stringify(config?.overrides || {}, null, 2)}</textarea>
                    </div>
                `;
                break;
                
            case BlockType.HttpRequest:
                html += `
                    <div class="property-group">
                        <label>URL</label>
                        <input type="text" data-property="config.url" 
                               value="${config?.url || ''}">
                    </div>
                    
                    <div class="property-group">
                        <label>Method</label>
                        <select data-property="config.method">
                            <option value="GET" ${config?.method === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="POST" ${config?.method === 'POST' ? 'selected' : ''}>POST</option>
                            <option value="PUT" ${config?.method === 'PUT' ? 'selected' : ''}>PUT</option>
                            <option value="DELETE" ${config?.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                            <option value="PATCH" ${config?.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Success Evaluator (TypeScript)</label>
                        <textarea rows="2" data-property="config.successEvaluator" 
                                  placeholder="e.g., statusCode === 200 || statusCode === 201">${config?.successEvaluator || ''}</textarea>
                        <small style="color: #8b949e; font-size: 11px; margin-top: 4px; display: block;">
                            Available variables: statusCode, status, response, body, headers
                            <br>Default: statusCode >= 200 && statusCode < 300
                        </small>
                    </div>
                    
                    <div class="property-group">
                        <label>Headers (JSON)</label>
                        <textarea rows="3" data-property="config.headers" 
                                  data-type="json">${JSON.stringify(config?.headers || {}, null, 2)}</textarea>
                    </div>
                    
                    <div class="property-group">
                        <label>Body (JSON)</label>
                        <textarea rows="5" data-property="config.body" 
                                  data-type="json">${config?.body ? JSON.stringify(config.body, null, 2) : ''}</textarea>
                    </div>
                `;
                break;
                
            case BlockType.Variable:
                html += `
                    <div class="property-group">
                        <label>Operation</label>
                        <select id="var-operation" data-property="config.operation">
                            <option value="set" ${config?.operation === 'set' ? 'selected' : ''}>Set</option>
                            <option value="get" ${config?.operation === 'get' ? 'selected' : ''}>Get</option>
                            <option value="delete" ${config?.operation === 'delete' ? 'selected' : ''}>Delete</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Variables</label>
                        <div class="variable-list" id="variable-list">
                            ${this.renderVariableList(config?.variables || {})}
                        </div>
                        <button type="button" class="btn-add-variable" id="btn-add-variable">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                            </svg>
                            Add Variable
                        </button>
                    </div>
                `;
                break;
                
            case BlockType.Condition:
                html += `
                    <div class="property-group">
                        <label>Expression</label>
                        <input type="text" data-property="config.expression" 
                               value="${config?.expression || ''}">
                    </div>
                    
                    <div class="property-group">
                        <label>On True (Block ID)</label>
                        <input type="text" data-property="config.onTrue" 
                               value="${config?.onTrue || ''}">
                    </div>
                    
                    <div class="property-group">
                        <label>On False (Block ID)</label>
                        <input type="text" data-property="config.onFalse" 
                               value="${config?.onFalse || ''}">
                    </div>
                `;
                break;
                
            case BlockType.Delay:
                html += `
                    <div class="property-group">
                        <label>Delay (milliseconds)</label>
                        <input type="number" data-property="config.milliseconds" 
                               value="${config?.milliseconds || 1000}">
                    </div>
                `;
                break;
                
            case BlockType.Log:
                html += `
                    <div class="property-group">
                        <label>Message</label>
                        <textarea rows="3" data-property="config.message">${config?.message || ''}</textarea>
                    </div>
                    
                    <div class="property-group">
                        <label>Level</label>
                        <select data-property="config.level">
                            <option value="info" ${config?.level === 'info' ? 'selected' : ''}>Info</option>
                            <option value="warning" ${config?.level === 'warning' ? 'selected' : ''}>Warning</option>
                            <option value="error" ${config?.level === 'error' ? 'selected' : ''}>Error</option>
                            <option value="debug" ${config?.level === 'debug' ? 'selected' : ''}>Debug</option>
                        </select>
                    </div>
                `;
                break;
                
            case BlockType.End:
                html += `
                    <div class="property-group">
                        <label>Outputs (JSON)</label>
                        <textarea rows="5" data-property="config.outputs" 
                                  data-type="json">${JSON.stringify(config?.outputs || {}, null, 2)}</textarea>
                    </div>
                `;
                break;
        }
        
        return html;
    }
    
    /**
     * Render profile selector dropdown for Start block
     */
    private renderProfileSelector(): string {
        const config = (this.currentBlock as any)?.config;
        const profiles = config?.profiles || [];
        const selectedProfile = config?.selectedProfile || '';
        
        if (profiles.length === 0) {
            return '<p class="no-profiles">No profiles defined. Add profiles in JSON view.</p>';
        }
        
        let html = `<select data-property="config.selectedProfile" class="profile-selector">`;
        html += `<option value="">-- Select Profile --</option>`;
        
        profiles.forEach((profile: any) => {
            const selected = profile.name === selectedProfile ? 'selected' : '';
            const defaultBadge = profile.default ? ' (default)' : '';
            html += `<option value="${profile.name}" ${selected}>${profile.name}${defaultBadge}</option>`;
        });
        
        html += `</select>`;
        return html;
    }
    
    /**
     * Render profile details for the selected profile
     */
    private renderProfileDetails(): string {
        const config = (this.currentBlock as any)?.config;
        const profiles = config?.profiles || [];
        const selectedProfileName = config?.selectedProfile || '';
        
        const selectedProfile = profiles.find((p: any) => p.name === selectedProfileName);
        
        if (!selectedProfile) {
            return '<p class="no-profile-selected">Select a profile to view its inputs</p>';
        }
        
        let html = '<div class="profile-inputs">';
        html += `<h5>${selectedProfile.name}</h5>`;
        
        if (selectedProfile.description) {
            html += `<p class="profile-description">${selectedProfile.description}</p>`;
        }
        
        if (selectedProfile.inputs && Object.keys(selectedProfile.inputs).length > 0) {
            html += '<table class="profile-inputs-table">';
            html += '<thead><tr><th>Input</th><th>Type</th><th>Value</th><th>Required</th></tr></thead>';
            html += '<tbody>';
            
            for (const [key, input] of Object.entries(selectedProfile.inputs)) {
                const inputDef = input as any;
                html += '<tr>';
                html += `<td>${key}</td>`;
                html += `<td>${inputDef.type || 'string'}</td>`;
                html += `<td><code>${inputDef.value || inputDef.default || ''}</code></td>`;
                html += `<td>${inputDef.required ? '✓' : ''}</td>`;
                html += '</tr>';
            }
            
            html += '</tbody></table>';
        } else {
            html += '<p>No inputs defined for this profile</p>';
        }
        
        html += '</div>';
        return html;
    }
    
    /**
     * Render variable list for Variable block
     */
    private renderVariableList(variables: Record<string, any>): string {
        if (!variables || Object.keys(variables).length === 0) {
            return '<div class="variable-empty">No variables defined</div>';
        }
        
        let html = '';
        for (const [varName, varValue] of Object.entries(variables)) {
            const displayValue = this.formatVariableValue(varValue);
            html += `
                <div class="variable-item" data-variable-name="${this.escapeHtml(varName)}">
                    <div class="variable-drag-handle">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M2 2h8v1H2V2zm0 2h8v1H2V4zm0 2h8v1H2V6zm0 2h8v1H2V8z"/>
                        </svg>
                    </div>
                    <div class="variable-name">
                        <input type="text" class="variable-name-input" 
                               value="${this.escapeHtml(varName)}" 
                               placeholder="Variable name"
                               data-original-name="${this.escapeHtml(varName)}">
                    </div>
                    <div class="variable-value">
                        <input type="text" class="variable-value-input" 
                               value="${this.escapeHtml(String(varValue))}" 
                               placeholder="Enter value or {{variable}}">
                        <div class="variable-preview">${displayValue}</div>
                    </div>
                    <button type="button" class="btn-delete-variable" title="Delete variable">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </div>
            `;
        }
        return html;
    }
    
    /**
     * Format variable value for preview display
     */
    private formatVariableValue(value: any): string {
        if (value === null || value === undefined) {
            return '<span class="preview-placeholder">null</span>';
        }
        
        const strValue = String(value);
        
        // Check if it's a variable reference ({{variable}})
        const varRefMatch = strValue.match(/\{\{([^}]+)\}\}/);
        if (varRefMatch) {
            return `<span class="preview-variable">{{${this.escapeHtml(varRefMatch[1])}}}</span>`;
        }
        
        // Show actual value (truncate if too long)
        const displayValue = strValue.length > 30 ? strValue.substring(0, 30) + '...' : strValue;
        return `<span class="preview-value">${this.escapeHtml(displayValue)}</span>`;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Setup event handlers for property inputs
     */
    private setupPropertyHandlers(): void {
        const inputs = this.container.querySelectorAll('input[data-property], textarea[data-property], select[data-property]');
        
        inputs.forEach(input => {
            input.addEventListener('change', (e) => this.onPropertyChange(e));
            
            // For text inputs, also handle input event for real-time updates
            if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
                input.addEventListener('input', (e) => this.onPropertyChange(e));
            }
        });
        
        // Setup variable list handlers for Variable block
        if (this.currentBlock?.type === BlockType.Variable) {
            this.setupVariableListHandlers();
        }
    }
    
    /**
     * Setup event handlers for variable list
     */
    private setupVariableListHandlers(): void {
        const variableList = document.getElementById('variable-list');
        const addButton = document.getElementById('btn-add-variable');
        
        if (!variableList || !addButton) return;
        
        // Add variable button
        addButton.addEventListener('click', () => {
            this.addNewVariable();
        });
        
        // Delete variable buttons
        variableList.querySelectorAll('.btn-delete-variable').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = (e.target as HTMLElement).closest('.variable-item');
                if (item) {
                    const varName = item.getAttribute('data-variable-name');
                    if (varName) {
                        this.deleteVariable(varName);
                    }
                }
            });
        });
        
        // Variable name and value inputs
        variableList.querySelectorAll('.variable-name-input').forEach(input => {
            input.addEventListener('blur', (e) => {
                this.onVariableNameChange(e.target as HTMLInputElement);
            });
        });
        
        variableList.querySelectorAll('.variable-value-input').forEach(input => {
            input.addEventListener('input', (e) => {
                this.onVariableValueChange(e.target as HTMLInputElement);
            });
            input.addEventListener('blur', (e) => {
                this.onVariableValueChange(e.target as HTMLInputElement);
            });
        });
    }
    
    /**
     * Add a new variable
     */
    private addNewVariable(): void {
        if (!this.currentBlock || this.currentBlock.type !== BlockType.Variable) return;
        
        const config = (this.currentBlock as any).config;
        if (!config.variables) {
            config.variables = {};
        }
        
        // Generate a unique variable name
        let counter = 1;
        let newName = `value${counter}`;
        while (config.variables[newName] !== undefined) {
            counter++;
            newName = `value${counter}`;
        }
        
        config.variables[newName] = '';
        
        // Emit change event
        this.emit('propertyChange', {
            blockId: this.currentBlock.id,
            property: 'config.variables',
            value: config.variables
        });
        
        // Re-render to show the new variable
        this.renderProperties();
    }
    
    /**
     * Delete a variable
     */
    private deleteVariable(varName: string): void {
        if (!this.currentBlock || this.currentBlock.type !== BlockType.Variable) return;
        
        const config = (this.currentBlock as any).config;
        if (config.variables && config.variables[varName] !== undefined) {
            delete config.variables[varName];
            
            // Emit change event
            this.emit('propertyChange', {
                blockId: this.currentBlock.id,
                property: 'config.variables',
                value: config.variables
            });
            
            // Re-render to update the list
            this.renderProperties();
        }
    }
    
    /**
     * Handle variable name change
     */
    private onVariableNameChange(input: HTMLInputElement): void {
        if (!this.currentBlock || this.currentBlock.type !== BlockType.Variable) return;
        
        const originalName = input.dataset.originalName;
        const newName = input.value.trim();
        
        if (!originalName || !newName || newName === originalName) return;
        
        const config = (this.currentBlock as any).config;
        if (config.variables && config.variables[originalName] !== undefined) {
            const value = config.variables[originalName];
            delete config.variables[originalName];
            config.variables[newName] = value;
            
            // Emit change event
            this.emit('propertyChange', {
                blockId: this.currentBlock.id,
                property: 'config.variables',
                value: config.variables
            });
            
            // Re-render to update the list
            this.renderProperties();
        }
    }
    
    /**
     * Handle variable value change
     */
    private onVariableValueChange(input: HTMLInputElement): void {
        if (!this.currentBlock || this.currentBlock.type !== BlockType.Variable) return;
        
        const item = input.closest('.variable-item');
        if (!item) return;
        
        // Get the current variable name from the name input (may have been edited)
        const nameInput = item.querySelector('.variable-name-input') as HTMLInputElement;
        const varName = nameInput?.value.trim() || item.getAttribute('data-variable-name');
        
        if (!varName) return;
        
        const config = (this.currentBlock as any).config;
        if (config.variables) {
            const newValue = input.value;
            config.variables[varName] = newValue;
            
            // Update preview
            const preview = item.querySelector('.variable-preview');
            if (preview) {
                preview.innerHTML = this.formatVariableValue(newValue);
            }
            
            // Emit change event
            this.emit('propertyChange', {
                blockId: this.currentBlock.id,
                property: 'config.variables',
                value: config.variables
            });
        }
    }
    
    /**
     * Handle property change
     */
    private onPropertyChange(e: Event): void {
        if (!this.currentBlock) return;
        
        const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        const property = target.dataset.property;
        if (!property) return;
        
        let value: any = target.value;
        
        // Parse JSON properties
        if (target.dataset.type === 'json') {
            try {
                value = JSON.parse(value);
            } catch (err) {
                // Keep as string if invalid JSON
                console.warn('Invalid JSON:', value);
                return;
            }
        }
        
        // Special handling for profile selection changes
        if (property === 'config.selectedProfile') {
            // Update the property directly
            if (this.currentBlock && (this.currentBlock as any).config) {
                (this.currentBlock as any).config.selectedProfile = value;
            }
            this.emit('blockUpdated', this.currentBlock.id, { ...this.currentBlock });
            // Re-render to show updated profile details
            this.renderProperties();
            return;
        }
        
        // Parse number properties
        if (target.type === 'number') {
            value = parseInt(value, 10);
        }
        
        // Emit property change event
        this.emit('propertyChange', {
            blockId: this.currentBlock.id,
            property,
            value
        });
    }
}
