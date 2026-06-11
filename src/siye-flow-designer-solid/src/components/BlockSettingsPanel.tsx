import { Component, createSignal, createEffect, For, batch } from 'solid-js';
import {
    blocks, settingsPanelBlockId, setSettingsPanelBlockId,
    storeActions,
} from '../store/designer-store';
import { BLOCK_PANEL_FIELDS } from '../configs/block-field-configs';
import { PanelField } from '../configs/block-field-configs';

const BlockSettingsPanel: Component = () => {
    const [activeTab, setActiveTab] = createSignal<'fields' | 'json'>('fields');
    const [jsonText, setJsonText] = createSignal('');
    const [jsonError, setJsonError] = createSignal('');

    const blockId = settingsPanelBlockId;
    const block = () => blockId() ? blocks[blockId()!] : null;
    const isOpen = () => !!block();

    // Sync JSON textarea when switching to json tab or when block changes
    createEffect(() => {
        const b = block();
        if (b && activeTab() === 'json') {
            setJsonText(JSON.stringify(b.fieldValues, null, 2));
            setJsonError('');
        }
    });

    const close = () => { setSettingsPanelBlockId(null); setActiveTab('fields'); };

    const handleFieldChange = (fieldName: string, value: any) => {
        const b = block();
        if (!b) return;
        storeActions.updateBlockField(b.id, fieldName, value);
        // Keep JSON in sync
        if (activeTab() === 'json') {
            setJsonText(JSON.stringify(blocks[b.id]?.fieldValues ?? {}, null, 2));
        }
    };

    const applyJson = () => {
        try {
            const parsed = JSON.parse(jsonText());
            const b = block();
            if (b) storeActions.updateBlockFieldValues(b.id, parsed);
            setJsonError('');
        } catch (e: any) {
            setJsonError(`Invalid JSON: ${e.message}`);
        }
    };

    const resetJson = () => {
        const b = block();
        if (b) setJsonText(JSON.stringify(b.fieldValues, null, 2));
        setJsonError('');
    };

    return (
        <div class={`settings-panel${isOpen() ? ' open' : ''}`}>
            {block() && <>
                <div class="sp-header">
                    <div class="sp-header-row">
                        <span class="sp-type-chip">{block()!.type}</span>
                        <button class="sp-close" onClick={close}>×</button>
                    </div>
                    <input
                        class="sp-name-input"
                        type="text"
                        value={block()!.name}
                        onInput={e => storeActions.updateBlockName(block()!.id, (e.target as HTMLInputElement).value)}
                        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                </div>

                <div class="sp-tabs">
                    <button class={`sp-tab${activeTab() === 'fields' ? ' active' : ''}`} onClick={() => setActiveTab('fields')}>Fields</button>
                    <button class={`sp-tab${activeTab() === 'json' ? ' active' : ''}`} onClick={() => { setActiveTab('json'); setJsonText(JSON.stringify(block()!.fieldValues, null, 2)); }}>JSON</button>
                </div>

                {/* Fields tab */}
                <div class={`sp-tab-body${activeTab() === 'fields' ? ' active' : ''}`}>
                    <div class="sp-fields-body">
                        {(() => {
                            const fields = BLOCK_PANEL_FIELDS[block()!.type];
                            if (!fields || fields.length === 0) {
                                return <p style="color:var(--ink-muted);font-size:12px;text-align:center;margin-top:20px">No configurable fields.</p>;
                            }
                            return (
                                <For each={fields}>
                                    {(f) => <FieldControl field={f} blockId={block()!.id} onChange={handleFieldChange} />}
                                </For>
                            );
                        })()}
                    </div>
                </div>

                {/* JSON tab */}
                <div class={`sp-tab-body${activeTab() === 'json' ? ' active' : ''}`}>
                    <div class="sp-json-body">
                        <textarea
                            class="sp-json-area"
                            value={jsonText()}
                            onInput={e => {
                                const v = (e.target as HTMLTextAreaElement).value;
                                setJsonText(v);
                                try { JSON.parse(v); setJsonError(''); } catch (err: any) { setJsonError(`Invalid JSON: ${err.message}`); }
                            }}
                        />
                        <div class="sp-json-error">{jsonError()}</div>
                    </div>
                    <div class="sp-action-bar">
                        <button class="sp-btn sp-btn-ghost" onClick={resetJson}>Reset</button>
                        <button class="sp-btn sp-btn-primary" disabled={!!jsonError()} onClick={applyJson}>Apply</button>
                    </div>
                </div>
            </>}
        </div>
    );
};

