/**
 * BrowserWorkflowExecutor - Execute workflows in the browser
 */

import { Node, Edge, EdgeType, BlockType, WorkflowDefinition } from '../models/workflow-models';
import { TerminalPanel } from '../components/terminal-panel';

/**
 * Execution context passed between blocks
 */
export interface ExecutionContext {
    variables: Map<string, any>;
    blockOutputs: Map<string, Record<string, any>>;
    startTime: number;
}

/**
 * Result of block execution
 */
export interface BlockResult {
    success: boolean;
    outputs: Record<string, any>;
    error?: string;
    nextHandle?: string;
}

/**
 * Browser-based workflow executor
 */
export class BrowserWorkflowExecutor {
    private terminal: TerminalPanel;
    private nodes: Map<string, Node> = new Map();
    private edges: Edge[] = [];
    private isRunning: boolean = false;
    private abortController: AbortController | null = null;
    private onBlockHighlight?: (blockId: string) => void;
    
    constructor(terminal: TerminalPanel) {
        this.terminal = terminal;
    }
    
    /**
     * Set callback for highlighting blocks during execution
     */
    setBlockHighlightCallback(callback: (blockId: string) => void): void {
        this.onBlockHighlight = callback;
    }
    
    /**
     * Execute a workflow
     */
    public async execute(workflow: WorkflowDefinition): Promise<boolean> {
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
        
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
            this.terminal.log('error', 'Invalid workflow: no nodes found');
            this.cleanup();
            return false;
        }
        
        workflow.nodes.forEach(node => {
            this.nodes.set(node.id, node);
        });
        this.edges = workflow.edges || [];
        
        this.terminal.log('info', `Loaded ${this.nodes.size} nodes, ${this.edges.length} edges`);
        
        // Find start node
        const startNode = this.findStartNode();
        if (!startNode) {
            this.terminal.log('error', 'No Start block found in workflow');
            this.cleanup();
            return false;
        }
        
        // Create execution context
        const context: ExecutionContext = {
            variables: new Map(),
            blockOutputs: new Map(),
            startTime: Date.now()
        };
        
        this.terminal.logWorkflowStart(workflow.name || 'Unnamed Workflow');
        
        let success = true;
        
        try {
            await this.executeNode(startNode, context);
        } catch (error) {
            success = false;
            if (String(error).includes('aborted')) {
                this.terminal.log('warning', 'Workflow execution stopped');
            } else {
                this.terminal.log('error', `Workflow execution failed: ${error}`);
            }
        }
        
        const duration = Date.now() - context.startTime;
        this.terminal.logWorkflowEnd(success, duration);
        
