/**
 * Terminal store — implements TerminalSink for the executor.
 */
import { createStore, produce } from 'solid-js/store';
import { createSignal } from 'solid-js';
import type { TerminalSink } from '../core/terminal-sink';

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface LogEntry {
    id: number;
    ts: string;
    level: LogLevel;
    message: string;
    blockId?: string;
}

let _id = 0;

const [logs, setLogs] = createStore<LogEntry[]>([]);
const [isRunning, setIsRunning] = createSignal(false);
const [isExpanded, setIsExpanded] = createSignal(false);

export { logs, isRunning, isExpanded };

export const terminalActions = {
    clear(): void { setLogs([]); },
    expand(): void { setIsExpanded(true); },
    collapse(): void { setIsExpanded(false); },
    toggle(): void { setIsExpanded(v => !v); },
};

function push(level: LogLevel, message: string, blockId?: string): void {
    const now = new Date();
    const ts = now.toLocaleTimeString();
    // cap at 2000 entries to prevent memory growth
    setLogs(produce(l => {
        if (l.length > 2000) l.splice(0, l.length - 1800);
        l.push({ id: _id++, ts, level, message, blockId });
    }));
}

/** TerminalSink implementation — passed to BrowserWorkflowExecutor */
export const terminalSink: TerminalSink = {
    log(level, message) { push(level as LogLevel, message); },
    logHttpRequest(method, url) { push('info', `→ ${method} ${url}`); },
    logHttpResponse(status, statusText) { push(status < 400 ? 'success' : 'error', `← ${status} ${statusText}`); },
    logBlockStart(blockId, label, _type) { push('debug', `  Executing: [${_type}] ${label}`, blockId); },
    logBlockEnd(blockId, label, success, duration) {
        push(success ? 'success' : 'error', `  ${success ? '✓' : '✗'} ${label} (${duration}ms)`, blockId);
    },
    logVariable(key, value) {
        const v = typeof value === 'object' ? JSON.stringify(value).substring(0, 120) : String(value);
        push('debug', `  ${key} = ${v}`);
    },
    logMessage(level, message) { push(level as LogLevel, message); },
    logWorkflowStart(name) { push('info', `▶ Starting workflow: ${name}`); },
    logWorkflowEnd(success, duration) {
        push(success ? 'success' : 'error',
            `${success ? '✓' : '✗'} Workflow ${success ? 'completed' : 'failed'} in ${(duration / 1000).toFixed(2)}s`);
    },
    setRunning(running) { setIsRunning(running); },
    expand() { setIsExpanded(true); },
};
