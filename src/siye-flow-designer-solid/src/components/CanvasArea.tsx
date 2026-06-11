import { Component, createSignal, onMount, onCleanup, For, createEffect, batch } from 'solid-js';
import {
    blocks, connections, selectedBlockId, zoom, pan,
    tool, setTool, setPan, setZoom,
    storeActions, createDefaultBlock,
    settingsPanelBlockId, setSettingsPanelBlockId,
} from '../store/designer-store';
import { BlockType } from '../models/workflow-models';
import { VisualBlock, VisualConnection, Position } from '../models/visual-models';
import { connectionPathToSVG, getBezierMidpoint } from '../utils/connection-path';
import { BLOCK_COLORS } from '../models/workflow-models';
import BlockComponent from './Block';
import FloatingToolbar from './FloatingToolbar';
import BlockSettingsPanel from './BlockSettingsPanel';
import MinimapComponent from './Minimap';
import TerminalPanel from './TerminalPanel';

const CANVAS_SIZE = 8000;
const CANVAS_CENTER = CANVAS_SIZE / 2;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

// ─── Drag state (refs, not signals, to avoid re-renders on every move) ────────
let dragBlockId: string | null = null;
let dragOffset: Position = { x: 0, y: 0 };
let isPanning = false;
let panStart: Position = { x: 0, y: 0 };

// ─── Wire state ───────────────────────────────────────────────────────────────
interface WireState {
    active: boolean;
    sourceBlockId: string;
    sourcePortName: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}
const [wire, setWire] = createSignal<WireState>({
    active: false, sourceBlockId: '', sourcePortName: '',
    startX: 0, startY: 0, endX: 0, endY: 0,
});

// ─── Block toolbar position signal ────────────────────────────────────────────
export const [toolbarPos, setToolbarPos] = createSignal<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

function computeToolbarPos(blockId: string | null, z: number): void {
    if (!blockId) { setToolbarPos(p => ({ ...p, visible: false })); return; }
    const b = blocks[blockId];
    if (!b) { setToolbarPos(p => ({ ...p, visible: false })); return; }
    const bx = b.position.x + b.width / 2;
    const by = b.position.y;
    const wx = CANVAS_CENTER + (bx - CANVAS_CENTER) * z;
    const wy = CANVAS_CENTER + (by - CANVAS_CENTER) * z - 44;
    setToolbarPos({ x: wx, y: wy, visible: true });
}

