/**
 * TerminalSink — minimal interface the executor needs from a terminal.
 * Implemented by terminalStore in the Solid app.
 */
export interface TerminalSink {
    log(level: 'info' | 'success' | 'warning' | 'error' | 'debug', message: string): void;
    logHttpRequest(method: string, url: string): void;
    logHttpResponse(status: number, statusText: string): void;
    logBlockStart(blockId: string, label: string, type: string): void;
    logBlockEnd(blockId: string, label: string, success: boolean, duration: number): void;
    logVariable(key: string, value: any): void;
    logMessage(level: string, message: string): void;
    logWorkflowStart(name: string): void;
    logWorkflowEnd(success: boolean, duration: number): void;
    setRunning(running: boolean): void;
    expand(): void;
}
