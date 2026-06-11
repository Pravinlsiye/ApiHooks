import { Component, For } from 'solid-js';
import { VisualBlock } from '../models/visual-models';
import { BLOCK_COLORS } from '../models/workflow-models';

interface Props {
    block: VisualBlock;
    onPointerDown: (e: PointerEvent) => void;
    onPortOutput: (portName: string, el: HTMLElement) => void;
    onPortInput: (portName: string) => void;
}

const Block: Component<Props> = (props) => {
    const b = () => props.block;
    const headerColor = () => BLOCK_COLORS[b().type] ?? '#2a2a2a';

    const execClass = () => {
        const s = b().executionState;
        if (!s) return '';
        return ` exec-${s}`;
    };

    const selectedClass = () => b().selected ? ' selected' : '';

    return (
        <div
            class={`workflow-block${selectedClass()}${execClass()}`}
            data-block-id={b().id}
            style={{
                left: `${b().position.x}px`,
                top: `${b().position.y}px`,
                width: `${b().width}px`,
            }}
            onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest('.port-dot')) return;
                props.onPointerDown(e);
            }}
        >
            {/* Breakpoint chip */}
            <div
                class={`block-breakpoint${b().hasBreakpoint ? ' active' : ''}`}
                title="Toggle breakpoint"
                onClick={(e) => { e.stopPropagation(); /* handled externally via store */ }}
            />

            {/* Header */}
            <div class="block-header" style={{ background: headerColor() }}>
                <span class="block-header-title">{b().name}</span>
                <button
                    class="block-delete-btn"
                    onClick={(e) => { e.stopPropagation(); import('../store/designer-store').then(m => m.storeActions.deleteBlock(b().id)); }}
                >×</button>
            </div>

            {/* Fields */}
            {b().fields && b().fields.length > 0 && (
                <div class="block-content">
                    <For each={b().fields.slice(0, 2)}>
                        {(field) => (
                            <div class="block-field-row">
                                <label class="block-field-label">{field.label ?? field.name}</label>
                                <input
                                    class="block-field-input"
                                    type="text"
                                    placeholder={field.placeholder ?? ''}
                                    value={String(b().fieldValues[field.name] ?? field.value ?? '')}
                                    onInput={(e) => {
                                        import('../store/designer-store').then(m =>
                                            m.storeActions.updateBlockField(b().id, field.name, (e.target as HTMLInputElement).value)
                                        );
                                    }}
                                    onPointerDown={e => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </For>
                </div>
            )}

            {/* Ports */}
            <div class="block-ports">
                <div class="port-group port-group-input">
                    <For each={b().inputPorts}>
                        {(port) => (
                            <div class="port-row port-input">
                                <div
                                    class="port-dot"
                                    data-port-name={port.name}
                                    data-port-side="input"
                                    title={port.label ?? port.name}
                                    onPointerUp={(e) => { e.stopPropagation(); props.onPortInput(port.name); }}
                                />
                                <span class="port-label">{port.label ?? port.name}</span>
                            </div>
                        )}
                    </For>
                </div>
                <div class="port-group port-group-output">
                    <For each={b().outputPorts}>
                        {(port) => (
                            <div class="port-row port-output">
                                <span class="port-label">{port.label ?? port.name}</span>
                                <div
                                    class="port-dot"
                                    data-port-name={port.name}
                                    data-port-side="output"
                                    title={port.label ?? port.name}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        props.onPortOutput(port.name, e.currentTarget as HTMLElement);
                                    }}
                                />
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
};

export default Block;