        this.cleanup();
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
        this.cleanup();
    }
    
    /**
     * Check if workflow is running
     */
    public getIsRunning(): boolean {
        return this.isRunning;
    }
    
    private cleanup(): void {
        this.isRunning = false;
        this.terminal.setRunning(false);
        this.abortController = null;
    }
    
    private findStartNode(): Node | undefined {
        return Array.from(this.nodes.values()).find(n => {
            const nodeType = String(n.type).toLowerCase();
            return nodeType === 'start' || nodeType === BlockType.Start.toLowerCase();
        });
    }
    
    /**
     * Execute a single node and follow edges
     */
    private async executeNode(node: Node, context: ExecutionContext): Promise<void> {
        if (this.abortController?.signal.aborted) {
            throw new Error('Execution aborted');
        }
        
        // Highlight the block being executed
        if (this.onBlockHighlight) {
            this.onBlockHighlight(node.id);
        }
        
        const startTime = Date.now();
        this.terminal.logBlockStart(node.id, node.label || node.id, String(node.type));
        
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
            for (const [key, value] of Object.entries(result.outputs)) {
                context.variables.set(key, value);
            }
        }
        
        // Find next nodes
        const nextHandle = result.nextHandle || (result.success ? 'success' : 'fail');
        const handleToUse = String(node.type).toLowerCase() === 'start' ? 'default' : nextHandle;
        
        const outgoingEdges = this.edges.filter(e => 
            e.source === node.id && 
            e.type === EdgeType.Execution &&
            (e.sourceHandle === handleToUse || e.sourceHandle === 'default' || e.sourceHandle === 'success')
        );
        
        // Execute next nodes
        for (const edge of outgoingEdges) {
            const nextNode = this.nodes.get(edge.target);
            if (nextNode) {
                const nodeType = String(nextNode.type).toLowerCase();
                if (nodeType !== 'end') {
                    await this.executeNode(nextNode, context);
                } else {
                    // Execute End block
                    await this.executeBlock(nextNode, context);
                    this.terminal.logBlockEnd(nextNode.id, nextNode.label || nextNode.id, true, 0);
                }
            }
        }
    }
    
    /**
     * Execute a specific block type
     */
    private async executeBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const nodeType = String(node.type).toLowerCase().replace(/-/g, '');
        
        switch (nodeType) {
            case 'start':
                return this.executeStartBlock(node, context);
            case 'end':
                return this.executeEndBlock(node, context);
            case 'httprequest':
                return this.executeHttpBlock(node, context);
            case 'variable':
                return this.executeVariableBlock(node, context);
            case 'log':
                return this.executeLogBlock(node, context);
            case 'delay':
                return this.executeDelayBlock(node, context);
            case 'condition':
            case 'switch':
                return this.executeConditionBlock(node, context);
            case 'evaluate':
                return this.executeEvaluateBlock(node, context);
            case 'loop':
            case 'batchprocess':
                return this.executeLoopBlock(node, context);
            case 'subworkflow':
                this.terminal.log('warning', `   Sub-workflow execution not yet implemented`);
                return { success: true, outputs: {}, nextHandle: 'success' };
            default:
                this.terminal.log('debug', `   Block type '${node.type}' - passing through`);
                return { success: true, outputs: {}, nextHandle: 'success' };
        }
    }
    
    private async executeStartBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const outputs: Record<string, any> = {};
        
        // Process inputs - handle both flat and nested structures
        let inputs: Record<string, any> = {};
        
        if (data.inputs && typeof data.inputs === 'object' && Object.keys(data.inputs).length > 0) {
            inputs = data.inputs as Record<string, any>;
        } else if (data.values && typeof data.values === 'object') {
            inputs = data.values as Record<string, any>;
        }
        
        // Only log if there are actual inputs
        if (Object.keys(inputs).length > 0) {
            for (const [key, value] of Object.entries(inputs)) {
                // Skip if value is an empty object
                if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
                    continue;
                }
                
                const resolvedValue = typeof value === 'object' && (value as any).value !== undefined
                    ? (value as any).value
                    : value;
                outputs[key] = resolvedValue;
                context.variables.set(key, resolvedValue);
                this.terminal.logVariable(key, resolvedValue);
            }
        }
        
        return { success: true, outputs, nextHandle: 'default' };
    }
    
    private async executeEndBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const outputs: Record<string, any> = {};
        
        if (data.outputs && typeof data.outputs === 'object') {
            for (const [key, def] of Object.entries(data.outputs)) {
                // Handle both {value: "...", type: "..."} and plain values
                const rawValue = typeof def === 'object' && (def as any).value !== undefined
                    ? (def as any).value
                    : def;
                const value = this.resolveValue(String(rawValue), context);
                outputs[key] = value;
                this.terminal.log('success', `   📤 Output: ${key} = ${JSON.stringify(value).substring(0, 100)}`);
            }
        }
        
        return { success: true, outputs };
    }
    
    private async executeHttpBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const method = String(data.method || 'GET').toUpperCase();
        const url = this.resolveValue(String(data.url || ''), context);
        
        if (!url) {
            return { success: false, outputs: {}, error: 'No URL specified', nextHandle: 'fail' };
        }
        
        this.terminal.logHttpRequest(method, url);
        
        try {
            const headers: Record<string, string> = {};
            if (data.headers && typeof data.headers === 'object') {
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
                response: body // Alias for easier access
            };
            
            // Log response preview first
            const bodyPreview = typeof body === 'object' 
                ? JSON.stringify(body).substring(0, 100) 
                : String(body).substring(0, 100);
            this.terminal.log('debug', `   Response: ${bodyPreview}${bodyPreview.length >= 100 ? '...' : ''}`);
            
            // Extract outputs based on JSONPath-like config (e.g., "$.fact" -> body.fact)
            if (data.outputs && typeof data.outputs === 'object') {
                for (const [varName, jsonPath] of Object.entries(data.outputs)) {
                    const path = String(jsonPath);
                    let value: any;
                    
                    if (path.startsWith('$.')) {
                        // JSONPath: $.field or $.nested.field
                        value = this.extractValue(body, path.substring(2));
                    } else if (path.startsWith('$')) {
                        value = this.extractValue(body, path.substring(1));
                    } else {
                        value = this.extractValue(body, path);
                    }
                    
                    if (value !== undefined) {
                        outputs[varName] = value;
                        context.variables.set(varName, value);
                        this.terminal.log('info', `   📦 ${varName} = ${typeof value === 'object' ? JSON.stringify(value) : String(value).substring(0, 80)}`);
                    }
                }
            }
            
            return { 
                success: response.ok, 
                outputs, 
                nextHandle: response.ok ? 'success' : 'fail' 
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
    
    private async executeLogBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const message = this.resolveValue(data.message || '', context);
        const level = data.level || 'info';
        
        this.terminal.logMessage(level, message);
        
        return { success: true, outputs: { message }, nextHandle: 'success' };
    }
    
    private async executeDelayBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        let duration = Number(data.duration) || 1000;
        
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
    
    private async executeConditionBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const expression = this.resolveValue(data.expression || data.condition || 'true', context);
        
        this.terminal.log('debug', `   🔀 Evaluating: ${expression}`);
        
        try {
            const evalContext: Record<string, any> = {};
            context.variables.forEach((value, key) => {
                evalContext[key] = value;
            });
            
            const result = this.evaluateExpression(expression, evalContext);
            const nextHandle = result ? 'success' : 'fail';
            
            this.terminal.log('debug', `   → Result: ${result} (taking ${nextHandle} path)`);
            
            return { success: true, outputs: { result }, nextHandle };
            
        } catch (error) {
            this.terminal.log('error', `   Condition error: ${error}`);
            return { success: false, outputs: {}, error: String(error), nextHandle: 'fail' };
        }
    }
    
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
    
    private async executeLoopBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        let items: any[] = [];
        
        // Get items to iterate
        const itemsValue = data.items || data.array || '[]';
        if (typeof itemsValue === 'string') {
            const resolved = this.resolveValue(itemsValue, context);
            try {
                items = JSON.parse(resolved);
            } catch {
                items = resolved.split(',').map(s => s.trim());
            }
        } else if (Array.isArray(itemsValue)) {
            items = itemsValue;
        }
        
        this.terminal.log('debug', `   🔄 Looping over ${items.length} items`);
        
        const outputs: Record<string, any> = { items, count: items.length };
        
        // For now, just store items in context for connected blocks
        context.variables.set('loopItems', items);
        context.variables.set('loopCount', items.length);
        
        return { success: true, outputs, nextHandle: 'done' };
    }
    
    /**
     * Resolve {{variable}} placeholders
     */
    private resolveValue(value: string, context: ExecutionContext): string {
        if (typeof value !== 'string') return value;
        
        return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
            const trimmed = varName.trim();
            
            if (context.variables.has(trimmed)) {
                const val = context.variables.get(trimmed);
                return typeof val === 'object' ? JSON.stringify(val) : String(val);
            }
            
            // Handle nested paths like response.body.id
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
            
            return match;
        });
    }
    
    /**
     * Extract value using dot notation path
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
     * Simple expression evaluator
     */
    private evaluateExpression(expr: string, context: Record<string, any>): any {
        let resolved = expr;
        for (const [key, value] of Object.entries(context)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            resolved = resolved.replace(regex, JSON.stringify(value));
        }
        
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