const FieldControl: Component<{ field: PanelField; blockId: string; onChange: (name: string, value: any) => void }> = (props) => {
    const f = props.field;
    const val = () => blocks[props.blockId]?.fieldValues[f.name];

    return (
        <div class="sp-field" data-field-name={f.name}>
            <label class="sp-label">{f.label}</label>
            <div class="sp-control">
                {f.type === 'text' && (
                    <input class="sp-input" type="text" placeholder={f.placeholder ?? ''} value={String(val() ?? '')}
                        onInput={e => props.onChange(f.name, (e.target as HTMLInputElement).value)} />
                )}
                {f.type === 'textarea' && (
                    <textarea class="sp-textarea" placeholder={f.placeholder ?? ''} rows={4}
                        onInput={e => props.onChange(f.name, (e.target as HTMLTextAreaElement).value)}
                    >{String(val() ?? '')}</textarea>
                )}
                {f.type === 'expression' && (
                    <textarea class="sp-expression" placeholder={f.placeholder ?? ''} rows={2}
                        onInput={e => props.onChange(f.name, (e.target as HTMLTextAreaElement).value)}
                    >{String(val() ?? '')}</textarea>
                )}
                {f.type === 'number' && (
                    <input class="sp-input" type="number" placeholder={f.placeholder ?? ''} value={String(val() ?? f.defaultValue ?? '')}
                        onInput={e => props.onChange(f.name, (e.target as HTMLInputElement).value)} />
                )}
                {f.type === 'pill-select' && (
                    <div class="sp-pill-group">
                        <For each={f.options ?? []}>
                            {(opt) => (
                                <button
                                    class={`sp-pill${String(val() ?? f.defaultValue) === opt ? ' active' : ''}`}
                                    onClick={() => props.onChange(f.name, opt)}
                                >{opt}</button>
                            )}
                        </For>
                    </div>
                )}
                {f.type === 'checkbox' && (
                    <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
                        <input type="checkbox" checked={Boolean(val())}
                            onChange={e => props.onChange(f.name, (e.target as HTMLInputElement).checked)} />
                        <span style="font-size:13px;color:var(--ink-primary)">{f.placeholder ?? f.label}</span>
                    </label>
                )}
                {f.type === 'keyvalue' && (
                    <KVEditor
                        value={val() as Record<string, string> | undefined}
                        onChange={v => props.onChange(f.name, v)}
                    />
                )}
            </div>
            {f.hint && <p class="sp-hint">{f.hint}</p>}
        </div>
    );
};

const KVEditor: Component<{ value?: Record<string, string>; onChange: (v: Record<string, string>) => void }> = (props) => {
    const current = () => props.value && typeof props.value === 'object' ? props.value : {};
    const entries = () => Object.entries(current());

    const update = (key: string, newKey: string, newVal: string) => {
        const next = { ...current() };
        if (newKey !== key) delete next[key];
        if (newKey) next[newKey] = newVal;
        props.onChange(next);
    };
    const remove = (key: string) => {
        const next = { ...current() };
        delete next[key];
        props.onChange(next);
    };
    const add = () => props.onChange({ ...current(), '': '' });

    return (
        <div class="sp-kv-container">
            <For each={entries()}>
                {([k, v]) => (
                    <div class="sp-kv-row">
                        <input class="sp-kv-key" type="text" value={k} placeholder="key"
                            onInput={e => update(k, (e.target as HTMLInputElement).value, v)} />
                        <input class="sp-kv-val" type="text" value={String(v ?? '')} placeholder="value"
                            onInput={e => update(k, k, (e.target as HTMLInputElement).value)} />
                        <button class="sp-kv-del" onClick={() => remove(k)} title="Remove">×</button>
                    </div>
                )}
            </For>
            <button class="sp-kv-add" onClick={add}>+ Add row</button>
        </div>
    );
};

export default BlockSettingsPanel;
