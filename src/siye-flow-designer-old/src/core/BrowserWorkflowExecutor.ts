import { Node, Edge, EdgeType, BlockType, WorkflowDefinition } from '../models/workflow-models';
import { TerminalPanel } from '../components/TerminalPanel';

/**
 * Execution context passed between blocks
 */
export interface ExecutionContext {
    variables: Map<string, any>;
    blockOutputs: Map<string, Record<string, any>>;
    currentProfile: string | null;
    startTime: number;
}

/**
 * Result of block execution
 */
export interface BlockResult {
    success: boolean;
    outputs: Record<string, any>;
    error?: string;
    nextHandle?: string; // 'success', 'fail', 'default', etc.
}

/**
 * Browser-based workflow executor
 * Executes workflows in the browser with real HTTP calls
 */
export class BrowserWorkflowExecutor {
    private terminal: TerminalPanel;
    private nodes: Map<string, Node> = new Map();
    private edges: Edge[] = [];
    private isRunning: boolean = false;
    private abortController: AbortController | null = null;
    
    constructor(terminal: TerminalPanel) {
        this.terminal = terminal;
    }
    
    /**
     * Execute a workflow
     */
    public async execute(
        workflow: WorkflowDefinition,
        startNodeId?: string,
        profileName?: string
    ): Promise<boolean> {
        if (this.isRunning) {
            this.terminal.log('warning', 'Workflow is already running');
            return false;
        }
        
        this.isRunning = true;
        this.terminal.setRunning(true);
        this.terminal.expand();
        this.abortController = new AbortController();
        
        // Load workflow data
        this.nodes.clear();
        
        // Debug: Log workflow structure
        console.log('[Executor] Workflow received:', workflow);
        console.log('[Executor] Nodes array:', workflow.nodes);
        
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
            this.terminal.log('error', `Invalid workflow: nodes is ${typeof workflow.nodes}`);
            this.isRunning = false;
            this.terminal.setRunning(false);
            return false;
        }
        
        workflow.nodes.forEach(node => {
            console.log('[Executor] Loading node:', node.id, 'type:', node.type, 'BlockType.Start:', BlockType.Start);
            this.nodes.set(node.id, node);
        });
        this.edges = workflow.edges || [];
        
        this.terminal.log('info', `Loaded ${this.nodes.size} nodes, ${this.edges.length} edges`);
        
        // Find start node - compare as strings to handle enum issues
        const startNode = startNodeId 
            ? this.nodes.get(startNodeId)
            : Array.from(this.nodes.values()).find(n => {
                const nodeType = String(n.type).toLowerCase();
                const startType = String(BlockType.Start).toLowerCase();
                console.log('[Executor] Comparing node type:', nodeType, 'with start:', startType);
                return nodeType === startType || nodeType === 'start';
            });
            
        if (!startNode) {
            const nodeTypes = Array.from(this.nodes.values()).map(n => `${n.id}:${n.type}`).join(', ');
            this.terminal.log('error', `No start node found. Available nodes: ${nodeTypes}`);
            this.isRunning = false;
            this.terminal.setRunning(false);
            return false;
        }
        
        // Create execution context
        const context: ExecutionContext = {
            variables: new Map(),
            blockOutputs: new Map(),
            currentProfile: profileName || null,
            startTime: Date.now()
        };
        
        this.terminal.logWorkflowStart(workflow.name || 'Unnamed Workflow');
        
        let success = true;
        
        try {
            // Execute from start node using BFS
            await this.executeNode(startNode, context);
        } catch (error) {
            success = false;
            this.terminal.log('error', `Workflow execution failed: ${error}`);
        }
        
        const duration = Date.now() - context.startTime;
        this.terminal.logWorkflowEnd(success, duration);
        
        this.isRunning = false;
        this.terminal.setRunning(false);
        this.abortController = null;
        
