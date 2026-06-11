/**
 * BrowserWorkflowExecutor - Execute workflows in the browser
 */

import { Node, Edge, EdgeType, BlockType, WorkflowDefinition } from '../models/workflow-models';
import { TerminalSink } from './terminal-sink';

export type ExecutorState = 'idle' | 'running' | 'paused' | 'stepping';

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
    private terminal: TerminalSink;
    private nodes: Map<string, Node> = new Map();
    private edges: Edge[] = [];
    private state: ExecutorState = 'idle';
    private abortController: AbortController | null = null;
    private onBlockHighlight?: (blockId: string, state: 'executing' | 'success' | 'fail' | 'clear') => void;
    private onStateChange?: (state: ExecutorState) => void;
    private onContextUpdate?: (variables: Record<string, any>, blockOutputs: Record<string, Record<string, any>>, currentBlockId: string) => void;

    private pausePromise: Promise<void> | null = null;
    private pauseResolve: (() => void) | null = null;
    private stepMode: boolean = false;
    private breakpoints: Set<string> = new Set();
    private alwaysInspect: boolean = false;
    
    constructor(terminal: TerminalSink) {
        this.terminal = terminal;
    }
    
    setBlockHighlightCallback(callback: (blockId: string, state: 'executing' | 'success' | 'fail' | 'clear') => void): void {
        this.onBlockHighlight = callback;
    }

    setStateChangeCallback(callback: (state: ExecutorState) => void): void {
        this.onStateChange = callback;
    }

    setContextUpdateCallback(callback: (variables: Record<string, any>, blockOutputs: Record<string, Record<string, any>>, currentBlockId: string) => void): void {
        this.onContextUpdate = callback;
    }
    
    public async execute(workflow: WorkflowDefinition): Promise<boolean> {
        if (this.state !== 'idle') {
            this.terminal.log('warning', 'Workflow is already running');
            return false;
        }
        
        this.setState('running');
        this.terminal.setRunning(true);
        this.terminal.expand();
        this.abortController = new AbortController();
        this.stepMode = false;
        
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
        
        const startNode = this.findStartNode();
        if (!startNode) {
            this.terminal.log('error', 'No Start block found in workflow');
            this.cleanup();
            return false;
        }
        
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
        
        this.clearAllHighlights();
        this.cleanup();
        return success;
    }
    
    public stop(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.terminal.log('warning', 'Workflow execution stopped by user');
        }
        if (this.pauseResolve) {
            this.pauseResolve();
            this.pauseResolve = null;
            this.pausePromise = null;
        }
        this.cleanup();
    }

    public pause(): void {
        if (this.state !== 'running') return;
        this.setState('paused');
        this.terminal.log('info', '⏸ Workflow paused');
        this.pausePromise = new Promise<void>(resolve => {
            this.pauseResolve = resolve;
        });
    }

    public resume(): void {
        if (this.state !== 'paused') return;
        this.stepMode = false;
        this.setState('running');
        this.terminal.log('info', '▶ Workflow resumed');
        if (this.pauseResolve) {
            this.pauseResolve();
            this.pauseResolve = null;
            this.pausePromise = null;
        }
    }

    public step(): void {
        if (this.state !== 'paused') return;
        this.stepMode = true;
        this.setState('stepping');
        this.terminal.log('info', '⏭ Stepping to next block');
        if (this.pauseResolve) {
            this.pauseResolve();
            this.pauseResolve = null;
            this.pausePromise = null;
        }
    }
    
    public getIsRunning(): boolean {
        return this.state !== 'idle';
    }

    public getState(): ExecutorState {
        return this.state;
    }

    public toggleBreakpoint(blockId: string): boolean {
        if (this.breakpoints.has(blockId)) {
            this.breakpoints.delete(blockId);
            return false;
        }
        this.breakpoints.add(blockId);
        return true;
    }

    public hasBreakpoint(blockId: string): boolean {
        return this.breakpoints.has(blockId);
    }

    public clearBreakpoints(): void {
        this.breakpoints.clear();
    }

    public getBreakpoints(): Set<string> {
        return this.breakpoints;
    }

    public setAlwaysInspect(enabled: boolean): void {
        this.alwaysInspect = enabled;
    }

    private setState(state: ExecutorState): void {
        this.state = state;
        this.onStateChange?.(state);
    }
    
    private cleanup(): void {
        this.setState('idle');
        this.terminal.setRunning(false);
        this.abortController = null;
        this.pausePromise = null;
        this.pauseResolve = null;
        this.stepMode = false;
        this.currentContext = null;
    }

    private clearAllHighlights(): void {
        this.nodes.forEach((_, id) => {
            this.onBlockHighlight?.(id, 'clear');
        });
    }
    
    private findStartNode(): Node | undefined {
        return Array.from(this.nodes.values()).find(n => {
            const nodeType = String(n.type).toLowerCase();
            return nodeType === 'start' || nodeType === BlockType.Start.toLowerCase();
        });
    }

    private currentContext: ExecutionContext | null = null;

    private async waitIfPaused(nodeId?: string): Promise<void> {
        if (this.abortController?.signal.aborted) {
            throw new Error('Execution aborted');
        }
        if (this.pausePromise) {
            await this.pausePromise;
            if (this.abortController?.signal.aborted) {
                throw new Error('Execution aborted');
            }
        }
        if (nodeId && this.breakpoints.has(nodeId) && this.state === 'running') {
            this.terminal.log('warning', `   ⏸ Breakpoint hit on block`);
            this.onBlockHighlight?.(nodeId, 'executing');
            this.setState('paused');
            this.emitContextUpdate(this.currentContext!, nodeId);
            this.pausePromise = new Promise<void>(resolve => {
                this.pauseResolve = resolve;
            });
            await this.pausePromise;
            if (this.abortController?.signal.aborted) {
                throw new Error('Execution aborted');
            }
        }
        if (this.stepMode) {
            this.setState('paused');
            if (nodeId && this.currentContext) {
                this.emitContextUpdate(this.currentContext, nodeId);
            }
            this.pausePromise = new Promise<void>(resolve => {
                this.pauseResolve = resolve;
            });
        }
    }
    
    private async executeNode(node: Node, context: ExecutionContext): Promise<void> {
        if (this.abortController?.signal.aborted) {
            throw new Error('Execution aborted');
        }

        this.currentContext = context;
        await this.waitIfPaused(node.id);
        this.onBlockHighlight?.(node.id, 'executing');
        
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
        this.onBlockHighlight?.(node.id, result.success ? 'success' : 'fail');
        
        if (result.outputs) {
            context.blockOutputs.set(node.id, result.outputs);
            for (const [key, value] of Object.entries(result.outputs)) {
                context.variables.set(key, value);
            }
        }

        if (this.alwaysInspect) {
            this.emitContextUpdate(context, node.id);
        }
        
        // Find next nodes
        const nextHandle = result.nextHandle || (result.success ? 'success' : 'fail');
        const handleToUse = String(node.type).toLowerCase() === 'start' ? 'default' : nextHandle;
        
        const outgoingEdges = this.edges.filter(e => 
            e.source === node.id && 
            e.type === EdgeType.Execution &&
            (e.sourceHandle === handleToUse || e.sourceHandle === 'default')
        );
        
        for (const edge of outgoingEdges) {
            const nextNode = this.nodes.get(edge.target);
            if (nextNode) {
                const nodeType = String(nextNode.type).toLowerCase();
                if (nodeType !== 'end') {
                    await this.executeNode(nextNode, context);
                } else {
                    this.onBlockHighlight?.(nextNode.id, 'executing');
                    await this.executeBlock(nextNode, context);
                    this.terminal.logBlockEnd(nextNode.id, nextNode.label || nextNode.id, true, 0);
                    this.onBlockHighlight?.(nextNode.id, 'success');
                }
            }
        }
    }
    
    private emitContextUpdate(context: ExecutionContext, currentBlockId: string): void {
        if (!this.onContextUpdate) return;
        const variables: Record<string, any> = {};
        context.variables.forEach((v, k) => { variables[k] = v; });
        const blockOutputs: Record<string, Record<string, any>> = {};
        context.blockOutputs.forEach((v, k) => { blockOutputs[k] = v; });
        this.onContextUpdate(variables, blockOutputs, currentBlockId);
    }

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
            case 'filedownload':
                return this.executeFileDownloadBlock(node, context);
            case 'fileupload':
                return this.executeFileUploadBlock(node, context);
            case 'filestreamwriter':
                return this.executeFileStreamWriterBlock(node, context);
            case 'filestreamreader':
                return this.executeFileStreamReaderBlock(node, context);
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
    
    private async executeLogBlock(node: Node, _context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const message = this.resolveValue(String(data.message || ''), _context);
        const level = String(data.level || 'info') as 'info' | 'warning' | 'error';
        
        this.terminal.logMessage(level, message);
        
        return { success: true, outputs: { message }, nextHandle: 'success' };
    }
    
    private async executeDelayBlock(node: Node, _context: ExecutionContext): Promise<BlockResult> {
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
        const expression = this.resolveValue(String(data.expression || data.condition || 'true'), context);
        
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
        const expression = this.resolveValue(String(data.expression || ''), context);
        
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
    
    private async executeFileDownloadBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const url = this.resolveValue(String(data.url || ''), context);
        if (!url) {
            return { success: false, outputs: {}, error: 'No URL specified', nextHandle: 'fail' };
        }

        const encoding = String(data.encoding || 'auto');
        const saveAs   = Boolean(data.saveAs);
        const fileName = this.resolveValue(String(data.fileName || url.split('/').pop() || 'download'), context);
        const outputVar = String(data.outputVar || 'fileData');

        this.terminal.log('info', `   Downloading ${url}`);

        try {
            const response = await fetch(url, { signal: this.abortController?.signal });
            if (!response.ok) {
                return { success: false, outputs: { statusCode: response.status }, error: `HTTP ${response.status}`, nextHandle: 'fail' };
            }

            const mimeType = response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
            const blob = await response.blob();
            const size = blob.size;

            let fileData: string;
            const useText = encoding === 'text' || (encoding === 'auto' && mimeType.startsWith('text/'));

            if (useText) {
                fileData = await blob.text();
            } else {
                const ab = await blob.arrayBuffer();
                const bytes = new Uint8Array(ab);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                fileData = `data:${mimeType};base64,${btoa(binary)}`;
            }

            if (saveAs) {
                const anchor = document.createElement('a');
                anchor.href = URL.createObjectURL(blob);
                anchor.download = fileName;
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
            }

            const outputs = { fileData, fileName, mimeType, size };
            context.variables.set(outputVar, fileData);
            context.variables.set('fileName', fileName);
            context.variables.set('mimeType', mimeType);
            context.variables.set('fileSize', size);

            this.terminal.log('info', `   Downloaded ${fileName} (${(size / 1024).toFixed(1)} KB, ${mimeType})`);
            return { success: true, outputs, nextHandle: 'success' };

        } catch (error) {
            this.terminal.log('error', `   File download error: ${error}`);
            return { success: false, outputs: { error: String(error) }, error: String(error), nextHandle: 'fail' };
        }
    }

    private async executeFileUploadBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const accept    = String(data.accept || '*/*');
        const encoding  = String(data.encoding || 'auto');
        const outputVar = String(data.outputVar || 'uploadedFile');

        this.terminal.log('info', `   Waiting for file selection...`);

        try {
            const file = await new Promise<File>((resolve, reject) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = accept;
                input.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
                document.body.appendChild(input);

                const cleanup = () => document.body.removeChild(input);

                input.addEventListener('change', () => {
                    const f = input.files?.[0];
                    cleanup();
                    f ? resolve(f) : reject(new Error('No file selected'));
                });
                input.addEventListener('cancel', () => { cleanup(); reject(new Error('File selection cancelled')); });

                // Abort support
                this.abortController?.signal.addEventListener('abort', () => { cleanup(); reject(new Error('Execution aborted')); });

                input.click();
            });

            const mimeType = file.type || 'application/octet-stream';
            const size = file.size;
            const fileName = file.name;
            const useText = encoding === 'text' || (encoding === 'auto' && (file.type.startsWith('text/') || /\.(csv|txt|md|json|xml|html|yaml|yml)$/i.test(file.name)));

            const fileData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload  = () => resolve(reader.result as string);
                reader.onerror = () => reject(reader.error);
                useText ? reader.readAsText(file) : reader.readAsDataURL(file);
            });

            const outputs = { fileData, fileName, mimeType, size };
            context.variables.set(outputVar, fileData);
            context.variables.set('fileName', fileName);
            context.variables.set('mimeType', mimeType);
            context.variables.set('fileSize', size);

            this.terminal.log('info', `   Uploaded ${fileName} (${(size / 1024).toFixed(1)} KB, ${mimeType})`);
            return { success: true, outputs, nextHandle: 'success' };

        } catch (error) {
            this.terminal.log('error', `   File upload error: ${error}`);
            return { success: false, outputs: { error: String(error) }, error: String(error), nextHandle: 'fail' };
        }
    }

    private async executeFileStreamWriterBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const streamVar = String(data.streamVar || 'stream');
        const value     = this.resolveValue(String(data.value || ''), context);
        const sepRaw    = data.separator !== undefined ? String(data.separator) : '\\n';
        const sep       = sepRaw.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

        const existing = context.variables.get(streamVar);
        const accumulated = (typeof existing === 'string' && existing.length > 0)
            ? existing + sep + value
            : value;

        context.variables.set(streamVar, accumulated);

        this.terminal.log('debug', `   Stream "${streamVar}" += ${JSON.stringify(value).substring(0, 60)}`);
        return { success: true, outputs: { [streamVar]: accumulated }, nextHandle: 'out' };
    }

    private async executeFileStreamReaderBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        const sourceName = String(data.source || '');
        const mode      = String(data.mode || 'lines');
        const chunkSize = Math.max(1, Number(data.chunkSize) || 1);
        const skip      = Math.max(0, Number(data.skip)  || 0);
        const limit     = Math.max(0, Number(data.limit) || 0);
        const outputVar = String(data.outputVar || 'chunk');

        const rawSource = sourceName
            ? (context.variables.get(sourceName) ?? this.resolveValue(sourceName, context))
            : '';

        const source = String(rawSource);

        // Build chunks lazily — only materialize the slice we'll actually process.
        let chunks: string[];
        if (mode === 'lines') {
            let lines = source.split('\n');
            if (skip > 0)  lines = lines.slice(skip);
            if (limit > 0) lines = lines.slice(0, limit * chunkSize);
            if (chunkSize === 1) {
                chunks = lines;
            } else {
                chunks = [];
                for (let i = 0; i < lines.length; i += chunkSize) {
                    chunks.push(lines.slice(i, i + chunkSize).join('\n'));
                }
            }
        } else if (mode === 'chars') {
            const start = skip * chunkSize;
            const end   = limit > 0 ? start + limit * chunkSize : source.length;
            chunks = [];
            for (let i = start; i < Math.min(end, source.length); i += chunkSize) {
                chunks.push(source.slice(i, i + chunkSize));
            }
        } else {
            // bytes: base64 data URI or raw base64
            const b64 = source.includes(',') ? source.split(',')[1] : source;
            const stride = Math.ceil(chunkSize * 4 / 3);
            const start  = skip * stride;
            const end    = limit > 0 ? start + limit * stride : b64.length;
            chunks = [];
            for (let i = start; i < Math.min(end, b64.length); i += stride) {
                chunks.push(b64.slice(i, i + stride));
            }
        }

        const chunkCount = chunks.length;
        // totalLines = actual lines being processed (respects skip and limit).
        const totalLines = chunks.length * chunkSize;

        this.terminal.log('debug', `   Stream Reader: ${chunkCount} chunks (mode=${mode}, chunkSize=${chunkSize}${skip > 0 ? `, skip=${skip}` : ''}${limit > 0 ? `, limit=${limit}` : ''})`);

        context.variables.set('chunkCount', chunkCount);
        context.variables.set('totalLines', totalLines);

        const eachEdges = this.edges.filter(e =>
            e.source === node.id &&
            e.type === EdgeType.Execution &&
            e.sourceHandle === 'each'
        );

        for (let i = 0; i < chunks.length; i++) {
            if (this.abortController?.signal.aborted) throw new Error('Execution aborted');

            // Yield to the event loop every 50 iterations so the browser stays responsive.
            if (i > 0 && i % 50 === 0) {
                this.terminal.log('debug', `   ... ${i}/${chunkCount} chunks processed`);
                await new Promise<void>(resolve => setTimeout(resolve, 0));
            }

            context.variables.set('chunkIndex', i);
            context.variables.set('chunkCount', chunkCount);
            context.variables.set(outputVar, chunks[i]);
            context.variables.set('chunk', chunks[i]);

            for (const edge of eachEdges) {
                const targetNode = this.nodes.get(edge.target);
                if (targetNode) await this.executeNode(targetNode, context);
            }
        }

        return {
            success: true,
            outputs: { chunkCount, totalLines, lastChunk: chunks[chunks.length - 1] ?? '' },
            nextHandle: 'done'
        };
    }

    private async executeLoopBlock(node: Node, context: ExecutionContext): Promise<BlockResult> {
        const data = node.data || {};
        let items: any[] = [];
        
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
        
        context.variables.set('loopItems', items);
        context.variables.set('loopCount', items.length);

        const eachEdges = this.edges.filter(e =>
            e.source === node.id &&
            e.type === EdgeType.Execution &&
            e.sourceHandle === 'each'
        );

        for (let i = 0; i < items.length; i++) {
            if (this.abortController?.signal.aborted) {
                throw new Error('Execution aborted');
            }

            // Yield every 50 iterations to keep the browser responsive on large arrays.
            if (i > 0 && i % 50 === 0) {
                await new Promise<void>(resolve => setTimeout(resolve, 0));
            }

            context.variables.set('loopIndex', i);
            context.variables.set('loopItem', items[i]);

            this.terminal.log('info', `   🔄 Iteration ${i + 1}/${items.length}`);

            for (const edge of eachEdges) {
                const targetNode = this.nodes.get(edge.target);
                if (targetNode) {
                    await this.executeNode(targetNode, context);
                }
            }
        }
        
        const outputs: Record<string, any> = {
            items,
            count: items.length,
            loopIndex: items.length - 1,
            loopItem: items[items.length - 1]
        };
        
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
        const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(p => p !== '');
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


