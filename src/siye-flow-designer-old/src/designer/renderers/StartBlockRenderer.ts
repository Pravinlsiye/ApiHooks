import { BlockRenderer } from './BlockRenderer';
import { VisualBlock } from '../VisualModels';
import { Node } from '../../models/workflow-models';
import { getIconSvg } from '../../utils/Icons';

/**
 * Renderer for Start blocks
 */
export class StartBlockRenderer extends BlockRenderer {
    
    constructor(block: VisualBlock, blockData?: Node) {
        super(block, blockData);
    }
    
    protected getIcon(): string {
        return getIconSvg('start');
    }
    
    protected getColor(): string {
        return '#4CAF50';
    }
    
    protected getDescription(): string {
        return (this.blockData as any)?.description || 'Workflow entry point';
    }
    
    /**
     * Update ports based on profile configuration
     */
    public updatePorts(): void {
        const startBlock = this.blockData;
        if (!startBlock || !startBlock.data) return;
        
        const effectiveInputs = this.getEffectiveInputs(startBlock);
        const hasProfiles = startBlock.data.profiles && startBlock.data.profiles.length > 0;
        
        this.block.inputPorts = [];
        this.block.outputPorts = [];
        
        // Add Execution Output Port (The "Run" line)
        this.block.outputPorts.push({
            name: 'default',
            type: 'execution',
            label: 'Start',
            position: { x: this.block.width + 14, y: 32 }, // Align with header
            connected: false
        });
        
        // Profile selector adds extra height if present
        const profileOffset = hasProfiles ? 40 : 0;
        
        Object.keys(effectiveInputs).forEach((inputName, portIndex) => {
            const portInfo = effectiveInputs[inputName];
            
            // Calculate Y using base class helper method
            const portY = this.calculatePortY(portIndex, profileOffset);
            
            // Input port (left side) - position relative to block
            this.block.inputPorts!.push({
                name: inputName,
                type: portInfo.type || 'any',
                position: { x: -14, y: portY }, // Extends 14px left
                connected: false
            });
            
            // Output port (right side) - position relative to block
            this.block.outputPorts!.push({
                name: inputName,
                type: portInfo.type || 'any',
                position: { x: this.block.width + 14, y: portY }, // Extends 14px right
                connected: false
            });
        });
    }
    
    /**
     * Override port rendering for Start block - combine input/output in single row
     */
    protected renderInputPorts(): string {
        return ''; // Start block renders ports differently
    }
    
    protected renderOutputPorts(): string {
        return ''; // Start block renders ports differently
    }
    
    /**
     * Render combined ports for Start block with editable inputs
     */
    protected renderPorts(): string {
        const startBlock = this.blockData;
        if (!startBlock || !startBlock.data) return '';
        
        const effectiveInputs = this.getEffectiveInputs(startBlock);
        const inputEntries = Object.entries(effectiveInputs);
        
        // Render the "Start" execution port
        let html = `
            <div class="port-row port-output" 
                 data-block="${this.block.id}" 
                 data-port="default"
                 data-port-type="output"
                 data-value-type="execution"
                 style="justify-content: flex-end; padding-right: 8px; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 8px;">
                <span class="port-name" style="font-weight: bold; color: #fff;">Run</span>
                <span class="port-tab" style="background-color: #fff;"></span>
            </div>
        `;
        
        if (inputEntries.length === 0) {
            html += `
                <div class="block-inputs-empty">
                    <button class="btn-add-item-popup" data-block="${this.block.id}" data-item-type="input" data-port-type="input" title="Add input">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                        </svg>
                        <span>Add Input</span>
                    </button>
                </div>
            `;
            return html;
        }
        
        html += inputEntries.map(([inputName, inputDef]) => {
            const inputInfo = inputDef as any;
            const inputType = inputInfo.type || 'string';
            const inputValue = inputInfo.value || inputInfo.default || '';
            const typeIcon = this.getTypeIcon(inputType);
            
            return `
                <div class="block-input-row" data-input-name="${this.escapeHtml(inputName)}">
                    <div class="port-input-tab" 
                         data-block="${this.block.id}" 
                         data-port="${this.escapeHtml(inputName)}"
                         data-port-type="input"
                         data-value-type="${inputType}">
                        <span class="port-tab"></span>
                    </div>
                    <div class="input-name-field">
                        <input type="text" 
                               class="block-input-name" 
                               value="${this.escapeHtml(inputName)}" 
                               placeholder="Input name"
                               data-original-name="${this.escapeHtml(inputName)}"
                               data-block="${this.block.id}">
                    </div>
                    <div class="input-type-selector">
                        <button class="input-type-btn" 
                                data-block="${this.block.id}"
                                data-input-name="${this.escapeHtml(inputName)}"
                                data-current-type="${inputType}"
                                title="Type: ${inputType}">
                            ${typeIcon}
                        </button>
                        <div class="input-type-dropdown" 
                             data-block="${this.block.id}"
                             data-input-name="${this.escapeHtml(inputName)}">
                            ${this.renderTypeOptions(inputType)}
                        </div>
                    </div>
                    <div class="input-value-field">
                        <input type="text" 
                               class="block-input-value" 
                               value="${this.escapeHtml(String(inputValue))}" 
                               placeholder="Enter value or {{variable}}"
                               data-block="${this.block.id}"
                               data-input-name="${this.escapeHtml(inputName)}">
                    </div>
                    <button class="btn-edit-input" 
                            data-block="${this.block.id}"
                            data-input-name="${this.escapeHtml(inputName)}"
                            title="Edit input">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.25.25 0 0 0 .108-.064l6.286-6.286Z"/>
                        </svg>
                    </button>
                    <button class="btn-delete-input" 
                            data-block="${this.block.id}"
                            data-input-name="${this.escapeHtml(inputName)}"
                            title="Delete input">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                    <div class="port-output-tab" 
                         data-block="${this.block.id}" 
                         data-port="${this.escapeHtml(inputName)}"
                         data-port-type="output"
                         data-value-type="${inputType}">
                        <span class="port-tab"></span>
                    </div>
                </div>
            `;
        }).join('');
        
        return html + `
            <div class="block-add-input-row">
                <button class="btn-add-item-popup" data-block="${this.block.id}" data-item-type="input" data-port-type="input" title="Add input">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                    </svg>
                    <span>Add Input</span>
                </button>
            </div>
        `;
    }
    
