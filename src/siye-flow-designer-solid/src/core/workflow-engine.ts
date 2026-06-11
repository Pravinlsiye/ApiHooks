/**
 * WorkflowEngine - Core engine for workflow execution logic
 */

import { WorkflowDefinition, Node, Edge, BlockType, EdgeType } from '../models/workflow-models';
import { VisualBlock, VisualConnection } from '../models/visual-models';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Main workflow engine class that manages workflow structure and validation
 */
export class WorkflowEngine {
    private workflow: WorkflowDefinition;
    private nodeMap: Map<string, Node> = new Map();
    
    constructor() {
        this.workflow = this.createEmptyWorkflow();
    }
    
    private createEmptyWorkflow(): WorkflowDefinition {
        return {
            id: this.generateId(),
            name: 'New Workflow',
            description: '',
            version: '2.0.0',
            nodes: [],
            edges: []
        };
    }
    
    /**
     * Load workflow from JSON string
     */
    public loadWorkflow(json: string): void {
        const data = JSON.parse(json);
        this.loadWorkflowData(data);
    }
    
    /**
     * Load workflow from data object
     */
    public loadWorkflowData(data: any): void {
        // Handle legacy schema migration if needed
        if (data.blocks && !data.nodes) {
            data = this.migrateLegacyWorkflow(data);
        }
        
        this.workflow = {
            ...data,
            nodes: data.nodes || [],
            edges: data.edges || []
        };
        
        this.indexNodes();
    }
    
    /**
     * Build workflow from visual blocks and connections
     */
    public buildFromVisual(
        blocks: Map<string, VisualBlock>, 
        connections: Map<string, VisualConnection>
    ): WorkflowDefinition {
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        
        blocks.forEach(block => {
            nodes.push({
                id: block.id,
                type: block.type,
                label: block.name,
                data: { ...block.fieldValues }
            });
        });
        
        connections.forEach(conn => {
            edges.push({
                id: conn.id,
                type: conn.type,
                source: conn.sourceBlockId,
                sourceHandle: conn.sourcePortName,
                target: conn.targetBlockId,
                targetHandle: conn.targetPortName
            });
        });
        
        this.workflow = {
            ...this.workflow,
            nodes,
            edges
        };
        
        this.indexNodes();
        
        return { ...this.workflow };
    }
    
    private migrateLegacyWorkflow(legacyData: any): WorkflowDefinition {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        if (Array.isArray(legacyData.blocks)) {
            legacyData.blocks.forEach((block: any) => {
                const node: Node = {
                    id: block.id,
                    type: this.mapLegacyType(block.type),
                    label: block.name || block.type,
                    data: block.config || {}
                };
                
                if (block.ui) {
                    (node as any).ui = block.ui;
                }

                nodes.push(node);

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
            });
        }

        return {
            id: legacyData.id || this.generateId(),
            name: legacyData.name || 'Migrated Workflow',
            description: legacyData.description,
            version: '2.0.0',
            nodes,
            edges
        };
    }

    private mapLegacyType(oldType: string): BlockType {
        const normalized = oldType.toLowerCase().replace('-', '');
        const mapping: Record<string, BlockType> = {
            'httprequest': BlockType.HttpRequest,
            'start': BlockType.Start,
            'end': BlockType.End,
            'variable': BlockType.Variable,
            'condition': BlockType.Condition,
            'log': BlockType.Log,
            'delay': BlockType.Delay
        };
        return mapping[normalized] || BlockType.Start;
    }
    
    /**
     * Get the current workflow definition
     */
    public getWorkflow(): WorkflowDefinition {
        return this.workflow;
    }
    
    /**
     * Save workflow to JSON string
     */
    public saveWorkflow(): string {
        return JSON.stringify(this.workflow, null, 2);
    }
    
    /**
     * Get all nodes
     */
    public getNodes(): Node[] {
        return this.workflow.nodes;
    }
    
    /**
     * Get all edges
     */
    public getEdges(): Edge[] {
        return this.workflow.edges;
    }
    
    /**
     * Get a node by ID
     */
    public getNode(nodeId: string): Node | undefined {
        return this.nodeMap.get(nodeId);
    }
    
    /**
     * Add a node
     */
    public addNode(node: Node): void {
        if (!node.id) {
            node.id = this.generateNodeId(node.type);
        }
        this.workflow.nodes.push(node);
        this.nodeMap.set(node.id, node);
    }
    
    /**
     * Remove a node
     */
    public removeNode(nodeId: string): void {
        this.nodeMap.delete(nodeId);
        this.workflow.nodes = this.workflow.nodes.filter(n => n.id !== nodeId);
        this.workflow.edges = this.workflow.edges.filter(
            e => e.source !== nodeId && e.target !== nodeId
        );
    }
    
    /**
     * Add an edge
     */
    public addEdge(edge: Edge): void {
        if (!edge.id) edge.id = this.generateId();
        this.workflow.edges.push(edge);
    }
    
    /**
     * Remove an edge
     */
    public removeEdge(edgeId: string): void {
        this.workflow.edges = this.workflow.edges.filter(e => e.id !== edgeId);
    }
    
    /**
     * Create a new node by type
     */
    public createNode(type: BlockType): Node {
        // Generate default label from block type
        const label = String(type).replace(/([A-Z])/g, ' $1').trim();

        return {
            id: this.generateNodeId(type),
            type,
            label,
            data: {}
        };
    }
    
    /**
     * Validate the workflow
     */
    public validate(): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        const hasStart = this.workflow.nodes.some(n => n.type === BlockType.Start);
        const hasEnd = this.workflow.nodes.some(n => n.type === BlockType.End);
        
        if (!hasStart) {
            errors.push('Workflow must have a Start block');
        }
        
        if (!hasEnd) {
            warnings.push('Workflow should have an End block');
        }
        
        // Check for disconnected nodes
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
     * Find the start node
     */
    public findStartNode(): Node | undefined {
        return this.workflow.nodes.find(n => 
            String(n.type).toLowerCase() === 'start' || 
            n.type === BlockType.Start
        );
    }
    
    /**
     * Get outgoing edges from a node
     */
    public getOutgoingEdges(nodeId: string, handleName?: string): Edge[] {
        return this.workflow.edges.filter(e => 
            e.source === nodeId && 
            (!handleName || e.sourceHandle === handleName || e.sourceHandle === 'default')
        );
    }
    
    /**
     * Get incoming edges to a node
     */
    public getIncomingEdges(nodeId: string): Edge[] {
        return this.workflow.edges.filter(e => e.target === nodeId);
    }
    
    private generateNodeId(type: BlockType): string {
        const prefix = String(type).toLowerCase().replace(/[^a-z0-9]/g, '_');
        const random = Math.random().toString(36).substring(2, 6);
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


