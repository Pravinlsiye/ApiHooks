import { BaseComponent } from '../utils/BaseComponent';

/**
 * Log entry with timestamp, level, and message
 */
export interface LogEntry {
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error' | 'debug' | 'block';
    message: string;
    blockId?: string;
    blockLabel?: string;
}

/**
 * Terminal panel for displaying workflow execution logs
 * Similar to a CLI terminal experience in the browser
 */
export class TerminalPanel extends BaseComponent {
    private logs: LogEntry[] = [];
    private isExpanded: boolean = false;
    private isRunning: boolean = false;
    private terminalBody: HTMLElement | null = null;
    private maxLogs: number = 1000;
    
    constructor(containerId: string) {
        super(containerId);
        this.render();
    }
    
    private render(): void {
        this.container.innerHTML = `
            <div class="terminal-panel ${this.isExpanded ? 'expanded' : 'collapsed'}">
                <div class="terminal-header">
                    <div class="terminal-title">
                        <span class="terminal-icon">▶</span>
                        <span>Terminal</span>
                        <span class="terminal-status ${this.isRunning ? 'running' : ''}">
                            ${this.isRunning ? '● Running' : '○ Idle'}
                        </span>
                    </div>
                    <div class="terminal-actions">
                        <button class="terminal-btn" id="terminal-clear" title="Clear">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                        <button class="terminal-btn" id="terminal-toggle" title="${this.isExpanded ? 'Collapse' : 'Expand'}">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                ${this.isExpanded 
                                    ? '<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>'
                                    : '<path d="M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8z"/>'
                                }
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="terminal-body" id="terminal-body">
                    <div class="terminal-welcome">
                        <span class="terminal-prompt">$</span> SiyeFlow Workflow Executor v1.0.0
                    </div>
                    <div class="terminal-welcome">
                        <span class="terminal-prompt">$</span> Ready to execute workflows. Click "Run" to start.
                    </div>
                    <div class="terminal-logs" id="terminal-logs"></div>
                </div>
            </div>
        `;
        
        this.terminalBody = this.container.querySelector('#terminal-body');
        this.setupEventHandlers();
    }
    
    private setupEventHandlers(): void {
        const clearBtn = this.container.querySelector('#terminal-clear') as HTMLElement | null;
        const toggleBtn = this.container.querySelector('#terminal-toggle') as HTMLElement | null;
        const header = this.container.querySelector('.terminal-header') as HTMLElement | null;
        
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', () => this.clear());
        }
        
        if (toggleBtn) {
            this.addEventListener(toggleBtn, 'click', () => this.toggle());
        }
        
