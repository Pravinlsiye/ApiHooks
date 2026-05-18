/**
 * Terminal Panel - Bottom panel showing execution logs with expand/collapse
 */

import { BaseComponent } from '../utils/base-component';
import { DOMUpdater } from '../utils/dom-updater';

export interface LogEntry {
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error' | 'debug' | 'block';
    message: string;
    blockId?: string;
    blockLabel?: string;
}

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
                        <svg class="terminal-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                        </svg>
                        <span>Terminal</span>
                        <span class="terminal-status ${this.isRunning ? 'running' : ''}">
                            ${this.isRunning ? '● Running' : '○ Idle'}
                        </span>
                    </div>
                    <div class="terminal-actions">
                        <button class="terminal-btn" id="terminal-clear" title="Clear">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                        <button class="terminal-btn" id="terminal-toggle" title="${this.isExpanded ? 'Collapse' : 'Expand'}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                ${this.isExpanded 
                                    ? '<polyline points="18 15 12 9 6 15"/>'
                                    : '<polyline points="6 9 12 15 18 9"/>'
                                }
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="terminal-body" id="terminal-body">
                    <div class="terminal-welcome">
                        <span class="terminal-prompt">$</span> SiyeFlow Workflow Executor
                    </div>
                    <div class="terminal-welcome">
                        <span class="terminal-prompt">$</span> Ready to execute workflows. Click "Run" to start.
                    </div>
                    <div class="terminal-logs" id="terminal-logs"></div>
                </div>
            </div>
        `;
        
        this.terminalBody = DOMUpdater.query<HTMLElement>(this.container, '#terminal-body');
        this.setupEventHandlers();
    }
    
    private setupEventHandlers(): void {
        const clearBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#terminal-clear');
        const toggleBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#terminal-toggle');
        const header = DOMUpdater.query<HTMLElement>(this.container, '.terminal-header');
        
        if (clearBtn) {
            this.addEventListener(clearBtn, 'click', (e) => {
                e.stopPropagation();
                this.clear();
            });
        }
        
        if (toggleBtn) {
            this.addEventListener(toggleBtn, 'click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
        
        if (header) {
            this.addEventListener(header, 'click', () => this.toggle());
        }
    }
    
    public toggle(): void {
        this.isExpanded = !this.isExpanded;
        const panel = DOMUpdater.query<HTMLElement>(this.container, '.terminal-panel');
        if (panel) {
            if (this.isExpanded) {
                DOMUpdater.addClasses(panel, 'expanded');
                DOMUpdater.removeClasses(panel, 'collapsed');
            } else {
                DOMUpdater.removeClasses(panel, 'expanded');
                DOMUpdater.addClasses(panel, 'collapsed');
            }
        }
        this.updateToggleButton();
        this.emit('toggle', { expanded: this.isExpanded });
    }
    
    private updateToggleButton(): void {
        const toggleBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#terminal-toggle');
        if (toggleBtn) {
            DOMUpdater.updateElement(toggleBtn, {
                html: `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${this.isExpanded 
                            ? '<polyline points="18 15 12 9 6 15"/>'
                            : '<polyline points="6 9 12 15 18 9"/>'
                        }
                    </svg>
                `,
                attributes: { title: this.isExpanded ? 'Collapse' : 'Expand' }
            });
        }
    }
    
    public expand(): void {
        if (!this.isExpanded) this.toggle();
    }
    
    public collapse(): void {
        if (this.isExpanded) this.toggle();
    }
    
    public show(): void {
        DOMUpdater.updateElement(this.container, { styles: { display: '' } });
    }
    
    public hide(): void {
        DOMUpdater.updateElement(this.container, { styles: { display: 'none' } });
    }
    
    public clear(): void {
        this.logs = [];
        const logsContainer = DOMUpdater.query<HTMLElement>(this.container, '#terminal-logs');
        if (logsContainer) {
            DOMUpdater.updateElement(logsContainer, { html: '' });
        }
        this.log('info', 'Terminal cleared');
    }
    
    public setRunning(running: boolean): void {
        this.isRunning = running;
        const status = DOMUpdater.query<HTMLElement>(this.container, '.terminal-status');
        if (status) {
            DOMUpdater.updateElement(status, {
                classes: ['terminal-status', running ? 'running' : ''].filter(Boolean),
                text: running ? '● Running' : '○ Idle'
            });
        }
    }
    
    public log(level: LogEntry['level'], message: string, blockId?: string, blockLabel?: string): void {
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            blockId,
            blockLabel
        };
        
        this.logs.push(entry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        this.appendLogEntry(entry);
        this.scrollToBottom();
    }
    
    public logWorkflowStart(workflowName: string): void {
        this.log('info', '═'.repeat(40));
        this.log('info', `▶ Starting workflow: ${workflowName}`);
        this.log('info', `  Time: ${new Date().toLocaleTimeString()}`);
        this.log('info', '─'.repeat(40));
    }
    
    public logWorkflowEnd(success: boolean, duration: number): void {
        this.log('info', '─'.repeat(40));
        if (success) {
            this.log('success', `✓ Workflow completed successfully`);
        } else {
            this.log('error', `✗ Workflow failed`);
        }
        this.log('info', `  Duration: ${duration}ms`);
        this.log('info', '═'.repeat(40));
    }
    
    public logBlockStart(blockId: string, blockLabel: string, blockType: string): void {
        this.log('block', `┌─ Executing: [${blockType}] ${blockLabel}`, blockId, blockLabel);
    }
    
    public logBlockEnd(blockId: string, blockLabel: string, success: boolean, duration: number): void {
        if (success) {
            this.log('success', `└─ ✓ Completed (${duration}ms)`, blockId, blockLabel);
        } else {
            this.log('error', `└─ ✗ Failed (${duration}ms)`, blockId, blockLabel);
        }
    }
    
    public logHttpRequest(method: string, url: string): void {
        this.log('debug', `   → ${method} ${url}`);
    }
    
    public logHttpResponse(status: number, statusText: string): void {
        const level = status >= 200 && status < 300 ? 'success' : 'error';
        this.log(level, `   ← ${status} ${statusText}`);
    }
    
    public logVariable(name: string, value: any): void {
        const displayValue = typeof value === 'object' 
            ? JSON.stringify(value).substring(0, 50) 
            : String(value).substring(0, 50);
        this.log('debug', `   📦 ${name} = ${displayValue}${String(value).length > 50 ? '...' : ''}`);
    }
    
    public logMessage(level: 'info' | 'warning' | 'error', message: string): void {
        this.log(level, `   📝 ${message}`);
    }
    
    private appendLogEntry(entry: LogEntry): void {
        const logsContainer = DOMUpdater.query<HTMLElement>(this.container, '#terminal-logs');
        if (!logsContainer) return;
        
        const time = entry.timestamp.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit'
        });
        
        const levelIcon = this.getLevelIcon(entry.level);
        
        const logEl = DOMUpdater.create('div', {
            className: `terminal-log-entry log-${entry.level}`,
            html: `
                <span class="log-time">${time}</span>
                <span class="log-level">${levelIcon}</span>
                <span class="log-message">${this.escapeHtml(entry.message)}</span>
            `
        });
        
        if (entry.blockId) {
            DOMUpdater.updateElement(logEl, {
                attributes: { 
                    'data-block-id': entry.blockId,
                    title: `Click to highlight block: ${entry.blockLabel || entry.blockId}`
                },
                styles: { cursor: 'pointer' }
            });
            logEl.addEventListener('click', () => {
                this.emit('blockClick', { blockId: entry.blockId });
            });
        }
        
        logsContainer.appendChild(logEl);
    }
    
    private getLevelIcon(level: LogEntry['level']): string {
        switch (level) {
            case 'info': return '<span class="log-icon-info">ℹ</span>';
            case 'success': return '<span class="log-icon-success">✓</span>';
            case 'warning': return '<span class="log-icon-warning">⚠</span>';
            case 'error': return '<span class="log-icon-error">✗</span>';
            case 'debug': return '<span class="log-icon-debug">○</span>';
            case 'block': return '<span class="log-icon-block">▸</span>';
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
    
    public getLogs(): LogEntry[] {
        return [...this.logs];
    }
    
    public exportLogs(): string {
        return this.logs.map(entry => {
            const time = entry.timestamp.toISOString();
            return `[${time}] [${entry.level.toUpperCase()}] ${entry.message}`;
        }).join('\n');
    }
}

