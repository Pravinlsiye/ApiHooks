/**
 * Floating Toolbar Component
 * Bottom floating panel with tools, zoom controls, and actions
 */

import { BaseComponent } from '../utils/base-component';
import { DOMUpdater } from '../utils/dom-updater';

export interface FloatingToolbarCallbacks {
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onFitToScreen?: () => void;
    onRun?: () => void;
    onTerminalToggle?: (visible: boolean) => void;
}

export class FloatingToolbar extends BaseComponent {
    private terminalVisible: boolean = false;
    private callbacks: FloatingToolbarCallbacks;

    constructor(containerId: string, callbacks: FloatingToolbarCallbacks = {}) {
        super(containerId);
        this.callbacks = callbacks;
        this.render();
        this.setupEventHandlers();
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="floating-toolbar">
                <div class="toolbar-group">
                    <button class="toolbar-btn" id="zoom-out" title="Zoom Out (-)">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="7" cy="7" r="4.5"/>
                            <path d="M10.5 10.5L13.5 13.5"/>
                            <path d="M4.5 7h5"/>
                        </svg>
                    </button>
                    <button class="toolbar-btn" id="zoom-in" title="Zoom In (+)">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="7" cy="7" r="4.5"/>
                            <path d="M10.5 10.5L13.5 13.5"/>
                            <path d="M7 4.5v5M4.5 7h5"/>
                        </svg>
                    </button>
                    <button class="toolbar-btn" id="fit-screen" title="Fit to Screen (F)">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="2" y="2" width="12" height="12" rx="1"/>
                            <path d="M5 2v2H2M11 2v2h3M5 14v-2H2M11 14v-2h3"/>
                        </svg>
                    </button>
                </div>
                <div class="toolbar-separator"></div>
                <div class="toolbar-group">
                    <button class="toolbar-btn toolbar-btn-run" id="run-btn" title="Run Workflow">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 2.5a.5.5 0 0 1 .724-.447l9 5.5a.5.5 0 0 1 0 .894l-9 5.5A.5.5 0 0 1 4 13.5v-11z"/>
                        </svg>
                        <span>Run</span>
                    </button>
                </div>
                <div class="toolbar-separator"></div>
                <div class="toolbar-group">
                    <button class="toolbar-btn" id="terminal-toggle" title="Toggle Terminal (T)">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3zm1 0v10h10V3H3z"/>
                            <path d="M4.5 5.5l2 2-2 2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                            <path d="M7.5 10h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    private setupEventHandlers(): void {
        // Zoom buttons
        const zoomInBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#zoom-in');
        const zoomOutBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#zoom-out');
        const fitScreenBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#fit-screen');

        if (zoomInBtn) {
            this.addEventListener(zoomInBtn, 'click', () => {
                this.callbacks.onZoomIn?.();
                this.emit('zoomIn', {});
            });
        }
        if (zoomOutBtn) {
            this.addEventListener(zoomOutBtn, 'click', () => {
                this.callbacks.onZoomOut?.();
                this.emit('zoomOut', {});
            });
        }
        if (fitScreenBtn) {
            this.addEventListener(fitScreenBtn, 'click', () => {
                this.callbacks.onFitToScreen?.();
                this.emit('fitToScreen', {});
            });
        }

        // Run button
        const runBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#run-btn');
        if (runBtn) {
            this.addEventListener(runBtn, 'click', () => {
                this.callbacks.onRun?.();
                this.emit('run', {});
            });
        }

        // Terminal toggle
        const terminalBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#terminal-toggle');
        if (terminalBtn) {
            this.addEventListener(terminalBtn, 'click', () => {
                this.toggleTerminal();
            });
        }

        // Keyboard shortcuts
        this.addEventListener(document, 'keydown', (e: Event) => {
            const event = e as KeyboardEvent;
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            switch (event.key.toLowerCase()) {
                case '+':
                case '=':
                    this.callbacks.onZoomIn?.();
                    this.emit('zoomIn', {});
                    break;
                case '-':
                    this.callbacks.onZoomOut?.();
                    this.emit('zoomOut', {});
                    break;
                case 'f':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.callbacks.onFitToScreen?.();
                        this.emit('fitToScreen', {});
                    }
                    break;
                case 't':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.toggleTerminal();
                    }
                    break;
            }
        });
    }

    private toggleTerminal(): void {
        this.terminalVisible = !this.terminalVisible;

        const terminalBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#terminal-toggle');
        if (terminalBtn) {
            if (this.terminalVisible) {
                DOMUpdater.addClasses(terminalBtn, 'active');
            } else {
                DOMUpdater.removeClasses(terminalBtn, 'active');
            }
        }

        this.callbacks.onTerminalToggle?.(this.terminalVisible);
        this.emit('terminalToggle', { visible: this.terminalVisible });
    }

    isTerminalVisible(): boolean {
        return this.terminalVisible;
    }

    setTerminalVisible(visible: boolean): void {
        if (this.terminalVisible !== visible) {
            this.terminalVisible = visible;
            const terminalBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#terminal-toggle');
            if (terminalBtn) {
                if (visible) {
                    DOMUpdater.addClasses(terminalBtn, 'active');
                } else {
                    DOMUpdater.removeClasses(terminalBtn, 'active');
                }
            }
        }
    }
}

