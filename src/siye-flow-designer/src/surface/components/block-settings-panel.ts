/**
 * Block Settings Panel — right-side slide-in drawer.
 * Two tabs: Fields (structured controls) + JSON (raw editor).
 * Extends BaseComponent; emits fieldChange, nameChange, dataChange.
 */

import { BaseComponent } from '../utils/base-component';
import { VisualBlock } from '../../models/visual-models';
import { BLOCK_PANEL_FIELDS, PanelField } from '../configs/block-field-configs';

export class BlockSettingsPanel extends BaseComponent {
    private currentBlock: VisualBlock | null = null;
    private _runtimeVars: Record<string, any> | null = null;
    private activeTab: 'fields' | 'json' = 'fields';

    get runtimeVars(): Record<string, any> | null { return this._runtimeVars; }

    // DOM refs set after render
    private panelEl!: HTMLElement;
    private titleEl!: HTMLElement;
    private nameInputEl!: HTMLInputElement;
    private fieldsBodyEl!: HTMLElement;
    private jsonAreaEl!: HTMLTextAreaElement;
    private jsonErrorEl!: HTMLElement;
    private applyBtnEl!: HTMLButtonElement;

    constructor(containerId: string) {
        super(containerId);
        this.render();
        this.bindStaticHandlers();
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    open(block: VisualBlock, runtimeVars?: Record<string, any>): void {
        this._runtimeVars = runtimeVars ?? null;
        const sameBlock = this.currentBlock?.id === block.id;
        this.currentBlock = block;
        if (sameBlock) {
            this.syncFields();
        } else {
            this.activeTab = 'fields';
            this.populateAll();
        }
        this.panelEl.classList.add('open');
    }

    close(): void {
        this.panelEl.classList.remove('open');
        this.currentBlock = null;
    }

    update(block: VisualBlock, runtimeVars?: Record<string, any>): void {
        if (!this.panelEl.classList.contains('open')) return;
        if (this.currentBlock?.id !== block.id) return;
        this._runtimeVars = runtimeVars ?? null;
        this.currentBlock = block;
        this.syncFields();
    }

    setRuntimeVariables(vars: Record<string, any> | null): void {
        this._runtimeVars = vars;
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    private render(): void {
        this.container.innerHTML = `
            <div class="sp-panel" role="complementary" aria-label="Block settings">
                <div class="sp-header">
                    <div class="sp-header-top">
                        <span class="sp-type-chip" id="sp-type-chip"></span>
                        <button class="sp-close-btn" id="sp-close-btn" aria-label="Close settings" title="Close (Esc)">×</button>
                    </div>
                    <input class="sp-name-input" id="sp-name-input" type="text" spellcheck="false" placeholder="Block name" aria-label="Block name">
                </div>
                <div class="sp-tabs" role="tablist">
                    <button class="sp-tab active" data-tab="fields" role="tab" aria-selected="true">Fields</button>
                    <button class="sp-tab" data-tab="json" role="tab" aria-selected="false">JSON</button>
                </div>
                <div class="sp-tab-content active" data-content="fields">
                    <div class="sp-fields-body" id="sp-fields-body"></div>
                </div>
                <div class="sp-tab-content" data-content="json">
                    <div class="sp-json-wrapper">
                        <textarea class="sp-json-area" id="sp-json-area" spellcheck="false" autocomplete="off"></textarea>
                        <div class="sp-json-error" id="sp-json-error" aria-live="polite"></div>
                    </div>
                    <div class="sp-action-bar">
                        <button class="sp-btn sp-btn-ghost" id="sp-reset-btn">Reset</button>
                        <button class="sp-btn sp-btn-primary" id="sp-apply-btn" disabled>Apply</button>
                    </div>
                </div>
            </div>
        `;

        this.panelEl = this.container.querySelector('.sp-panel')!;
        this.titleEl = this.container.querySelector('#sp-type-chip')!;
        this.nameInputEl = this.container.querySelector('#sp-name-input')!;
        this.fieldsBodyEl = this.container.querySelector('#sp-fields-body')!;
        this.jsonAreaEl = this.container.querySelector('#sp-json-area')!;
        this.jsonErrorEl = this.container.querySelector('#sp-json-error')!;
        this.applyBtnEl = this.container.querySelector('#sp-apply-btn')!;
    }

    // ─── Static event bindings (once) ────────────────────────────────────────

    private bindStaticHandlers(): void {
        // Close button
        const closeBtn = this.container.querySelector('#sp-close-btn')!;
        this.addEventListener(closeBtn as HTMLElement, 'click', () => this.close());

        // Escape key
        this.addEventListener(document, 'keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Escape' && this.panelEl.classList.contains('open')) {
                this.close();
            }
        });

        // Tab switching
        const tabsEl = this.container.querySelector('.sp-tabs')!;
        this.addEventListener(tabsEl as HTMLElement, 'click', (e) => {
            const btn = (e.target as HTMLElement).closest('.sp-tab') as HTMLElement | null;
            if (!btn) return;
            const tab = btn.dataset.tab as 'fields' | 'json';
            if (tab === this.activeTab) return;
            this.activeTab = tab;
            this.switchTab(tab);
        });

        // Name input
        this.addEventListener(this.nameInputEl, 'change', () => {
            if (!this.currentBlock) return;
            this.currentBlock.name = this.nameInputEl.value.trim();
            this.emit('nameChange', { blockId: this.currentBlock.id, name: this.currentBlock.name });
        });
        this.addEventListener(this.nameInputEl, 'keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Enter') this.nameInputEl.blur();
        });

        // JSON textarea: live validation + debounced reverse sync to Fields
        let jsonSyncTimer: ReturnType<typeof setTimeout> | null = null;
        this.addEventListener(this.jsonAreaEl, 'input', () => {
            this.validateJson();
            if (jsonSyncTimer) clearTimeout(jsonSyncTimer);
            jsonSyncTimer = setTimeout(() => {
                if (!this.currentBlock) return;
                try {
                    const parsed = JSON.parse(this.jsonAreaEl.value);
                    if (typeof parsed === 'object' && parsed !== null) {
                        this.currentBlock.fieldValues = parsed;
                        this.rebuildFieldControlValues();
                    }
                } catch { /* invalid JSON, ignore sync */ }
            }, 350);
        });

        // Apply
        this.addEventListener(this.applyBtnEl, 'click', () => this.applyJson());

        // Reset
        const resetBtn = this.container.querySelector('#sp-reset-btn')!;
        this.addEventListener(resetBtn as HTMLElement, 'click', () => {
            if (this.currentBlock) {
                this.jsonAreaEl.value = JSON.stringify(this.currentBlock.fieldValues, null, 2);
                this.validateJson();
                this.rebuildFieldControlValues();
            }
        });
    }

    // ─── Populate ────────────────────────────────────────────────────────────

    private populateAll(): void {
        if (!this.currentBlock) return;
        this.titleEl.textContent = this.currentBlock.type;
        this.nameInputEl.value = this.currentBlock.name;
        this.buildFieldsTab();
        this.jsonAreaEl.value = JSON.stringify(this.currentBlock.fieldValues, null, 2);
        this.validateJson();
        this.switchTab(this.activeTab);
    }

    private syncFields(): void {
        if (!this.currentBlock) return;
        this.nameInputEl.value = this.currentBlock.name;
        // Always keep JSON in sync (only lose focus when the user is actively typing)
        if (document.activeElement !== this.jsonAreaEl) {
            this.jsonAreaEl.value = JSON.stringify(this.currentBlock.fieldValues, null, 2);
            this.validateJson();
        }
    }

    /** Refresh JSON textarea from current fieldValues (called after field controls change). */
    private refreshJsonFromFields(): void {
        if (!this.currentBlock) return;
        if (document.activeElement !== this.jsonAreaEl) {
            this.jsonAreaEl.value = JSON.stringify(this.currentBlock.fieldValues, null, 2);
            this.validateJson();
        }
    }

    /**
     * Refresh field control DOM values from currentBlock.fieldValues
     * without rebuilding the whole tab (preserves focus / scroll position).
     */
    private rebuildFieldControlValues(): void {
        if (!this.currentBlock) return;
        const fields = BLOCK_PANEL_FIELDS[this.currentBlock.type] ?? [];
        fields.forEach(field => {
            const wrapper = this.fieldsBodyEl.querySelector(`[data-field-name="${field.name}"]`) as HTMLElement | null;
            if (!wrapper) return;
            const raw = this.currentBlock!.fieldValues[field.name];
            const value = raw === undefined ? (field.defaultValue ?? '') : raw;

            switch (field.type) {
                case 'text':
                case 'expression': {
                    const el = wrapper.querySelector('input[type="text"], textarea') as HTMLInputElement | HTMLTextAreaElement | null;
                    if (el && document.activeElement !== el) el.value = String(value);
                    break;
                }
                case 'textarea': {
                    const el = wrapper.querySelector('textarea') as HTMLTextAreaElement | null;
                    if (el && document.activeElement !== el) el.value = String(value);
                    break;
                }
                case 'number': {
                    const el = wrapper.querySelector('input[type="number"]') as HTMLInputElement | null;
                    if (el && document.activeElement !== el) el.value = String(value);
                    break;
                }
                case 'pill-select': {
                    const str = String(value);
                    wrapper.querySelectorAll('.sp-pill').forEach(p => {
                        p.classList.toggle('active', (p as HTMLElement).dataset.value === str);
                    });
                    break;
                }
                case 'select': {
                    const el = wrapper.querySelector('select') as HTMLSelectElement | null;
                    if (el) el.value = String(value);
                    break;
                }
                case 'checkbox': {
                    const el = wrapper.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
                    if (el) el.checked = Boolean(value);
                    break;
                }
                case 'keyvalue':
                    // KV editor is complex — full rebuild is safe here since it's rare
                    {
                        const control = wrapper.querySelector('.sp-control') as HTMLElement | null;
                        if (control) {
                            const panelField = fields.find(f => f.name === field.name)!;
                            control.innerHTML = '';
                            control.appendChild(this.buildKeyValue(panelField, value));
                        }
                    }
                    break;
            }
        });
    }

    // ─── Fields tab ──────────────────────────────────────────────────────────

    private buildFieldsTab(): void {
        if (!this.currentBlock) return;
        const fields = BLOCK_PANEL_FIELDS[this.currentBlock.type] ?? [];
        this.fieldsBodyEl.innerHTML = '';

        if (fields.length === 0) {
            this.fieldsBodyEl.innerHTML = '<p class="sp-empty">No configurable fields for this block type.</p>';
            return;
        }

        fields.forEach(field => {
            const value = this.currentBlock!.fieldValues[field.name];
            const el = this.buildFieldControl(field, value);
            this.fieldsBodyEl.appendChild(el);
        });
    }

    private buildFieldControl(field: PanelField, value: any): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'sp-field';
        wrapper.dataset.fieldName = field.name;

        const label = document.createElement('label');
        label.className = 'sp-label';
        label.textContent = field.label;
        wrapper.appendChild(label);

        const controlWrapper = document.createElement('div');
        controlWrapper.className = 'sp-control';

        switch (field.type) {
            case 'text':
                controlWrapper.appendChild(this.buildTextInput(field, String(value ?? '')));
                break;
            case 'textarea':
                controlWrapper.appendChild(this.buildTextarea(field, String(value ?? ''), false));
                break;
            case 'expression':
                controlWrapper.appendChild(this.buildTextarea(field, String(value ?? ''), true));
                break;
            case 'number':
                controlWrapper.appendChild(this.buildNumberInput(field, value));
                break;
            case 'pill-select':
                controlWrapper.appendChild(this.buildPillSelect(field, String(value ?? field.defaultValue ?? '')));
                break;
            case 'select':
                controlWrapper.appendChild(this.buildSelect(field, String(value ?? '')));
                break;
            case 'keyvalue':
                controlWrapper.appendChild(this.buildKeyValue(field, value));
                break;
            case 'checkbox':
                controlWrapper.appendChild(this.buildCheckbox(field, Boolean(value)));
                break;
        }

        wrapper.appendChild(controlWrapper);

        if (field.hint) {
            const hint = document.createElement('p');
            hint.className = 'sp-hint';
            hint.textContent = field.hint;
            wrapper.appendChild(hint);
        }

        return wrapper;
    }

    private buildTextInput(field: PanelField, value: string): HTMLInputElement {
        const el = document.createElement('input');
        el.type = 'text';
        el.className = 'sp-input';
        el.value = value;
        el.placeholder = field.placeholder ?? '';
        el.spellcheck = false;
        this.addEventListener(el, 'input', () => this.emitFieldChange(field.name, el.value));
        return el;
    }

    private buildTextarea(field: PanelField, value: string, mono: boolean): HTMLTextAreaElement {
        const el = document.createElement('textarea');
        el.className = mono ? 'sp-expression' : 'sp-textarea';
        el.value = value;
        el.placeholder = field.placeholder ?? '';
        el.spellcheck = false;
        el.rows = mono ? 2 : 4;
        this.addEventListener(el, 'input', () => this.emitFieldChange(field.name, el.value));
        return el;
    }

    private buildNumberInput(field: PanelField, value: any): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'sp-number-wrap';

        const el = document.createElement('input');
        el.type = 'number';
        el.className = 'sp-input sp-input-number';
        el.value = String(value ?? field.defaultValue ?? '');
        el.placeholder = field.placeholder ?? '';
        this.addEventListener(el, 'input', () => this.emitFieldChange(field.name, el.value));
        wrap.appendChild(el);

        if (field.unit) {
            const unit = document.createElement('span');
            unit.className = 'sp-unit';
            unit.textContent = field.unit;
            wrap.appendChild(unit);
        }

        return wrap;
    }

    private buildPillSelect(field: PanelField, value: string): HTMLElement {
        const group = document.createElement('div');
        group.className = 'sp-pill-group';
        group.setAttribute('role', 'group');

        (field.options ?? []).forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sp-pill' + (opt === value ? ' active' : '');
            btn.textContent = opt;
            btn.dataset.value = opt;
            this.addEventListener(btn, 'click', () => {
                group.querySelectorAll('.sp-pill').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                this.emitFieldChange(field.name, opt);
            });
            group.appendChild(btn);
        });

        return group;
    }

    private buildSelect(field: PanelField, value: string): HTMLSelectElement {
        const el = document.createElement('select');
        el.className = 'sp-select';
        (field.options ?? []).forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            option.selected = opt === value;
            el.appendChild(option);
        });
        this.addEventListener(el, 'change', () => this.emitFieldChange(field.name, el.value));
        return el;
    }

    private buildKeyValue(field: PanelField, value: any): HTMLElement {
        const container = document.createElement('div');
        container.className = 'sp-kv-container';

        const parsed: Record<string, string> = (value && typeof value === 'object') ? value : {};

        const renderRows = (): void => {
            container.innerHTML = '';
            const entries = Object.entries(parsed);

            entries.forEach(([k, v], idx) => {
                const row = document.createElement('div');
                row.className = 'sp-kv-row';

                const keyInput = document.createElement('input');
                keyInput.type = 'text';
                keyInput.className = 'sp-kv-key';
                keyInput.value = k;
                keyInput.placeholder = 'key';
                keyInput.spellcheck = false;

                const valInput = document.createElement('input');
                valInput.type = 'text';
                valInput.className = 'sp-kv-val';
                valInput.value = String(v);
                valInput.placeholder = 'value';
                valInput.spellcheck = false;

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'sp-kv-del';
                delBtn.innerHTML = '×';
                delBtn.title = 'Remove row';

                const emitKv = (): void => {
                    const oldKey = entries[idx][0];
                    const newKey = keyInput.value;
                    if (oldKey !== newKey) {
                        delete parsed[oldKey];
                    }
                    if (newKey) parsed[newKey] = valInput.value;
                    entries[idx] = [newKey, valInput.value];
                    this.emitFieldChange(field.name, { ...parsed });
                };

                this.addEventListener(keyInput, 'input', emitKv);
                this.addEventListener(valInput, 'input', emitKv);
                this.addEventListener(delBtn, 'click', () => {
                    delete parsed[k];
                    entries.splice(idx, 1);
                    renderRows();
                    this.emitFieldChange(field.name, { ...parsed });
                });

                row.appendChild(keyInput);
                row.appendChild(valInput);
                row.appendChild(delBtn);
                container.appendChild(row);
            });

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'sp-kv-add';
            addBtn.textContent = '+ Add row';
            this.addEventListener(addBtn, 'click', () => {
                parsed[''] = '';
                renderRows();
            });
            container.appendChild(addBtn);
        };

        renderRows();
        return container;
    }

    private buildCheckbox(field: PanelField, value: boolean): HTMLElement {
        const wrap = document.createElement('label');
        wrap.className = 'sp-checkbox-wrap';

        const el = document.createElement('input');
        el.type = 'checkbox';
        el.className = 'sp-checkbox';
        el.checked = value;
        this.addEventListener(el, 'change', () => this.emitFieldChange(field.name, el.checked));

        wrap.appendChild(el);
        wrap.appendChild(document.createTextNode(field.placeholder ?? field.label));
        return wrap;
    }

    // ─── JSON tab ────────────────────────────────────────────────────────────

    private validateJson(): void {
        const raw = this.jsonAreaEl.value.trim();
        if (!raw) {
            this.jsonErrorEl.textContent = '';
            this.applyBtnEl.disabled = false;
            return;
        }
        try {
            JSON.parse(raw);
            this.jsonErrorEl.textContent = '';
            this.applyBtnEl.disabled = false;
        } catch (e: any) {
            this.jsonErrorEl.textContent = `Invalid JSON: ${e.message}`;
            this.applyBtnEl.disabled = true;
        }
    }

    private applyJson(): void {
        if (!this.currentBlock) return;
        try {
            const parsed = JSON.parse(this.jsonAreaEl.value);
            this.currentBlock.fieldValues = parsed;
            this.rebuildFieldControlValues();
            this.emit('dataChange', { blockId: this.currentBlock.id, fieldValues: parsed });
        } catch { /* guarded by disabled state */ }
    }

    // ─── Tab helpers ─────────────────────────────────────────────────────────

    private switchTab(tab: 'fields' | 'json'): void {
        this.container.querySelectorAll('.sp-tab').forEach(btn => {
            const t = (btn as HTMLElement).dataset.tab;
            btn.classList.toggle('active', t === tab);
            btn.setAttribute('aria-selected', String(t === tab));
        });
        this.container.querySelectorAll('.sp-tab-content').forEach(c => {
            const t = (c as HTMLElement).dataset.content;
            c.classList.toggle('active', t === tab);
        });
        // When switching to JSON, always sync the textarea to latest fieldValues
        if (tab === 'json' && this.currentBlock) {
            this.jsonAreaEl.value = JSON.stringify(this.currentBlock.fieldValues, null, 2);
            this.validateJson();
        }
    }

    // ─── Event helpers ───────────────────────────────────────────────────────

    private emitFieldChange(fieldName: string, value: any): void {
        if (!this.currentBlock) return;
        // Keep local model in sync immediately
        this.currentBlock.fieldValues[fieldName] = value;
        // Push to JSON textarea (only when it's not focused)
        this.refreshJsonFromFields();
        // Notify designer
        this.emit('fieldChange', { blockId: this.currentBlock.id, fieldName, value });
    }
}
