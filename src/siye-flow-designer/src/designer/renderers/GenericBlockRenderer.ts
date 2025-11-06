import { BlockRenderer } from './BlockRenderer';
import { VisualBlock } from '../VisualModels';
import { AnyWorkflowBlock, BlockType } from '../../models/workflow-models';

/**
 * Generic renderer for standard blocks
 */
export class GenericBlockRenderer extends BlockRenderer {
    
    constructor(block: VisualBlock, blockData?: AnyWorkflowBlock) {
        super(block, blockData);
    }
    
    protected getIcon(): string {
        const iconMap: Record<string, string> = {
            'end': '🔴',
            'http-request': '🌐',
            'variable': '📦',
            'condition': '❓',
            'delay': '⏰',
            'log': '📝',
            'evaluate': '🧮',
            'loop': '🔄',
            'try-catch': '⚠️'
        };
        
        return iconMap[this.block.type] || '📄';
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
     * Update ports from block definition
     */
    public updatePorts(): void {
        if (!this.blockData) return;
        
        const blockData = this.blockData as any;
        
        // No extra offset for generic blocks (no profile selector)
        const extraOffset = 0;
        
        // Set output ports using base class helper
        if (blockData.outputPorts) {
            this.block.outputPorts = blockData.outputPorts.map((port: any, portIndex: number) => {
                const y = this.calculatePortY(portIndex, extraOffset);
                
                return {
                    name: port.name,
                    type: port.type,
                    position: { x: this.block.width + 14, y },
                    connected: false
                };
            });
        }
        
        // Set input ports using base class helper
        if (blockData.inputPorts) {
            this.block.inputPorts = blockData.inputPorts.map((port: any, portIndex: number) => {
                const y = this.calculatePortY(portIndex, extraOffset);
                
                return {
                    name: port.name,
                    type: port.type,
                    position: { x: -14, y },
                    connected: false
                };
            });
        }
    }
}

