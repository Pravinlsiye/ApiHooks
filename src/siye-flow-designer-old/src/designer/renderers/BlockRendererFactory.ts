import { BlockRenderer } from './BlockRenderer';
import { StartBlockRenderer } from './StartBlockRenderer';
import { EndBlockRenderer } from './EndBlockRenderer';
import { GenericBlockRenderer } from './GenericBlockRenderer';
import { VisualBlock } from '../VisualModels';
import { Node, BlockType } from '../../models/workflow-models';

/**
 * Factory for creating block renderers
 */
export class BlockRendererFactory {
    
    /**
     * Create appropriate renderer for block type
     */
    static createRenderer(block: VisualBlock, blockData?: Node): BlockRenderer {
        if (!blockData) {
            return new GenericBlockRenderer(block, blockData);
        }
        
        switch (blockData.type) {
            case BlockType.Start:
                return new StartBlockRenderer(block, blockData);
            case BlockType.End:
                return new EndBlockRenderer(block, blockData);
            default:
                return new GenericBlockRenderer(block, blockData);
        }
    }
}
