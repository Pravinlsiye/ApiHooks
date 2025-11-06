import { BlockRenderer } from './BlockRenderer';
import { VisualBlock } from '../VisualModels';
import { StartBlock } from '../../models/workflow-models';

/**
 * Renderer for Start blocks
 */
export class StartBlockRenderer extends BlockRenderer {
    
    constructor(block: VisualBlock, blockData?: StartBlock) {
        super(block, blockData);
    }
    
    protected getIcon(): string {
        return '🟢';
    }
    
    protected getColor(): string {
        return '#4CAF50';
    }
    
    protected getDescription(): string {
        return this.blockData?.description || 'Workflow entry point';
    }
    
    /**
     * Update ports based on profile configuration
     */
    public updatePorts(): void {
        const startBlock = this.blockData as StartBlock;
        if (!startBlock || !startBlock.config) return;
        
        const effectiveInputs = this.getEffectiveInputs(startBlock);
        const hasProfiles = startBlock.config.profiles && startBlock.config.profiles.length > 0;
        
        this.block.inputPorts = [];
        this.block.outputPorts = [];
        
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
     * Render combined ports for Start block
     */
    protected renderPorts(): string {
        if (!this.block.inputPorts || this.block.inputPorts.length === 0) {
            return '';
        }
        
        return this.block.inputPorts.map((inputPort, index) => {
            const outputPort = this.block.outputPorts![index];
            const typeIcon = this.getTypeIcon(inputPort.type);
            
            return `
                <div class="port-dual-row">
                    <div class="port-input-tab" 
                         data-block="${this.block.id}" 
                         data-port="${inputPort.name}"
                         data-port-type="input"
                         data-value-type="${inputPort.type}">
                        <span class="port-tab"></span>
                    </div>
                    <div class="port-center">
                        <span class="port-name">${inputPort.name}</span>
                        <span class="port-type">${typeIcon}</span>
                    </div>
                    <div class="port-output-tab" 
                         data-block="${this.block.id}" 
                         data-port="${outputPort.name}"
                         data-port-type="output"
                         data-value-type="${outputPort.type}">
                        <span class="port-tab"></span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Get type icon for display
     */
    private getTypeIcon(type: string): string {
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
     * Get effective inputs from profile configuration
     * Ensures there's always at least one profile
     */
    private getEffectiveInputs(startBlock: StartBlock): Record<string, any> {
        const config = startBlock.config;
        
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
        const selectedProfile = config.profiles.find(p => p.name === config.selectedProfile)
            || config.profiles.find(p => p.default)
            || config.profiles[0];
        
        return selectedProfile.inputs || {};
    }
    
    /**
     * Render profile selector (always shown since we ensure at least one profile)
     */
    protected renderCustomContent(): string {
        const startBlock = this.blockData as StartBlock;
        if (!startBlock || !startBlock.config) return '';
        
        // Profiles are guaranteed to exist from getEffectiveInputs()
        const profiles = startBlock.config.profiles || [];
        
        // This should always be true now, but check anyway
        if (profiles.length === 0) {
            console.warn('Start block has no profiles - this should not happen');
            return '';
        }
        
        const selectedProfile = startBlock.config.selectedProfile 
            || profiles.find(p => p.default)?.name 
            || profiles[0].name;
        
        return `
            <div class="profile-selector">
                <select class="profile-dropdown" data-block="${this.block.id}">
                    ${profiles.map(profile => `
                        <option value="${profile.name}" ${profile.name === selectedProfile ? 'selected' : ''}>
                            ${profile.name}${profile.default ? ' (default)' : ''}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }
    
    /**
     * Override render to use combined ports
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
                ${this.renderPorts()}
            </div>
        `;
    }
}

