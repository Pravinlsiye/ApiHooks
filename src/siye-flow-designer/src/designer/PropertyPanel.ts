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
                        <select data-property="config.operation">
                            <option value="set" ${config?.operation === 'set' ? 'selected' : ''}>Set</option>
                            <option value="get" ${config?.operation === 'get' ? 'selected' : ''}>Get</option>
                            <option value="delete" ${config?.operation === 'delete' ? 'selected' : ''}>Delete</option>
                        </select>
                    </div>
                    
                    <div class="property-group">
                        <label>Variables (JSON)</label>
                        <textarea rows="5" data-property="config.variables" 
                                  data-type="json">${JSON.stringify(config?.variables || {}, null, 2)}</textarea>
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
        
        // Connection properties
        html += `
            <h4>Connections</h4>
            <div class="property-group">
                <label>On Success</label>
                <input type="text" data-property="onSuccess" 
                       value="${this.currentBlock.onSuccess || ''}">
            </div>
            
            <div class="property-group">
                <label>On Failure</label>
                <input type="text" data-property="onFailure" 
                       value="${this.currentBlock.onFailure || ''}">
            </div>
        `;
        
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