const CanvasArea: Component = () => {
    let containerRef: HTMLDivElement | undefined;
    let wrapperRef: HTMLDivElement | undefined;

    // Derived transform strings
    const wrapperTransform = () => {
        const p = pan();
        return `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`;
    };
    const layerTransform = () => `scale(${zoom()})`;

    // Update toolbar whenever selection/zoom/pan changes
    createEffect(() => {
        const bid = selectedBlockId();
        const z = zoom();
        computeToolbarPos(bid, z);
    });

    // ── Pointer: block drag ──────────────────────────────────────────────────
    const startBlockDrag = (blockId: string, e: PointerEvent) => {
        e.stopPropagation();
        const b = blocks[blockId];
        if (!b) return;
        dragBlockId = blockId;
        const z = zoom();
        // Convert from screen-space to canvas-layer space
        dragOffset = {
            x: (e.clientX - wrapperRef!.getBoundingClientRect().left) / z - b.position.x,
            y: (e.clientY - wrapperRef!.getBoundingClientRect().top)  / z - b.position.y,
        };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        storeActions.selectBlock(blockId);
    };

    // ── Pointer: canvas pan ──────────────────────────────────────────────────
    const startPan = (e: PointerEvent) => {
        if (dragBlockId || wire().active) return;
        if (e.button === 1 || tool() === 'hand') {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
        }
    };

    const handlePointerMove = (e: PointerEvent) => {
        if (dragBlockId) {
            const z = zoom();
            const rect = wrapperRef!.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / z - dragOffset.x;
            const ny = (e.clientY - rect.top)  / z - dragOffset.y;
            storeActions.moveBlock(dragBlockId, { x: nx, y: ny });
            computeToolbarPos(dragBlockId, z);
        } else if (isPanning) {
            const dx = e.clientX - panStart.x;
            const dy = e.clientY - panStart.y;
            panStart = { x: e.clientX, y: e.clientY };
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        } else if (wire().active) {
            const rect = wrapperRef!.getBoundingClientRect();
            setWire(w => ({ ...w, endX: e.clientX - rect.left, endY: e.clientY - rect.top }));
        }
    };

    const handlePointerUp = (e: PointerEvent) => {
        dragBlockId = null;
        isPanning = false;
        if (wire().active && e.button === 0) {
            // Cancel if no port drop (port drops handle their own completion)
            setWire(w => ({ ...w, active: false }));
        }
    };

    const handleCanvasPointerDown = (e: PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.workflow-block') || target.closest('.block-toolbar') || target.closest('.settings-panel')) return;
        storeActions.selectBlock(null);
        if (e.button === 0 && tool() === 'hand') startPan(e);
        if (e.button === 1) startPan(e);
    };

    // ── Ctrl+wheel zoom ──────────────────────────────────────────────────────
    const handleWheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
    };

    // ── Keyboard ─────────────────────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        if (e.key === 'Escape' && wire().active) {
            setWire(w => ({ ...w, active: false }));
            return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId()) {
            storeActions.deleteBlock(selectedBlockId()!);
        }
        if (e.key === 'h') setTool('hand');
        if (e.key === 'v') setTool('pointer');
        if (e.key === 'f') fitToScreen();
    };

    const fitToScreen = () => {
        const blockList = Object.values(blocks);
        if (blockList.length === 0) return;
        const minX = Math.min(...blockList.map(b => b.position.x));
        const maxX = Math.max(...blockList.map(b => b.position.x + b.width));
        const minY = Math.min(...blockList.map(b => b.position.y));
        const maxY = Math.max(...blockList.map(b => b.position.y + b.height));
        const cw = containerRef!.clientWidth;
        const ch = containerRef!.clientHeight;
        const pad = 80;
        const newZoom = Math.min(1, (cw - pad) / (maxX - minX), (ch - pad) / (maxY - minY));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        batch(() => {
            setZoom(newZoom);
            setPan({ x: (CANVAS_CENTER - cx) * newZoom, y: (CANVAS_CENTER - cy) * newZoom });
        });
    };

    // ── Drop from palette ────────────────────────────────────────────────────
    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer?.getData('application/siyeflow-block-type') as BlockType;
        if (!type) return;
        const rect = wrapperRef!.getBoundingClientRect();
        const z = zoom();
        const x = (e.clientX - rect.left) / z - 110;
        const y = (e.clientY - rect.top)  / z - 60;
        const block = createDefaultBlock(type, { x, y });
        storeActions.addBlock(block);
        storeActions.selectBlock(block.id);
    };

    onMount(() => {
        document.addEventListener('keydown', handleKeyDown);
        // Restore default zoom position
        setPan({ x: 0, y: 0 });
        setZoom(1);
    });
    onCleanup(() => {
        document.removeEventListener('keydown', handleKeyDown);
    });

    // ── Port wiring ──────────────────────────────────────────────────────────
    const startWire = (blockId: string, portName: string, portEl: HTMLElement) => {
        const rect = wrapperRef!.getBoundingClientRect();
        const pr = portEl.getBoundingClientRect();
        const sx = pr.left + pr.width / 2 - rect.left;
        const sy = pr.top  + pr.height / 2 - rect.top;
        setWire({ active: true, sourceBlockId: blockId, sourcePortName: portName, startX: sx, startY: sy, endX: sx, endY: sy });
    };

    const completeWire = (targetBlockId: string, targetPortName: string) => {
        const w = wire();
        if (!w.active) return;
        if (w.sourceBlockId !== targetBlockId) {
            storeActions.addConnection({
                id: `conn_${Date.now()}`,
                type: 'execution' as any,
                sourceBlockId: w.sourceBlockId,
                sourcePortName: w.sourcePortName,
                targetBlockId,
                targetPortName,
            });
        }
        setWire(w => ({ ...w, active: false }));
    };

    return (
        <div class="canvas-area">
            <div
                ref={containerRef}
                class="canvas-container"
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onWheel={handleWheel}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
            >
                {/* Pan wrapper */}
                <div
                    ref={wrapperRef}
                    class={`canvas-wrapper${isPanning ? ' panning' : ''}${wire().active ? ' connecting' : ''}`}
                    style={{ transform: wrapperTransform() }}
                >
                    {/* Zoom layer */}
                    <div class="canvas-layer" style={{ transform: layerTransform() }}>
                        {/* SVG connections */}
                        <svg class="connections-layer">
                            <For each={Object.values(connections)}>
                                {(conn) => <ConnectionLine conn={conn} />}
                            </For>
                            {wire().active && (() => {
                                const w = wire();
                                const path = connectionPathToSVG(w.startX, w.startY, w.endX, w.endY);
                                return <path class="connection-preview" d={path} />;
                            })()}
                        </svg>
                        {/* Blocks */}
                        <For each={Object.values(blocks)}>
                            {(block) => (
                                <BlockComponent
                                    block={block}
                                    onPointerDown={(e) => startBlockDrag(block.id, e)}
                                    onPortOutput={(portName, el) => startWire(block.id, portName, el)}
                                    onPortInput={(portName) => completeWire(block.id, portName)}
                                />
                            )}
                        </For>
                    </div>

                    {/* Block toolbar — in wrapper space (not scaled layer) */}
                    {toolbarPos().visible && selectedBlockId() && (
                        <BlockToolbarOverlay blockId={selectedBlockId()!} pos={toolbarPos()} />
                    )}
                </div>

                {/* Floating toolbar */}
                <div class="floating-toolbar-container">
                    <FloatingToolbar onFitToScreen={fitToScreen} />
                </div>

                {/* Settings panel */}
                <div class="settings-panel-container">
                    <BlockSettingsPanel />
                </div>

                {/* Minimap */}
                <div class="minimap-container">
                    <MinimapComponent
                        containerEl={() => containerRef}
                        wrapperEl={() => wrapperRef}
                    />
                </div>
            </div>

            {/* Terminal */}
            <TerminalPanel />
        </div>
    );
};