    /**
     * Get effective inputs from profile configuration
     * Ensures there's always at least one profile
     */
    private getEffectiveInputs(startBlock: Node): Record<string, any> {
        const config = startBlock.data;
        
        // Ensure profiles exist - create default if missing
        if (!config.profiles || config.profiles.length === 0) {
            // Create a default profile from direct inputs
            config.profiles = [{
                name: 'Default',
                description: 'Default configuration',
                default: true,
                inputs: config.inputs || {}
            }];
            config.selectedProfile = 'Default';
        }
        
        // Get the selected profile
        const selectedProfile = config.profiles.find((p: any) => p.name === config.selectedProfile)
            || config.profiles.find((p: any) => p.default)
            || config.profiles[0];
        
        return selectedProfile.inputs || {};
    }
    
    /**
     * Render profile selector (always shown since we ensure at least one profile)
     */
    protected renderCustomContent(): string {
        const startBlock = this.blockData;
        if (!startBlock || !startBlock.data) return '';
        
        // Profiles are guaranteed to exist from getEffectiveInputs()
        const profiles = startBlock.data.profiles || [];
        
        // This should always be true now, but check anyway
        if (profiles.length === 0) {
            console.warn('Start block has no profiles - this should not happen');
            return '';
        }
        
        const selectedProfile = startBlock.data.selectedProfile 
            || profiles.find((p: any) => p.default)?.name 
            || profiles[0].name;
        
        return `
            <div class="profile-selector-block">
                <div class="profile-selector-header">
                    <select class="profile-dropdown" data-block="${this.block.id}">
                        ${profiles.map((profile: any) => `
                            <option value="${profile.name}" ${profile.name === selectedProfile ? 'selected' : ''}>
                                ${profile.name}${profile.default ? ' (default)' : ''}
                            </option>
                        `).join('')}
                    </select>
                    <button class="btn-profile-actions" 
                            data-block="${this.block.id}"
                            title="Profile actions">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
                            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/>
                        </svg>
                    </button>
                    <div class="profile-actions-dropdown" data-block="${this.block.id}">
                        <div class="profile-action-item" data-action="add">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                            </svg>
                            Add Profile
                        </div>
                        ${profiles.length > 1 ? `
                            <div class="profile-action-item" data-action="delete" data-profile="${this.escapeHtml(selectedProfile)}">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                                Delete Profile
                            </div>
                        ` : ''}
                        ${profiles.find((p: any) => p.name === selectedProfile && !p.default) ? `
                            <div class="profile-action-item" data-action="set-default" data-profile="${this.escapeHtml(selectedProfile)}">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
                                </svg>
                                Set as Default
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Override render to use combined ports
     */
    public render(): string {
        const blockName = (this.blockData as any)?.label || this.blockData?.id || this.block.id;
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
                ${this.renderPorts()}
            </div>
        `;
    }
}