        return success;
    }
    
    /**
     * Stop running workflow
     */
    public stop(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.terminal.log('warning', 'Workflow execution stopped by user');
        }
        this.isRunning = false;
        this.terminal.setRunning(false);
    }
    
    /**
     * Execute a single node and follow edges
     */
    private async executeNode(node: Node, context: ExecutionContext): Promise<void> {
        if (this.abortController?.signal.aborted) {
            throw new Error('Execution aborted');
        }
        
        const startTime = Date.now();
        this.terminal.logBlockStart(node.id, node.label || node.id, node.type);
        
        let result: BlockResult;
        
        try {
            result = await this.executeBlock(node, context);
        } catch (error) {
            result = {
                success: false,
                outputs: {},
                error: String(error),
                nextHandle: 'fail'
            };
        }
        
        const duration = Date.now() - startTime;
        this.terminal.logBlockEnd(node.id, node.label || node.id, result.success, duration);
        
        // Store outputs
        if (result.outputs) {
            context.blockOutputs.set(node.id, result.outputs);
            
            // Also store in variables for {{variable}} resolution
            for (const [key, value] of Object.entries(result.outputs)) {
                context.variables.set(key, value);
            }
        }
        
        // Find and execute next nodes based on edges
        const nextHandle = result.nextHandle || (result.success ? 'success' : 'fail');
        
        // For Start block, use 'default' handle
        const handleToUse = node.type === BlockType.Start ? 'default' : nextHandle;
        
        const outgoingEdges = this.edges.filter(e => 
            e.source === node.id && 
            e.type === EdgeType.Execution &&
            (e.sourceHandle === handleToUse || e.sourceHandle === 'default')
        );
        
        // Execute next nodes (supports parallel execution from same source)
        for (const edge of outgoingEdges) {
            const nextNode = this.nodes.get(edge.target);
            if (nextNode && nextNode.type !== BlockType.End) {
                // Inject data from data edges before execution
                await this.injectDataFromEdges(nextNode, context);
                await this.executeNode(nextNode, context);
            } else if (nextNode && nextNode.type === BlockType.End) {
                // Execute End block
                await this.injectDataFromEdges(nextNode, context);
                await this.executeBlock(nextNode, context);
            }
        }
    }
    
    /**
     * Inject data from data edges into context
     */
    private async injectDataFromEdges(targetNode: Node, context: ExecutionContext): Promise<void> {
        const dataEdges = this.edges.filter(e => 
            e.target === targetNode.id && 
            e.type === EdgeType.Data
        );
        
        for (const edge of dataEdges) {
            const sourceOutputs = context.blockOutputs.get(edge.source);
            if (sourceOutputs && edge.sourceHandle) {
                const value = this.extractValue(sourceOutputs, edge.sourceHandle);
                if (value !== undefined) {
                    context.variables.set(edge.targetHandle, value);
                }
            }
        }
    }
    
    /**
     * Extract value using a path (supports dot notation and array indexing)
     */
    private extractValue(obj: any, path: string): any {
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;
        
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        
        return current;
    }
    
    /**
     * Execute a specific block type
     */
    private async executeBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        switch (node.type) {
            case BlockType.Start:
                return this.executeStartBlock(node, context);
            case BlockType.End:
                return this.executeEndBlock(node, context);
            case BlockType.HttpRequest:
                return this.executeHttpBlock(node, context);
            case BlockType.Variable:
                return this.executeVariableBlock(node, context);
            case BlockType.Log:
                return this.executeLogBlock(node, context);
            case BlockType.Delay:
                return this.executeDelayBlock(node, context);
            case BlockType.Condition:
            case BlockType.Switch:
                return this.executeConditionBlock(node, context);
            case BlockType.Evaluate:
                return this.executeEvaluateBlock(node, context);
            default:
                this.terminal.log('warning', `   Unknown block type: ${node.type}, skipping`);
                return { success: true, outputs: {}, nextHandle: 'success' };
        }
    }
    
    /**
     * Execute Start block
     */
    private async executeStartBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const outputs: Record<string, any> = {};
        
        // Get profile values
        let profileValues: Record<string, any> = {};
        
        if (data.profiles && data.profiles.length > 0) {
            const selectedProfile = context.currentProfile 
                ? data.profiles.find((p: any) => p.name === context.currentProfile)
                : data.profiles.find((p: any) => p.default) || data.profiles[0];
                
            if (selectedProfile) {
                this.terminal.log('info', `   📋 Using profile: ${selectedProfile.name}`);
                profileValues = selectedProfile.values || selectedProfile.inputs || {};
            }
        }
        
        // Merge profile values with direct inputs
        const allInputs = { ...data.inputs, ...profileValues };
        
        for (const [key, value] of Object.entries(allInputs)) {
            const resolvedValue = typeof value === 'object' && (value as any).value !== undefined
                ? (value as any).value
                : value;
            outputs[key] = resolvedValue;
            context.variables.set(key, resolvedValue);
            this.terminal.logVariable(key, resolvedValue);
        }
        
        return { success: true, outputs, nextHandle: 'default' };
    }
    
    /**
     * Execute End block
     */
    private async executeEndBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const outputs: Record<string, any> = {};
        
        if (data.outputs) {
            for (const [key, def] of Object.entries(data.outputs)) {
                const value = this.resolveValue((def as any).value, context);
                outputs[key] = value;
                this.terminal.log('success', `   📤 Output: ${key} = ${JSON.stringify(value).substring(0, 100)}`);
            }
        }
        
        return { success: true, outputs };
    }
    
    /**
     * Execute HTTP Request block
     */
    private async executeHttpBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const method = data.method || 'GET';
        const url = this.resolveValue(data.url, context);
        
        this.terminal.logHttpRequest(method, url);
        
        try {
            const headers: Record<string, string> = {};
            if (data.headers) {
                for (const [key, value] of Object.entries(data.headers)) {
                    headers[key] = this.resolveValue(String(value), context);
                }
            }
            
            const fetchOptions: RequestInit = {
                method,
                headers,
                signal: this.abortController?.signal
            };
            
            if (data.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
                fetchOptions.body = typeof data.body === 'string' 
                    ? this.resolveValue(data.body, context)
                    : JSON.stringify(data.body);
                headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            }
            
            const response = await fetch(url, fetchOptions);
            this.terminal.logHttpResponse(response.status, response.statusText);
            
            let body: any;
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                body = await response.json();
            } else {
                body = await response.text();
            }
            
            const outputs: Record<string, any> = {
                statusCode: response.status,
                status: response.statusText,
                body,
                headers: Object.fromEntries(response.headers.entries())
            };
            
            // Extract outputs using JSONPath if defined
            if (data.outputs) {
                for (const [key, path] of Object.entries(data.outputs)) {
                    const value = this.extractValue(body, String(path).replace('$.', ''));
                    outputs[key] = value;
                    this.terminal.logVariable(key, value);
                }
            }
            
            const success = response.ok;
            return { 
                success, 
                outputs, 
                nextHandle: success ? 'success' : 'fail' 
            };
            
        } catch (error) {
            this.terminal.log('error', `   HTTP Error: ${error}`);
            return { 
                success: false, 
                outputs: { error: String(error) }, 
                error: String(error),
                nextHandle: 'fail' 
            };
        }
    }
    
    /**
     * Execute Variable block
     */
    private async executeVariableBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const outputs: Record<string, any> = {};
        
        const values = data.values || data.variables || {};
        
        for (const [key, value] of Object.entries(values)) {
            const resolved = this.resolveValue(String(value), context);
            outputs[key] = resolved;
            context.variables.set(key, resolved);
            this.terminal.logVariable(key, resolved);
        }
        
        return { success: true, outputs, nextHandle: 'success' };
    }
    
    /**
     * Execute Log block
     */
    private async executeLogBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const message = this.resolveValue(data.message || '', context);
        const level = data.level || 'info';
        
        this.terminal.logMessage(level, message);
        
        return { success: true, outputs: {}, nextHandle: 'success' };
    }
    
    /**
     * Execute Delay block
     */
    private async executeDelayBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        let duration = data.duration || 1000;
        
        if (data.unit === 'seconds') duration *= 1000;
        else if (data.unit === 'minutes') duration *= 60000;
        
        this.terminal.log('debug', `   ⏱ Waiting ${duration}ms...`);
        
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, duration);
            this.abortController?.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new Error('Aborted'));
            });
        });
        
        return { success: true, outputs: {}, nextHandle: 'success' };
    }
    
    /**
     * Execute Condition/Switch block
     */
    private async executeConditionBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const expression = this.resolveValue(data.expression || 'true', context);
        
        this.terminal.log('debug', `   🔀 Evaluating: ${expression}`);
        
        try {
            // Create safe evaluation context
            const evalContext: Record<string, any> = {};
            context.variables.forEach((value, key) => {
                evalContext[key] = value;
            });
            
            // Simple expression evaluation
            const result = this.evaluateExpression(expression, evalContext);
            const nextHandle = result ? 'success' : 'fail';
            
            this.terminal.log('debug', `   → Result: ${result} (taking ${nextHandle} path)`);
            
            return { success: true, outputs: { result }, nextHandle };
            
        } catch (error) {
            this.terminal.log('error', `   Condition error: ${error}`);
            return { success: false, outputs: {}, error: String(error), nextHandle: 'fail' };
        }
    }
    
    /**
     * Execute Evaluate block
     */
    private async executeEvaluateBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const expression = this.resolveValue(data.expression || '', context);
        
        this.terminal.log('debug', `   🧮 Evaluating: ${expression}`);
        
        try {
            const evalContext: Record<string, any> = {};
            context.variables.forEach((value, key) => {
                evalContext[key] = value;
            });
            
            const result = this.evaluateExpression(expression, evalContext);
            this.terminal.logVariable('result', result);
            
            return { success: true, outputs: { result }, nextHandle: 'success' };
            
        } catch (error) {
            this.terminal.log('error', `   Evaluate error: ${error}`);
            return { success: false, outputs: {}, error: String(error), nextHandle: 'fail' };
        }
    }
    
    /**
     * Resolve {{variable}} placeholders in a string
     */
    private resolveValue(value: string, context: ExecutionContext): string {
        if (typeof value !== 'string') return value;
        
        return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
            const trimmed = varName.trim();
            
            // Check variables
            if (context.variables.has(trimmed)) {
                const val = context.variables.get(trimmed);
                return typeof val === 'object' ? JSON.stringify(val) : String(val);
            }
            
            // Check if it's a path like response.body.id
            if (trimmed.includes('.')) {
                const parts = trimmed.split('.');
                const rootVar = parts[0];
                if (context.variables.has(rootVar)) {
                    const value = this.extractValue(context.variables.get(rootVar), parts.slice(1).join('.'));
                    if (value !== undefined) {
                        return typeof value === 'object' ? JSON.stringify(value) : String(value);
                    }
                }
            }
            
            return match; // Keep original if not found
        });
    }
    
    /**
     * Simple expression evaluator (safer than eval)
     */
    private evaluateExpression(expr: string, context: Record<string, any>): any {
        // Replace variable references
        let resolved = expr;
        for (const [key, value] of Object.entries(context)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            resolved = resolved.replace(regex, JSON.stringify(value));
        }
        
        // Simple evaluations (basic comparisons)
        try {
            // Safety: only allow simple expressions
            if (/^[\d\s\+\-\*\/\(\)\<\>\=\!\&\|\.\[\]\"\'true false null]+$/i.test(resolved)) {
                return Function(`"use strict"; return (${resolved})`)();
            }
            return resolved;
        } catch {
            return resolved;
        }
    }
}

