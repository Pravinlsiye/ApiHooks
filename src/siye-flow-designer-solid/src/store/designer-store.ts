/**
 * Designer store — Solid reactive state for the workflow canvas.
 * Replaces the imperative BaseComponent/EventEmitter pattern.
 */
import { createStore, produce } from 'solid-js/store';
import { createSignal, batch } from 'solid-js';
import { VisualBlock, VisualConnection, Position } from '../models/visual-models';
import { BlockType, EdgeType, BLOCK_COLORS } from '../models/workflow-models';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Tool = 'hand' | 'pointer';
export type ExecState = 'idle' | 'running' | 'paused' | 'stepping';
export type ExecHighlight = 'executing' | 'success' | 'fail' | null;

// ─── Stores ──────────────────────────────────────────────────────────────────

const [blocks, setBlocks] = createStore<Record<string, VisualBlock>>({});
const [connections, setConnections] = createStore<Record<string, VisualConnection>>({});

export { blocks, connections };

// ─── Signals ─────────────────────────────────────────────────────────────────

export const [selectedBlockId, setSelectedBlockId] = createSignal<string | null>(null);
export const [settingsPanelBlockId, setSettingsPanelBlockId] = createSignal<string | null>(null);
export const [zoom, setZoom] = createSignal(1);
export const [pan, setPan] = createSignal<{ x: number; y: number }>({ x: 0, y: 0 });
export const [tool, setTool] = createSignal<Tool>('hand');
export const [executionState, setExecutionState] = createSignal<ExecState>('idle');
export const [runtimeVars, setRuntimeVars] = createSignal<Record<string, any> | null>(null);
export const [runtimeBlockOutputs, setRuntimeBlockOutputs] = createSignal<Record<string, Record<string, any>>>({});
export const [runtimeCurrentBlock, setRuntimeCurrentBlock] = createSignal<string | null>(null);
export const [currentTheme, setCurrentTheme] = createSignal<'light' | 'dark' | 'system'>('system');

const CANVAS_SIZE = 8000;
const CANVAS_CENTER = CANVAS_SIZE / 2;

// ─── Block default factory ────────────────────────────────────────────────────

let _seq = 0;
function genId(prefix = 'block'): string {
    return `${prefix}_${Date.now()}_${++_seq}`;
}

const DEFAULT_PORTS: Record<BlockType, { inputs: VisualBlock['inputPorts']; outputs: VisualBlock['outputPorts'] }> = {
    [BlockType.Start]: { inputs: [], outputs: [{ name: 'default', type: 'execution', label: 'out' }] },
    [BlockType.End]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [] },
    [BlockType.HttpRequest]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution' }, { name: 'fail', type: 'execution' }] },
    [BlockType.Variable]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution', label: 'out' }] },
    [BlockType.Log]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution', label: 'out' }] },
    [BlockType.Delay]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution', label: 'out' }] },
    [BlockType.Condition]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution', label: 'true' }, { name: 'fail', type: 'execution', label: 'false' }] },
    [BlockType.Switch]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'default', type: 'execution' }] },
    [BlockType.Loop]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'each', type: 'execution' }, { name: 'done', type: 'execution' }] },
    [BlockType.Evaluate]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution', label: 'out' }] },
    [BlockType.BatchProcess]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'each', type: 'execution' }, { name: 'done', type: 'execution' }] },
    [BlockType.SubWorkflow]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution' }, { name: 'fail', type: 'execution' }] },
    [BlockType.WebhookTrigger]: { inputs: [], outputs: [{ name: 'default', type: 'execution', label: 'out' }] },
    [BlockType.FileDownload]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution' }, { name: 'fail', type: 'execution' }] },
    [BlockType.FileUpload]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution' }, { name: 'fail', type: 'execution' }] },
    [BlockType.FileStreamWriter]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'out', type: 'execution' }] },
    [BlockType.FileStreamReader]: { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'each', type: 'execution' }, { name: 'done', type: 'execution' }] },
};

const BLOCK_NAMES: Record<BlockType, string> = {
    [BlockType.Start]: 'Start', [BlockType.End]: 'End', [BlockType.Variable]: 'Variable',
    [BlockType.Log]: 'Log', [BlockType.Evaluate]: 'Evaluate', [BlockType.HttpRequest]: 'HTTP Request',
    [BlockType.WebhookTrigger]: 'Webhook Trigger', [BlockType.Switch]: 'Switch', [BlockType.Loop]: 'Loop',
    [BlockType.Delay]: 'Delay', [BlockType.BatchProcess]: 'Batch', [BlockType.SubWorkflow]: 'Sub Workflow',
    [BlockType.Condition]: 'Condition', [BlockType.FileDownload]: 'File Download',
    [BlockType.FileUpload]: 'File Upload', [BlockType.FileStreamWriter]: 'Stream Writer',
    [BlockType.FileStreamReader]: 'Stream Reader',
};

export function createDefaultBlock(type: BlockType, position: Position, label?: string): VisualBlock {
    const ports = DEFAULT_PORTS[type] ?? { inputs: [{ name: 'trigger', type: 'execution' }], outputs: [{ name: 'success', type: 'execution' }] };
    return {
        id: genId(),
        type,
        name: label ?? BLOCK_NAMES[type] ?? String(type),
        position,
        width: 220,
        height: 120,
        selected: false,
        inputPorts: ports.inputs,
        outputPorts: ports.outputs,
        fields: [],
        fieldValues: {},
        hasBreakpoint: false,
        executionState: null,
    };
}

// ─── Store actions ────────────────────────────────────────────────────────────

