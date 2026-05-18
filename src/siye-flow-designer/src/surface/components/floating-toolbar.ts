/**
 * Floating Toolbar Component
 * Bottom floating panel with tools, zoom controls, and actions
 */

import { BaseComponent } from '../utils/base-component';
import { DOMUpdater } from '../utils/dom-updater';

export interface FloatingToolbarCallbacks {
    onSelectCanvasTool?: (tool: 'pointer' | 'hand') => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onFitToScreen?: () => void;
    onRun?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onStep?: () => void;
    onStop?: () => void;
    onTerminalToggle?: (visible: boolean) => void;
    onInspectorToggle?: () => void;
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
                <div class="toolbar-group toolbar-canvas-tools">
                    <button type="button" class="toolbar-btn toolbar-btn-tool active" id="tool-hand" title="Hand — pan by dragging empty canvas (H)">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M7.5 1.5a1.5 1.5 0 0 1 3 0V5h1.5a1 1 0 0 1 1 1v2.5a3 3 0 0 1-3 3H9v3.5a1.5 1.5 0 0 1-3 0V8.5H5a3 3 0 0 1-3-3V6a1 1 0 0 1 1-1h1.5V1.5z"/>
                        </svg>
                    </button>
                    <button type="button" class="toolbar-btn toolbar-btn-tool" id="tool-pointer" title="Pointer — select blocks; pan with middle mouse or Hand tool (V)">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M3.5 2.036L13 8.5 8.5 9.5 7 14l-1.5-5.5L3.5 2.036z"/>
                        </svg>
                    </button>
                </div>
                <div class="toolbar-separator"></div>
                <div class="toolbar-group">
                    <button class="toolbar-btn" id="zoom-out" title="Zoom Out (-) — Ctrl+wheel on canvas">
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
                <div class="toolbar-group toolbar-execution-group">
                    <button class="toolbar-btn toolbar-btn-run" id="run-btn" title="Run Workflow (Ctrl+Enter)">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 2.5a.5.5 0 0 1 .724-.447l9 5.5a.5.5 0 0 1 0 .894l-9 5.5A.5.5 0 0 1 4 13.5v-11z"/>
                        </svg>
                        <span>Run</span>
                    </button>
                    <button class="toolbar-btn toolbar-btn-pause" id="pause-btn" title="Pause (Space)" style="display:none">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M5 3h2v10H5zM9 3h2v10H9z"/>
                        </svg>
                    </button>
                    <button class="toolbar-btn toolbar-btn-resume" id="resume-btn" title="Resume (Space)" style="display:none">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 2.5a.5.5 0 0 1 .724-.447l9 5.5a.5.5 0 0 1 0 .894l-9 5.5A.5.5 0 0 1 4 13.5v-11z"/>
                        </svg>
                    </button>
                    <button class="toolbar-btn toolbar-btn-step" id="step-btn" title="Step (S)" style="display:none">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M4 3v10M8 8l4-3.5v7z" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="toolbar-btn toolbar-btn-stop" id="stop-btn" title="Stop (Esc)" style="display:none">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <rect x="3" y="3" width="10" height="10" rx="1"/>
                        </svg>
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
                    <button class="toolbar-btn" id="inspector-toggle" title="Variable Inspector (I)" style="display:none">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="2" y="2" width="12" height="12" rx="2"/>
                            <path d="M5 5h1M5 8h6M5 11h4"/>
                            <circle cx="11" cy="5" r="1.5" fill="currentColor" stroke="none"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    private setupEventHandlers(): void {
        const handBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#tool-hand');
        const pointerBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#tool-pointer');
        if (handBtn) {
            this.addEventListener(handBtn, 'click', () => {
                this.callbacks.onSelectCanvasTool?.('hand');
                this.setCanvasToolIndicator('hand');
            });
        }
        if (pointerBtn) {
            this.addEventListener(pointerBtn, 'click', () => {
                this.callbacks.onSelectCanvasTool?.('pointer');
                this.setCanvasToolIndicator('pointer');
            });
        }

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

        const runBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#run-btn');
        const pauseBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#pause-btn');
        const resumeBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#resume-btn');
        const stepBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#step-btn');
        const stopBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#stop-btn');

        if (runBtn) {
            this.addEventListener(runBtn, 'click', () => {
                this.callbacks.onRun?.();
                this.emit('run', {});
            });
        }
        if (pauseBtn) {
            this.addEventListener(pauseBtn, 'click', () => {
                this.callbacks.onPause?.();
                this.emit('pause', {});
            });
        }
        if (resumeBtn) {
            this.addEventListener(resumeBtn, 'click', () => {
                this.callbacks.onResume?.();
                this.emit('resume', {});
            });
        }
        if (stepBtn) {
            this.addEventListener(stepBtn, 'click', () => {
                this.callbacks.onStep?.();
                this.emit('step', {});
            });
        }
        if (stopBtn) {
            this.addEventListener(stopBtn, 'click', () => {
                this.callbacks.onStop?.();
                this.emit('stop', {});
            });
        }

        const terminalBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#terminal-toggle');
        if (terminalBtn) {
            this.addEventListener(terminalBtn, 'click', () => {
                this.toggleTerminal();
            });
        }

        const inspectorBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#inspector-toggle');
        if (inspectorBtn) {
            this.addEventListener(inspectorBtn, 'click', () => {
                this.callbacks.onInspectorToggle?.();
                this.emit('inspectorToggle', {});
            });
        }

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
                case ' ':
                    event.preventDefault();
                    this.emit('togglePauseResume', {});
                    break;
                case 's':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.emit('step', {});
                        this.callbacks.onStep?.();
                    }
                    break;
                case 'i':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.callbacks.onInspectorToggle?.();
                        this.emit('inspectorToggle', {});
                    }
                    break;
                case 'h':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.callbacks.onSelectCanvasTool?.('hand');
                        this.setCanvasToolIndicator('hand');
                    }
                    break;
                case 'v':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.callbacks.onSelectCanvasTool?.('pointer');
                        this.setCanvasToolIndicator('pointer');
                    }
                    break;
            }
        });
    }

    setCanvasToolIndicator(tool: 'pointer' | 'hand'): void {
        const handBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#tool-hand');
        const pointerBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#tool-pointer');
        if (handBtn) {
            if (tool === 'hand') {
                DOMUpdater.addClasses(handBtn, 'active');
            } else {
                DOMUpdater.removeClasses(handBtn, 'active');
            }
        }
        if (pointerBtn) {
            if (tool === 'pointer') {
                DOMUpdater.addClasses(pointerBtn, 'active');
            } else {
                DOMUpdater.removeClasses(pointerBtn, 'active');
            }
        }
    }

    updateExecutionState(state: 'idle' | 'running' | 'paused' | 'stepping'): void {
        const runBtn = DOMUpdater.query<HTMLElement>(this.container, '#run-btn');
        const pauseBtn = DOMUpdater.query<HTMLElement>(this.container, '#pause-btn');
        const resumeBtn = DOMUpdater.query<HTMLElement>(this.container, '#resume-btn');
        const stepBtn = DOMUpdater.query<HTMLElement>(this.container, '#step-btn');
        const stopBtn = DOMUpdater.query<HTMLElement>(this.container, '#stop-btn');
        const inspectorBtn = DOMUpdater.query<HTMLElement>(this.container, '#inspector-toggle');

        if (!runBtn) return;

        const show = (el: HTMLElement | null) => { if (el) el.style.display = ''; };
        const hide = (el: HTMLElement | null) => { if (el) el.style.display = 'none'; };

        switch (state) {
            case 'idle':
                show(runBtn);
                hide(pauseBtn);
                hide(resumeBtn);
                hide(stepBtn);
                hide(stopBtn);
                hide(inspectorBtn);
                break;
            case 'running':
                hide(runBtn);
                show(pauseBtn);
                hide(resumeBtn);
                hide(stepBtn);
                show(stopBtn);
                hide(inspectorBtn);
                break;
            case 'paused':
            case 'stepping':
                hide(runBtn);
                hide(pauseBtn);
                show(resumeBtn);
                show(stepBtn);
                show(stopBtn);
                show(inspectorBtn);
                break;
        }
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

