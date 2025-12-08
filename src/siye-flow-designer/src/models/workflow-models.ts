/**
 * SiyeFlow Workflow Schema - Source of Truth
 */

export enum BlockType {
    Start = 'start',
    End = 'end',
    Variable = 'variable',
    Evaluate = 'evaluate',
    Log = 'log',
    HttpRequest = 'http-request',
    WebhookTrigger = 'webhook-trigger',
    Switch = 'switch',
    Loop = 'loop',
    Delay = 'delay',
    BatchProcess = 'batch-process',
    SubWorkflow = 'sub-workflow',
    Condition = 'condition',
}

export enum EdgeType {
    Execution = 'execution',
    Data = 'data'
}

export interface WorkflowDefinition {
    id: string;
    name: string;
    description?: string;
    version: string;
    meta?: Record<string, unknown>;
    nodes: Node[];
    edges: Edge[];
}

export interface Node {
    id: string;
    type: BlockType;
    label?: string;
    data: Record<string, unknown>;
    interface?: NodeInterface;
}

export interface NodeInterface {
    inputs: PortDefinition[];
    outputs: PortDefinition[];
}

export interface PortDefinition {
    name: string;
    type: string;
    required?: boolean;
    label?: string;
}

export interface Edge {
    id: string;
    type: EdgeType;
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
}

// Block colors
export const BLOCK_COLORS: Record<BlockType, string> = {
    [BlockType.Start]: '#4CAF50',
    [BlockType.End]: '#f44336',
    [BlockType.HttpRequest]: '#2196F3',
    [BlockType.Variable]: '#FF9800',
    [BlockType.Switch]: '#9C27B0',
    [BlockType.Condition]: '#9C27B0',
    [BlockType.Delay]: '#00BCD4',
    [BlockType.Log]: '#607D8B',
    [BlockType.Evaluate]: '#795548',
    [BlockType.Loop]: '#E91E63',
    [BlockType.BatchProcess]: '#3F51B5',
    [BlockType.SubWorkflow]: '#009688',
    [BlockType.WebhookTrigger]: '#FF5722',
};