// ─── Connection line ──────────────────────────────────────────────────────────
const ConnectionLine: Component<{ conn: VisualConnection }> = (props) => {
    const getPortPos = (blockId: string, portName: string, side: 'output' | 'input') => {
        const el = document.querySelector(
            `[data-block-id="${blockId}"] [data-port-name="${portName}"][data-port-side="${side}"]`
        );
        if (!el) return null;
        const wrapperEl = document.querySelector('.canvas-wrapper') as HTMLElement;
        if (!wrapperEl) return null;
        const pr = el.getBoundingClientRect();
        const wr = wrapperEl.getBoundingClientRect();
        return {
            x: pr.left + pr.width / 2 - wr.left,
            y: pr.top  + pr.height / 2 - wr.top,
        };
    };

    const positions = () => {
        const start = getPortPos(props.conn.sourceBlockId, props.conn.sourcePortName, 'output');
        const end   = getPortPos(props.conn.targetBlockId, props.conn.targetPortName, 'input');
        return { start, end };
    };

    const path = () => {
        const { start, end } = positions();
        if (!start || !end) return null;
        return connectionPathToSVG(start.x, start.y, end.x, end.y);
    };

    const midpoint = () => {
        const { start, end } = positions();
        if (!start || !end) return null;
        return getBezierMidpoint(start.x, start.y, end.x, end.y);
    };

    return (
        <>
            {path() && (
                <>
                    {/* Hit area */}
                    <path
                        d={path()!}
                        fill="none"
                        stroke="transparent"
                        stroke-width="12"
                        style="pointer-events:stroke;cursor:pointer;"
                        onClick={() => storeActions.deleteConnection(props.conn.id)}
                    />
                    {/* Visible path */}
                    <path class="connection-path" d={path()!} />
                    {/* Delete button */}
                    {midpoint() && (
                        <g class="connection-delete-btn"
                            transform={`translate(${midpoint()!.x},${midpoint()!.y})`}
                            onClick={() => storeActions.deleteConnection(props.conn.id)}>
                            <circle r="9" fill="var(--bg-elevated)" stroke="var(--border-default)" stroke-width="1.5"/>
                            <text y="4.5" text-anchor="middle" font-size="12" fill="var(--ink-secondary)" style="pointer-events:none">×</text>
                        </g>
                    )}
                </>
            )}
        </>
    );
};

// ─── Block toolbar overlay (lives in wrapper space) ───────────────────────────
const BlockToolbarOverlay: Component<{ blockId: string; pos: { x: number; y: number } }> = (props) => {
    const z = zoom();
    return (
        <div
            class="block-toolbar"
            style={{
                left: `${props.pos.x}px`,
                top: `${props.pos.y}px`,
                transform: `translateX(-50%) scale(${1 / z})`,
                'transform-origin': 'top center',
            }}
        >
            <button class="block-toolbar-btn" title="Settings (opens panel)"
                onClick={() => setSettingsPanelBlockId(props.blockId)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
            </button>
            <button class="block-toolbar-btn" title="Duplicate (Ctrl+D)"
                onClick={() => {
                    const b = blocks[props.blockId];
                    if (!b) return;
                    const nb = { ...b, id: `block_${Date.now()}`, position: { x: b.position.x + 30, y: b.position.y + 30 }, selected: false, fieldValues: { ...b.fieldValues } };
                    storeActions.addBlock(nb);
                    storeActions.selectBlock(nb.id);
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
            </button>
            <button class="block-toolbar-btn danger" title="Delete (Del)"
                onClick={() => storeActions.deleteBlock(props.blockId)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        </div>
    );
};

export default CanvasArea;
