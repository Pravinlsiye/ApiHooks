/**
 * Executor bridge — wires the BrowserWorkflowExecutor to the Solid stores.
 * Lazily initialized so it doesn't run until first workflow execution.
 */
import { BrowserWorkflowExecutor } from '../core/browser-workflow-executor';
import { terminalSink } from '../store/terminal-store';
import {
    blocks, connections,
    setExecutionState, storeActions, setRuntimeVars,
    setRuntimeBlockOutputs, setRuntimeCurrentBlock,
} from '../store/designer-store';
import { setExecutorRef } from '../components/FloatingToolbar';
import { WorkflowDefinition } from '../models/workflow-models';

let executor: BrowserWorkflowExecutor | null = null;

function getExecutor(): BrowserWorkflowExecutor {
    if (!executor) {
        executor = new BrowserWorkflowExecutor(terminalSink);
        setExecutorRef(executor);

        executor.setStateChangeCallback((state) => {
            setExecutionState(state);
            if (state === 'idle') {
                storeActions.clearAllHighlights();
                setRuntimeVars(null);
                setRuntimeCurrentBlock(null);
            }
        });

        executor.setBlockHighlightCallback((blockId, state) => {
            storeActions.setBlockHighlight(blockId, state);
        });

        executor.setContextUpdateCallback((vars, outputs, currentBlockId) => {
            setRuntimeVars({ ...vars });
            setRuntimeBlockOutputs({ ...outputs });
            setRuntimeCurrentBlock(currentBlockId);
        });
    }
    return executor;
}

export async function runWorkflow(): Promise<void> {
    const ex = getExecutor();

    // Build WorkflowDefinition from store
    const wf: WorkflowDefinition = {
        id: 'workflow-' + Date.now(),
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

    await ex.execute(wf);
}

export function getExecutorInstance(): BrowserWorkflowExecutor | null {
    return executor;
}
