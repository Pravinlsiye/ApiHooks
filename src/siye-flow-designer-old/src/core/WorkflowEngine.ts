import { 
    WorkflowDefinition, 
    Node,
    Edge,
    BlockType,
    EdgeType
} from '../models/workflow-models';
import { BLOCK_TEMPLATES } from '../designer/VisualModels';

/**
 * Main workflow engine class that manages workflow execution logic
 * Mirrors the C# WorkflowExecutor functionality (Node-Edge Graph)
 */
export class WorkflowEngine {
    private workflow: WorkflowDefinition;
    private nodeMap: Map<string, Node>;
    
    constructor() {
        this.workflow = {
            id: this.generateId(),
            name: 'New Workflow',
            description: '',
            version: '2.0.0',
            nodes: [],
            edges: []
        };
        this.nodeMap = new Map();
    }
    
    /**
     * Load workflow from JSON
     */
    public loadWorkflow(json: string): void {
        try {
            let data = JSON.parse(json);
            
            // Migration: Handle legacy schema (has 'blocks' instead of 'nodes')
            if (data.blocks && !data.nodes) {
                console.log('Detected legacy workflow schema. Migrating...');
                data = this.migrateLegacyWorkflow(data);
            }

            this.workflow = data;
            
            // Ensure arrays exist
            if (!this.workflow.nodes) this.workflow.nodes = [];
            if (!this.workflow.edges) this.workflow.edges = [];
            
            this.indexNodes();
        } catch (error) {
            throw new Error(`Failed to load workflow: ${error}`);
        }
    }

    private migrateLegacyWorkflow(legacyData: any): WorkflowDefinition {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        if (Array.isArray(legacyData.blocks)) {
            legacyData.blocks.forEach((block: any) => {
                // Map Legacy Block -> V2 Node
                const node: Node = {
                    id: block.id,
                    type: this.mapLegacyType(block.type),
                    label: block.name || block.type,
                    data: block.config || {} // Map config directly to data
                };
                
                // Preserve UI position if available (legacy hybrid)
                if (block.ui) {
                    (node as any).ui = block.ui;
                }

                nodes.push(node);

                // Map Legacy Connections -> V2 Execution Edges
                if (block.connections && Array.isArray(block.connections)) {
                    block.connections.forEach((conn: any) => {
                        edges.push({
                            id: this.generateId(),
                            type: EdgeType.Execution,
                            source: conn.fromBlock,
                            sourceHandle: conn.fromPort || 'default',
                            target: conn.toBlock,
                            targetHandle: conn.toPort || 'trigger'
                        });
                    });
                }
                // Handle simple onSuccess/onFailure
                if (block.onSuccess) {
                    edges.push({
                        id: this.generateId(),
                        type: EdgeType.Execution,
                        source: block.id,
                        sourceHandle: 'success',
                        target: block.onSuccess,
                        targetHandle: 'trigger'
                    });
                }
                if (block.onFailure) {
                    edges.push({
                        id: this.generateId(),
                        type: EdgeType.Execution,
                        source: block.id,
                        sourceHandle: 'fail',
                        target: block.onFailure,
                        targetHandle: 'trigger'
                    });
                }
            });
        }

        return {
            id: legacyData.id || this.generateId(),
            name: legacyData.name || 'Migrated Workflow',
            description: legacyData.description,
            version: '2.0.0',
            meta: legacyData.metadata,
            nodes: nodes,
            edges: edges
        };
    }

    private mapLegacyType(oldType: string): BlockType {
        // Simple mapping or passthrough if names match
        // Ensure pascal casing matching enum
        const normalized = oldType.toLowerCase();
        switch (normalized) {
            case 'http-request': return BlockType.HttpRequest;
            case 'start': return BlockType.Start;
            case 'end': return BlockType.End;
            case 'variable': return BlockType.Variable;
            case 'condition': return BlockType.Condition; // Legacy support
            default: 
                // Try to match enum values directly
                return Object.values(BlockType).find(v => v === normalized) || BlockType.Start;
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
     * Add a new node to the workflow
     */
    public addNode(node: Node): void {
        if (!node.id) {
            node.id = this.generateNodeId(node.type);
        }
        
        this.workflow.nodes.push(node);
        this.nodeMap.set(node.id, node);
    }
    
    /**
     * Remove a node from the workflow
     */
    public removeNode(nodeId: string): void {
        this.nodeMap.delete(nodeId);
        this.workflow.nodes = this.workflow.nodes.filter(n => n.id !== nodeId);
        // Also remove connected edges
        this.workflow.edges = this.workflow.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    }
    
    /**
     * Update a node in the workflow
     */
    public updateNode(nodeId: string, updates: Partial<Node>): void {
        const node = this.nodeMap.get(nodeId);
        if (node) {
            // specific deep merge logic might be needed for 'data', but generic assign for now
            Object.assign(node, updates);
        }
    }
    
    /**
     * Get a node by ID
     */
    public getNode(nodeId: string): Node | undefined {
        return this.nodeMap.get(nodeId);
    }
    
    /**
     * Get all nodes
     */
    public getNodes(): Node[] {
        return this.workflow.nodes;
    }

    /**
     * Add an edge
     */
    public addEdge(edge: Edge): void {
        if (!edge.id) edge.id = this.generateId();
        this.workflow.edges.push(edge);
    }

    public removeEdge(edgeId: string): void {
        this.workflow.edges = this.workflow.edges.filter(e => e.id !== edgeId);
    }
    
    /**
     * Validate the workflow structure
     */
    public validate(): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Check for required blocks
        const hasStart = this.workflow.nodes.some(n => n.type === BlockType.Start);
        const hasEnd = this.workflow.nodes.some(n => n.type === BlockType.End);
        
        if (!hasStart) {
            errors.push('Workflow must have a Start block');
        }
        
        if (!hasEnd) {
            warnings.push('Workflow should typically have an End block');
        }
        
        // Check for orphaned nodes (simplified check)
        const connectedNodeIds = new Set<string>();
        this.workflow.edges.forEach(e => {
            connectedNodeIds.add(e.source);
            connectedNodeIds.add(e.target);
        });

        this.workflow.nodes.forEach(node => {
            if (!connectedNodeIds.has(node.id) && this.workflow.nodes.length > 1) {
                warnings.push(`Node '${node.label || node.id}' is disconnected`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Create a new node instance by type
     */
    public createNode(type: BlockType): Node {
        const template = BLOCK_TEMPLATES.find(t => t.type === type);
        
        // Clone default data to avoid reference issues
        const defaultData = template ? JSON.parse(JSON.stringify(template.defaultData)) : {};

        const node: Node = {
            id: this.generateNodeId(type),
            type: type,
            label: template?.name || type,
            data: defaultData
        };
        
        return node;
    }
    
    private generateNodeId(type: BlockType): string {
        const prefix = type.toLowerCase().replace('-', '_');
        const random = Math.random().toString(36).substring(2, 5);
        return `${prefix}_${random}`;
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 10);
    }
    
    private indexNodes(): void {
        this.nodeMap.clear();
        this.workflow.nodes.forEach(node => {
            this.nodeMap.set(node.id, node);
        });
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
