import { BlockRenderer } from './BlockRenderer';
import { StartBlockRenderer } from './StartBlockRenderer';
import { GenericBlockRenderer } from './GenericBlockRenderer';
import { VisualBlock } from '../VisualModels';
import { AnyWorkflowBlock, BlockType, StartBlock } from '../../models/workflow-models';

/**
 * Factory for creating block renderers
 */
export class BlockRendererFactory {
    
    /**
     * Create appropriate renderer for block type
     */
    static createRenderer(block: VisualBlock, blockData?: AnyWorkflowBlock): BlockRenderer {
        if (!blockData) {
            return new GenericBlockRenderer(block, blockData);
        }
        
        switch (blockData.type) {
            case BlockType.Start:
                return new StartBlockRenderer(block, blockData as StartBlock);
            default:
                return new GenericBlockRenderer(block, blockData);
        }
    }
}

