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
    FileDownload = 'file-download',
    FileUpload = 'file-upload',
    FileStreamWriter = 'file-stream-writer',
    FileStreamReader = 'file-stream-reader',
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

/** Neutral header accent per block (monochrome UI). */
export const BLOCK_COLORS: Record<BlockType, string> = {
    [BlockType.Start]: '#262626',
    [BlockType.End]: '#2e2e2e',
    [BlockType.HttpRequest]: '#333333',
    [BlockType.Variable]: '#383838',
    [BlockType.Switch]: '#2a2a2a',
    [BlockType.Condition]: '#303030',
    [BlockType.Delay]: '#353535',
    [BlockType.Log]: '#2c2c2c',
    [BlockType.Evaluate]: '#323232',
    [BlockType.Loop]: '#2e2e2e',
    [BlockType.BatchProcess]: '#343434',
    [BlockType.SubWorkflow]: '#2a2a2a',
    [BlockType.WebhookTrigger]: '#363636',
    [BlockType.FileDownload]: '#2f2f2f',
    [BlockType.FileUpload]: '#353030',
    [BlockType.FileStreamWriter]: '#303535',
    [BlockType.FileStreamReader]: '#2a3030',
};

