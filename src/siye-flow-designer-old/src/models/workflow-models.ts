/**
 * SiyeFlow Workflow Schema - Source of Truth
 * 
 * This file contains the complete workflow schema definitions for SiyeFlow.
 * All workflow models, block types, and configurations are defined here.
 */

export enum BlockType {
    // Core
    Start = 'start',
    End = 'end',
    Variable = 'variable',
    Evaluate = 'evaluate',
    Log = 'log',

    // Connectivity
    HttpRequest = 'http-request',
    WebhookTrigger = 'webhook-trigger',

    // Logic / Flow
    Switch = 'switch',
    Loop = 'loop',
    Delay = 'delay',
    BatchProcess = 'batch-process',
    SubWorkflow = 'sub-workflow',

    // Legacy / Deprecated
    Condition = 'condition',
    Collect = 'collect',
    TryCatch = 'try-catch',
    Workflow = 'workflow',
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
    meta?: Record<string, any>;
    nodes: Node[];
    edges: Edge[];
}

export interface Node {
    id: string;
    type: BlockType;
    label?: string;
    
    /**
     * The configuration data for this block.
     * Validated at runtime by the specific BlockExecutor.
     */
    data: any;

    /**
     * Optional explicit interface definition for dynamic blocks
     */
    interface?: NodeInterface;
}

export interface NodeInterface {
    inputs: PortDefinition[];
    outputs: PortDefinition[];
}

export interface PortDefinition {
    name: string;
    type: string; // string, number, boolean, any
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

// --- Block Configuration Interfaces (DTOs) ---

export interface StartConfig {
    inputs?: Record<string, InputDefinition>;
    profiles?: InputProfile[];
    selectedProfile?: string;
}

export interface InputDefinition {
    type: string;
    required: boolean;
    description?: string;
    default?: any;
}

export interface InputProfile {
    name: string;
    default?: boolean;
    values: Record<string, any>;
}

export interface HttpRequestConfig {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    retries?: number;
    successEvaluator?: string;
    outputs?: Record<string, string>;
}

export interface EndConfig {
    outputs?: Record<string, OutputDefinition>;
}

export interface OutputDefinition {
    type?: string;
    value: any;
}

export interface VariableConfig {
    operation?: 'set' | 'delete';
    values?: Record<string, any>;
}

export interface LogConfig {
    message: string;
    level?: string;
}

export interface DelayConfig {
    duration: number;
    unit?: string;
}

export interface EvaluateConfig {
    language: string;
    expression: string;
}

export interface ConditionConfig {
    expression: string;
}