        if (header) {
            this.addEventListener(header, 'dblclick', () => this.toggle());
        }
    }
    
    /**
     * Toggle expanded/collapsed state
     */
    public toggle(): void {
        this.isExpanded = !this.isExpanded;
        const panel = this.container.querySelector('.terminal-panel');
        if (panel) {
            panel.classList.toggle('expanded', this.isExpanded);
            panel.classList.toggle('collapsed', !this.isExpanded);
        }
        this.emit('toggle', { expanded: this.isExpanded });
    }
    
    /**
     * Expand the terminal
     */
    public expand(): void {
        if (!this.isExpanded) {
            this.toggle();
        }
    }
    
    /**
     * Collapse the terminal
     */
    public collapse(): void {
        if (this.isExpanded) {
            this.toggle();
        }
    }
    
    /**
     * Clear all logs
     */
    public clear(): void {
        this.logs = [];
        const logsContainer = this.container.querySelector('#terminal-logs');
        if (logsContainer) {
            logsContainer.innerHTML = '';
        }
        this.log('info', 'Terminal cleared');
    }
    
    /**
     * Set running state
     */
    public setRunning(running: boolean): void {
        this.isRunning = running;
        const status = this.container.querySelector('.terminal-status');
        if (status) {
            status.className = `terminal-status ${running ? 'running' : ''}`;
            status.textContent = running ? '● Running' : '○ Idle';
        }
    }
    
    /**
     * Log a message
     */
    public log(level: LogEntry['level'], message: string, blockId?: string, blockLabel?: string): void {
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            blockId,
            blockLabel
        };
        
        this.logs.push(entry);
        
        // Trim logs if exceeding max
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        this.appendLogEntry(entry);
        this.scrollToBottom();
    }
    
    /**
     * Log workflow start
     */
    public logWorkflowStart(workflowName: string): void {
        this.log('info', '═'.repeat(50));
        this.log('info', `▶ Starting workflow: ${workflowName}`);
        this.log('info', `  Time: ${new Date().toLocaleTimeString()}`);
        this.log('info', '─'.repeat(50));
    }
    
    /**
     * Log workflow end
     */
    public logWorkflowEnd(success: boolean, duration: number): void {
        this.log('info', '─'.repeat(50));
        if (success) {
            this.log('success', `✓ Workflow completed successfully`);
        } else {
            this.log('error', `✗ Workflow failed`);
        }
        this.log('info', `  Duration: ${duration}ms`);
        this.log('info', '═'.repeat(50));
    }
    
    /**
     * Log block execution start
     */
    public logBlockStart(blockId: string, blockLabel: string, blockType: string): void {
        this.log('block', `┌─ Executing: [${blockType}] ${blockLabel}`, blockId, blockLabel);
    }
    
    /**
     * Log block execution end
     */
    public logBlockEnd(blockId: string, blockLabel: string, success: boolean, duration: number): void {
        if (success) {
            this.log('success', `└─ ✓ Completed (${duration}ms)`, blockId, blockLabel);
        } else {
            this.log('error', `└─ ✗ Failed (${duration}ms)`, blockId, blockLabel);
        }
    }
    
    /**
     * Log HTTP request
     */
    public logHttpRequest(method: string, url: string): void {
        this.log('debug', `   → ${method} ${url}`);
    }
    
    /**
     * Log HTTP response
     */
    public logHttpResponse(status: number, statusText: string): void {
        const level = status >= 200 && status < 300 ? 'success' : 'error';
        this.log(level, `   ← ${status} ${statusText}`);
    }
    
    /**
     * Log variable set
     */
    public logVariable(name: string, value: any): void {
        const displayValue = typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 50);
        this.log('debug', `   📦 ${name} = ${displayValue}${String(value).length > 50 ? '...' : ''}`);
    }
    
    /**
     * Log user message (from Log block)
     */
    public logMessage(level: 'info' | 'warning' | 'error', message: string): void {
        this.log(level, `   📝 ${message}`);
    }
    
    private appendLogEntry(entry: LogEntry): void {
        const logsContainer = this.container.querySelector('#terminal-logs');
        if (!logsContainer) return;
        
        const logEl = document.createElement('div');
        logEl.className = `terminal-log-entry log-${entry.level}`;
        
        const time = entry.timestamp.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            fractionalSecondDigits: 3
        });
        
        const levelIcon = this.getLevelIcon(entry.level);
        
        logEl.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-level">${levelIcon}</span>
            <span class="log-message">${this.escapeHtml(entry.message)}</span>
        `;
        
        if (entry.blockId) {
            logEl.dataset.blockId = entry.blockId;
            logEl.style.cursor = 'pointer';
            logEl.title = `Click to highlight block: ${entry.blockLabel}`;
            logEl.addEventListener('click', () => {
                this.emit('blockClick', { blockId: entry.blockId });
            });
        }
        
        logsContainer.appendChild(logEl);
    }
    
    private getLevelIcon(level: LogEntry['level']): string {
        switch (level) {
            case 'info': return '<span style="color: #58a6ff;">ℹ</span>';
            case 'success': return '<span style="color: #3fb950;">✓</span>';
            case 'warning': return '<span style="color: #d29922;">⚠</span>';
            case 'error': return '<span style="color: #f85149;">✗</span>';
            case 'debug': return '<span style="color: #8b949e;">○</span>';
            case 'block': return '<span style="color: #a371f7;">▸</span>';
            default: return '';
        }
    }
    
    private scrollToBottom(): void {
        if (this.terminalBody) {
            this.terminalBody.scrollTop = this.terminalBody.scrollHeight;
        }
    }
    
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Get all logs
     */
    public getLogs(): LogEntry[] {
        return [...this.logs];
    }
    
    /**
     * Export logs as text
     */
    public exportLogs(): string {
        return this.logs.map(entry => {
            const time = entry.timestamp.toISOString();
            return `[${time}] [${entry.level.toUpperCase()}] ${entry.message}`;
        }).join('\n');
    }
}

