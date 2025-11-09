import { 
    WorkflowDefinition, 
    AnyWorkflowBlock,
    BlockType,
    StartBlock,
    EndBlock,
    HttpRequestBlock,
    VariableBlock,
    ConditionBlock,
    DelayBlock,
    LogBlock
} from '../models/workflow-models';

/**
 * Main workflow engine class that manages workflow execution logic
 * Mirrors the C# WorkflowExecutor functionality
 */
export class WorkflowEngine {
    private workflow: WorkflowDefinition;
    private blocks: Map<string, AnyWorkflowBlock>;
    
    constructor() {
        this.workflow = {
            name: 'New Workflow',
            description: '',
            version: '1.0',
            blocks: []
        };
        this.blocks = new Map();
    }
    
    /**
     * Load workflow from JSON
     */
    public loadWorkflow(json: string): void {
        try {
            const data = JSON.parse(json);
            this.workflow = this.deserializeWorkflow(data);
            this.indexBlocks();
        } catch (error) {
            throw new Error(`Failed to load workflow: ${error}`);
        }
    }
    
    /**
     * Save workflow to JSON
     */
    public saveWorkflow(): string {
        return JSON.stringify(this.workflow, null, 2);
    }
    
    /**
     * Get the current workflow definition
     */
    public getWorkflow(): WorkflowDefinition {
        return this.workflow;
    }
    
    /**
     * Add a new block to the workflow
     */
    public addBlock(block: AnyWorkflowBlock): void {
        if (!block.id) {
            block.id = this.generateBlockId(block.type);
        }
        
        if (!this.workflow.blocks) {
            this.workflow.blocks = [];
        }
        
        this.workflow.blocks.push(block);
        this.blocks.set(block.id, block);
    }
    
    /**
     * Remove a block from the workflow
     */
    public removeBlock(blockId: string): void {
        this.blocks.delete(blockId);
        if (this.workflow.blocks) {
            this.workflow.blocks = this.workflow.blocks.filter(b => b.id !== blockId);
        }
    }
    
    /**
     * Update a block in the workflow
     */
    public updateBlock(blockId: string, updates: Partial<AnyWorkflowBlock>): void {
        const block = this.blocks.get(blockId);
        if (block) {
            Object.assign(block, updates);
        }
    }
    
    /**
     * Get a block by ID
     */
    public getBlock(blockId: string): AnyWorkflowBlock | undefined {
        return this.blocks.get(blockId);
    }
    
    /**
     * Get all blocks
     */
    public getBlocks(): AnyWorkflowBlock[] {
        return Array.from(this.blocks.values());
    }
    
    /**
     * Validate the workflow
     */
    public validate(): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Check for required blocks
        const hasStart = this.workflow.blocks?.some(b => b.type === BlockType.Start);
        const hasEnd = this.workflow.blocks?.some(b => b.type === BlockType.End);
        
        if (!hasStart) {
            errors.push('Workflow must have a Start block');
        }
        
        if (!hasEnd) {
            errors.push('Workflow must have an End block');
        }
        
        // Validate block connections
        this.workflow.blocks?.forEach(block => {
            if (block.type !== BlockType.End && !block.onSuccess && !block.onFailure && !block.onComplete) {
                warnings.push(`Block '${block.name || block.id}' has no outgoing connections`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Create a new block instance by type
     */
    public createBlock(type: BlockType): AnyWorkflowBlock {
        switch (type) {
            case BlockType.Start:
                const startBlock = new StartBlock();
                // Ensure Start blocks always have at least one profile
                if (!startBlock.config.profiles || startBlock.config.profiles.length === 0) {
                    startBlock.config.profiles = [{
                        name: 'Default',
                        description: 'Default configuration',
                        default: true,
                        inputs: {
                            value1: {
                                type: 'string',
                                required: false,
                                value: '',
                                description: 'Input value 1'
                            }
                        }
                    }];
                    startBlock.config.selectedProfile = 'Default';
                }
                return startBlock;
            case BlockType.End:
                return new EndBlock();
            case BlockType.HttpRequest:
                return new HttpRequestBlock();
            case BlockType.Variable:
                return new VariableBlock();
            case BlockType.Condition:
                return new ConditionBlock();
            case BlockType.Delay:
                return new DelayBlock();
            case BlockType.Log:
                return new LogBlock();
            default:
                throw new Error(`Unknown block type: ${type}`);
        }
    }
    
    /**
     * Generate a unique block ID
     */
    private generateBlockId(type: BlockType): string {
        const prefix = type.toLowerCase().replace('-', '_');
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 5);
        return `${prefix}_${timestamp}_${random}`;
    }
    
    /**
     * Index all blocks for quick lookup
     */
    private indexBlocks(): void {
        this.blocks.clear();
        this.workflow.blocks?.forEach(block => {
            this.blocks.set(block.id, block as AnyWorkflowBlock);
        });
    }
    
    /**
     * Deserialize workflow JSON to proper class instances
     */
    private deserializeWorkflow(data: any): WorkflowDefinition {
        const workflow: WorkflowDefinition = {
            name: data.name || '',
            description: data.description || '',
            version: data.version || '1.0',
            metadata: data.metadata,
            inputs: data.inputs,
            outputs: data.outputs,
            blocks: []
        };
        
        if (data.blocks && Array.isArray(data.blocks)) {
            workflow.blocks = data.blocks.map((blockData: any) => {
                const block = this.createBlock(this.parseBlockType(blockData.type));
                Object.assign(block, blockData);
                return block;
            });
        }
        
        return workflow;
    }
    
    /**
     * Parse block type from string
     */
    private parseBlockType(type: string): BlockType {
        // Convert kebab-case to enum value
        const enumKey = type.split('-').map((part, index) => 
            index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part.charAt(0).toUpperCase() + part.slice(1)
        ).join('');
        
        return (BlockType as any)[enumKey] || BlockType.Start;
    }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
