import { Component, For } from 'solid-js';
import { logs, isRunning, isExpanded, terminalActions } from '../store/terminal-store';

const TerminalPanel: Component = () => {
    let bodyRef: HTMLDivElement | undefined;

    const scrollToBottom = () => {
        if (bodyRef && isExpanded()) {
            bodyRef.scrollTop = bodyRef.scrollHeight;
        }
    };

    // Auto-scroll on new log
    // (createEffect would cause re-renders; we'll call imperatively from terminal-store if needed)

    return (
        <div class={`terminal${isExpanded() ? ' expanded' : ' collapsed'}`}>
            <div class="terminal-header" onClick={() => terminalActions.toggle()}>
                <div class="terminal-title">
                    {isRunning() && <span class="terminal-running-dot" />}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                    </svg>
                    Terminal
                    <span style="font-size:11px;color:var(--ink-ghost);font-family:var(--font-mono)">
                        {logs.length > 0 ? `${logs.length} entries` : ''}
                    </span>
                </div>
                <div style="display:flex;gap:4px;align-items:center">
                    <button
                        style="font-size:11px;color:var(--ink-muted);padding:0 6px;border-radius:4px;"
                        title="Clear terminal"
                        onClick={(e) => { e.stopPropagation(); terminalActions.clear(); }}
                    >Clear</button>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        style={isExpanded() ? 'transform:rotate(180deg)' : ''}>
                        <polyline points="18 15 12 9 6 15"/>
                    </svg>
                </div>
            </div>
            <div class="terminal-body" ref={bodyRef}>
                <For each={logs.slice(-500)}>
                    {(entry) => (
                        <div class={`log-row log-${entry.level}`}>
                            <span class="log-time">{entry.ts}</span>
                            <span class="log-msg">{entry.message}</span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};

export default TerminalPanel;