export const storeActions = {
    // Block CRUD
    addBlock(block: VisualBlock): void {
        setBlocks(block.id, block);
    },

    updateBlockField(blockId: string, fieldName: string, value: any): void {
        setBlocks(produce(s => {
            if (s[blockId]) s[blockId].fieldValues[fieldName] = value;
        }));
    },

    updateBlockFieldValues(blockId: string, fieldValues: Record<string, any>): void {
        setBlocks(produce(s => {
            if (s[blockId]) s[blockId].fieldValues = fieldValues;
        }));
    },

    updateBlockName(blockId: string, name: string): void {
        setBlocks(produce(s => { if (s[blockId]) s[blockId].name = name; }));
    },

    moveBlock(blockId: string, position: Position): void {
        setBlocks(produce(s => { if (s[blockId]) s[blockId].position = { ...position }; }));
    },

    selectBlock(blockId: string | null): void {
        batch(() => {
            setBlocks(produce(s => {
                Object.keys(s).forEach(id => { s[id].selected = id === blockId; });
            }));
            setSelectedBlockId(blockId);
            if (blockId) setSettingsPanelBlockId(blockId);
        });
    },

    deleteBlock(blockId: string): void {
        batch(() => {
            setBlocks(produce(s => { delete s[blockId]; }));
            setConnections(produce(c => {
                Object.keys(c).forEach(connId => {
                    const conn = c[connId];
                    if (conn.sourceBlockId === blockId || conn.targetBlockId === blockId) {
                        delete c[connId];
                    }
                });
            }));
            if (selectedBlockId() === blockId) setSelectedBlockId(null);
            if (settingsPanelBlockId() === blockId) setSettingsPanelBlockId(null);
        });
    },

    setBlockHighlight(blockId: string, state: 'executing' | 'success' | 'fail' | 'clear'): void {
        setBlocks(produce(s => {
            if (s[blockId]) s[blockId].executionState = state === 'clear' ? null : state;
        }));
    },

    clearAllHighlights(): void {
        setBlocks(produce(s => {
            Object.keys(s).forEach(id => { s[id].executionState = null; });
        }));
    },

    toggleBreakpoint(blockId: string): void {
        setBlocks(produce(s => {
            if (s[blockId]) s[blockId].hasBreakpoint = !s[blockId].hasBreakpoint;
        }));
    },

    // Connection CRUD
    addConnection(conn: VisualConnection): void {
        // Duplicate edge guard
        const duplicate = Object.values(connections).some(c =>
            c.sourceBlockId === conn.sourceBlockId &&
            c.sourcePortName === conn.sourcePortName &&
            c.targetBlockId === conn.targetBlockId &&
            c.targetPortName === conn.targetPortName
        );
        if (!duplicate) setConnections(conn.id, conn);
    },

    deleteConnection(connId: string): void {
        setConnections(produce(c => { delete c[connId]; }));
    },

    // Workflow import/export
    clearAll(): void {
        batch(() => {
            setBlocks({});
            setConnections({});
            setSelectedBlockId(null);
            setSettingsPanelBlockId(null);
            setRuntimeVars(null);
        });
    },

    loadFromSchema(data: Record<string, unknown>): void {
        this.clearAll();
        const nodes = (data.nodes as any[]) ?? [];
        const edges = (data.edges as any[]) ?? [];

        let autoX = CANVAS_CENTER - 400;
        let autoY = CANVAS_CENTER;
        const spacing = 280;

        batch(() => {
            nodes.forEach(node => {
                const block = createDefaultBlock(
                    node.type as BlockType,
                    { x: autoX, y: autoY },
                    node.label
                );
                block.id = node.id;
                if (node.data) {
                    Object.entries(node.data as Record<string, unknown>).forEach(([k, v]) => {
                        block.fieldValues[k] = v ?? '';
                    });
                }
                setBlocks(block.id, block);
                autoX += spacing;
                if (autoX > CANVAS_CENTER + 1600) { autoX = CANVAS_CENTER - 400; autoY += 180; }
            });

            edges.forEach(edge => {
                const conn: VisualConnection = {
                    id: edge.id,
                    type: edge.type as EdgeType,
                    sourceBlockId: edge.source,
                    sourcePortName: edge.sourceHandle,
                    targetBlockId: edge.target,
                    targetPortName: edge.targetHandle,
                };
                setConnections(conn.id, conn);
            });
        });

        // Center view
        const blockArr = Object.values(blocks);
        if (blockArr.length > 0) {
            const minX = Math.min(...blockArr.map(b => b.position.x));
            const maxX = Math.max(...blockArr.map(b => b.position.x + b.width));
            const minY = Math.min(...blockArr.map(b => b.position.y));
            const maxY = Math.max(...blockArr.map(b => b.position.y + b.height));
            const cx = (minX + maxX) / 2;
            const cy = (minY + maxY) / 2;
            const z = zoom();
            setPan({ x: (CANVAS_CENTER - cx) * z, y: (CANVAS_CENTER - cy) * z });
        }
    },

    toSchema(): Record<string, unknown> {
        return {
            id: genId('workflow'),
            name: 'Workflow',
            version: '2.0.0',
            nodes: Object.values(blocks).map(b => ({
                id: b.id,
                type: b.type,
                label: b.name,
                data: { ...b.fieldValues },
            })),
            edges: Object.values(connections).map(c => ({
                id: c.id,
                type: c.type,
                source: c.sourceBlockId,
                sourceHandle: c.sourcePortName,
                target: c.targetBlockId,
                targetHandle: c.targetPortName,
            })),
        };
    },
};
