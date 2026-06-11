import { Component, createSignal, For, createMemo } from 'solid-js';
import { BlockType } from '../models/workflow-models';
import { createDefaultBlock, storeActions } from '../store/designer-store';

interface BlockTemplate {
    type: BlockType;
    name: string;
    category: string;
    description: string;
    emoji: string;
}

const TEMPLATES: BlockTemplate[] = [
    // Core
    { type: BlockType.Start,           name: 'Start',          category: 'Core',         description: 'Entry point',         emoji: '▶' },
    { type: BlockType.End,             name: 'End',            category: 'Core',         description: 'Exit point',          emoji: '⏹' },
    { type: BlockType.Variable,        name: 'Variable',       category: 'Core',         description: 'Set/get variables',   emoji: '📦' },
    { type: BlockType.Log,             name: 'Log',            category: 'Core',         description: 'Log messages',        emoji: '📝' },
    { type: BlockType.Evaluate,        name: 'Evaluate',       category: 'Core',         description: 'Evaluate expressions',emoji: '🧮' },
    // Connectivity
    { type: BlockType.HttpRequest,     name: 'HTTP Request',   category: 'Connectivity', description: 'Make API calls',      emoji: '🌐' },
    // Logic
    { type: BlockType.Condition,       name: 'Condition',      category: 'Logic',        description: 'If/else branching',   emoji: '↕' },
    { type: BlockType.Switch,          name: 'Switch',         category: 'Logic',        description: 'Multiple branches',   emoji: '🔀' },
    { type: BlockType.Loop,            name: 'Loop',           category: 'Logic',        description: 'Iterate items',       emoji: '🔄' },
    { type: BlockType.Delay,           name: 'Delay',          category: 'Logic',        description: 'Wait duration',       emoji: '⏱' },
    { type: BlockType.BatchProcess,    name: 'Batch',          category: 'Logic',        description: 'Parallel processing', emoji: '⚡' },
    { type: BlockType.SubWorkflow,     name: 'Sub Workflow',   category: 'Logic',        description: 'Call workflow',       emoji: '📂' },
    // Files
    { type: BlockType.FileDownload,    name: 'File Download',  category: 'Files',        description: 'Download file from URL', emoji: '⬇' },
    { type: BlockType.FileUpload,      name: 'File Upload',    category: 'Files',        description: 'Pick file from disk', emoji: '⬆' },
    { type: BlockType.FileStreamWriter,name: 'Stream Writer',  category: 'Files',        description: 'Append to file stream',emoji: '✍' },
    { type: BlockType.FileStreamReader,name: 'Stream Reader',  category: 'Files',        description: 'Iterate file chunks', emoji: '📖' },
];

const BlockPalette: Component = () => {
    const [search, setSearch] = createSignal('');
    const [activeTab, setActiveTab] = createSignal<'blocks' | 'api'>('blocks');

    const filtered = createMemo(() => {
        const q = search().toLowerCase();
        if (!q) return TEMPLATES;
        return TEMPLATES.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    });

    const categories = createMemo(() => {
        const map = new Map<string, BlockTemplate[]>();
        filtered().forEach(t => {
            if (!map.has(t.category)) map.set(t.category, []);
            map.get(t.category)!.push(t);
        });
        return map;
    });

    const handleDragStart = (e: DragEvent, type: BlockType) => {
        e.dataTransfer?.setData('application/siyeflow-block-type', type);
        e.dataTransfer!.effectAllowed = 'copy';
    };

    // Click to add block at canvas center
    const addBlock = (type: BlockType) => {
        const block = createDefaultBlock(type, { x: 4000 - 110, y: 4000 - 60 });
        storeActions.addBlock(block);
        storeActions.selectBlock(block.id);
    };

    return (
        <aside class="palette">
            <div class="palette-tabs">
                <button class={`palette-tab${activeTab() === 'blocks' ? ' active' : ''}`} onClick={() => setActiveTab('blocks')}>Blocks</button>
                <button class={`palette-tab${activeTab() === 'api' ? ' active' : ''}`} onClick={() => setActiveTab('api')}>API</button>
            </div>
            <div class="palette-search">
                <input
                    class="search-input"
                    type="text"
                    placeholder="Search blocks…"
                    value={search()}
                    onInput={e => setSearch((e.target as HTMLInputElement).value)}
                />
            </div>
            {activeTab() === 'blocks' && (
                <div class="palette-body">
                    <For each={[...categories().entries()]}>
                        {([cat, items]) => (
                            <>
                                <div class="palette-category-label">{cat}</div>
                                <For each={items}>
                                    {(t) => (
                                        <div
                                            class="block-template"
                                            draggable
                                            onDragStart={e => handleDragStart(e, t.type)}
                                            onClick={() => addBlock(t.type)}
                                            title={t.description}
                                        >
                                            <div class="block-template-icon">{t.emoji}</div>
                                            <div>
                                                <div class="block-template-name">{t.name}</div>
                                                <div class="block-template-desc">{t.description}</div>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </>
                        )}
                    </For>
                    {filtered().length === 0 && (
                        <div style="color:var(--ink-muted);font-size:12px;padding:16px 8px;text-align:center">
                            No blocks match "{search()}"
                        </div>
                    )}
                </div>
            )}
            {activeTab() === 'api' && (
                <div class="palette-body" style="color:var(--ink-muted);font-size:12px;padding:16px 8px;text-align:center">
                    Load an OpenAPI spec from the workflow's HTTP Request block.
                </div>
            )}
        </aside>
    );
};

export default BlockPalette;
