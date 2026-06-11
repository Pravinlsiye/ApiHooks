import { Component, batch } from 'solid-js';
import { zoom, setZoom, setTool, tool, executionState } from '../store/designer-store';

interface Props {
    onFitToScreen: () => void;
}

// Executor singleton ref — imported lazily to avoid circular deps
let executorRef: any = null;
export const setExecutorRef = (e: any) => { executorRef = e; };

const FloatingToolbar: Component<Props> = (props) => {
    const es = executionState;
    const canRun     = () => es() === 'idle';
    const canPause   = () => es() === 'running';
    const canResume  = () => es() === 'paused' || es() === 'stepping';
    const canStop    = () => es() !== 'idle';

    const handleRun = async () => {
        const { runWorkflow } = await import('../core/executor-bridge');
        runWorkflow();
    };

    return (
        <div class="floating-toolbar">
            {/* Tool buttons */}
            <button
                class={`ft-btn${tool() === 'hand' ? ' active' : ''}`}
                title="Hand tool (H)"
                onClick={() => setTool('hand')}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.5 1.5a1.5 1.5 0 0 1 3 0V5h1.5a1 1 0 0 1 1 1v2.5a3 3 0 0 1-3 3H9v3.5a1.5 1.5 0 0 1-3 0V8.5H5a3 3 0 0 1-3-3V6a1 1 0 0 1 1-1h1.5V1.5z"/>
                </svg>
            </button>
            <button
                class={`ft-btn${tool() === 'pointer' ? ' active' : ''}`}
                title="Pointer tool (V)"
                onClick={() => setTool('pointer')}
            >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.5 2.036L13 8.5 8.5 9.5 7 14l-1.5-5.5L3.5 2.036z"/>
                </svg>
            </button>

            <div class="ft-sep" />

            {/* Zoom */}
            <button class="ft-btn" title="Zoom out (-)" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
            </button>
            <span style="font-size:11px;color:var(--ink-muted);min-width:36px;text-align:center;font-family:var(--font-mono)">
                {Math.round(zoom() * 100)}%
            </span>
            <button class="ft-btn" title="Zoom in (+)" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
            </button>
            <button class="ft-btn" title="Fit to screen (F)" onClick={props.onFitToScreen}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
            </button>

            <div class="ft-sep" />

            {/* Execution controls */}
            {canRun() && (
                <button class="ft-btn ft-run" title="Run workflow (Ctrl+Enter)" onClick={handleRun}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 2.5a.5.5 0 0 1 .724-.447l9 5.5a.5.5 0 0 1 0 .894l-9 5.5A.5.5 0 0 1 4 13.5v-11z"/>
                    </svg>
                    Run
                </button>
            )}
            {canPause() && (
                <button class="ft-btn" title="Pause" style="color:var(--warning)" onClick={() => executorRef?.pause()}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3h2v10H5zM9 3h2v10H9z"/></svg>
                </button>
            )}
            {canResume() && (
                <>
                    <button class="ft-btn" title="Resume" style="color:var(--accent)" onClick={() => executorRef?.resume()}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M4 2.5a.5.5 0 0 1 .724-.447l9 5.5a.5.5 0 0 1 0 .894l-9 5.5A.5.5 0 0 1 4 13.5v-11z"/>
                        </svg>
                    </button>
                    <button class="ft-btn" title="Step" style="color:var(--ink-secondary)" onClick={() => executorRef?.step()}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M4 3v10M8 8l4-3.5v7z" fill="currentColor"/>
                        </svg>
                    </button>
                </>
            )}
            {canStop() && (
                <button class="ft-btn" title="Stop" style="color:var(--error)" onClick={() => executorRef?.stop()}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="3" y="3" width="10" height="10" rx="1"/>
                    </svg>
                </button>
            )}
        </div>
    );
};

export default FloatingToolbar;
