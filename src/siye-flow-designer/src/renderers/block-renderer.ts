/**
 * HTML Block Renderer
 * Renders workflow blocks as HTML elements (divs) for better form handling
 */

import { VisualBlock, VisualPort, BlockField } from '../models/visual-models';
import { BLOCK_COLORS } from '../models/workflow-models';
import { DOMUpdater } from '../utils/dom-updater';

export interface BlockRenderCallbacks {
    onPortMouseDown?: (blockId: string, portName: string, portType: 'input' | 'output', event: MouseEvent) => void;
    onPortMouseUp?: (blockId: string, portName: string, portType: 'input' | 'output', event: MouseEvent) => void;
    onBlockMouseDown?: (blockId: string, event: MouseEvent) => void;
    onFieldChange?: (blockId: string, fieldName: string, value: string) => void;
    onDelete?: (blockId: string) => void;
    onBreakpointToggle?: (blockId: string) => void;
}

/**
 * Renders a visual block as an HTML element
 */
export function renderBlock(block: VisualBlock, callbacks?: BlockRenderCallbacks, runtimeVariables?: Record<string, any> | null): HTMLElement {
    const blockEl = DOMUpdater.create('div', {
        className: `workflow-block block-type-${block.type}${block.selected ? ' selected' : ''}`,
        attributes: { 'data-block-id': block.id },
        styles: {
            left: `${block.position.x}px`,
            top: `${block.position.y}px`,
            width: `${block.width}px`,
            minHeight: `${block.height}px`,
            '--block-color': BLOCK_COLORS[block.type] || '#666'
        }
    });

    // Breakpoint dot
    const bpDot = DOMUpdater.create('div', {
        className: 'block-breakpoint',
        attributes: { title: 'Toggle breakpoint' }
    });
    bpDot.addEventListener('mousedown', (e) => e.stopPropagation());
    bpDot.addEventListener('click', (e) => {
        e.stopPropagation();
        blockEl.classList.toggle('has-breakpoint');
        callbacks?.onBreakpointToggle?.(block.id);
    });
    blockEl.appendChild(bpDot);

    // Header
    const header = DOMUpdater.create('div', { className: 'block-header' });
    
    const headerTitle = DOMUpdater.create('span', {
        className: 'block-header-title',
        text: block.name || block.type
    });
    header.appendChild(headerTitle);
    
    const deleteBtn = DOMUpdater.create('button', {
        className: 'block-delete-btn',
        attributes: { title: 'Delete block' },
        html: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
        </svg>`
    });
    deleteBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        callbacks?.onDelete?.(block.id);
    });
    header.appendChild(deleteBtn);
    
    if (callbacks?.onBlockMouseDown) {
        header.addEventListener('mousedown', (e) => {
            if ((e.target as HTMLElement).closest('.block-delete-btn')) return;
            callbacks.onBlockMouseDown!(block.id, e);
        });
    }
    blockEl.appendChild(header);

    // Content with fields
    const content = DOMUpdater.create('div', { className: 'block-content' });

    if (block.fields && block.fields.length > 0) {
        block.fields.forEach(field => {
            const fieldEl = renderField(block.id, field, block.fieldValues[field.name], callbacks);
            content.appendChild(fieldEl);
        });
    }

    const fieldNames = new Set((block.fields || []).map(f => f.name));
    const extraEntries = Object.entries(block.fieldValues || {}).filter(([k]) => !fieldNames.has(k));

    if (extraEntries.length > 0) {
        const details = DOMUpdater.create('div', { className: 'block-details' });
        for (const [key, value] of extraEntries) {
            if (value === '' || value === undefined || value === null) continue;

            const row = document.createElement('div');
            row.className = 'block-detail-row';

            const keySpan = document.createElement('span');
            keySpan.className = 'block-detail-key';
            keySpan.textContent = key;
            row.appendChild(keySpan);

            const valSpan = document.createElement('span');
            valSpan.className = 'block-detail-value';
            const resolved = runtimeVariables ? resolveDisplay(value, runtimeVariables) : summarizeValue(value);
            valSpan.textContent = resolved;

            const tooltipData = buildTooltip(key, value, runtimeVariables);
            valSpan.title = tooltipData;

            if (runtimeVariables && resolved !== summarizeValue(value)) {
                valSpan.classList.add('block-detail-resolved');
            }
            row.appendChild(valSpan);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'block-detail-copy';
            copyBtn.title = 'Copy JSON';
            copyBtn.innerHTML = '⎘';
            copyBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const copyData = buildCopyData(key, value, runtimeVariables);
                navigator.clipboard.writeText(copyData).then(() => {
                    copyBtn.textContent = '✓';
                    setTimeout(() => { copyBtn.innerHTML = '⎘'; }, 1000);
                });
            });
            row.appendChild(copyBtn);

            details.appendChild(row);
        }
        if (details.children.length > 0) {
            content.appendChild(details);
        }
    }

    blockEl.appendChild(content);

    // Ports section
    const portsDiv = DOMUpdater.create('div', { className: 'block-ports' });

    // Input ports (left side)
    const inputPortsDiv = DOMUpdater.create('div', { className: 'port-group port-group-input' });
    if (block.inputPorts) {
        block.inputPorts.forEach(port => {
            const portEl = renderPort(block.id, port, 'input', callbacks);
            inputPortsDiv.appendChild(portEl);
        });
    }

    // Output ports (right side)
    const outputPortsDiv = document.createElement('div');
    outputPortsDiv.className = 'port-group port-group-output';
    if (block.outputPorts) {
        block.outputPorts.forEach(port => {
            const portEl = renderPort(block.id, port, 'output', callbacks);
            outputPortsDiv.appendChild(portEl);
        });
    }

    portsDiv.appendChild(inputPortsDiv);
    portsDiv.appendChild(outputPortsDiv);
    blockEl.appendChild(portsDiv);

    return blockEl;
}

/**
 * Render a form field
 */
function renderField(
    blockId: string,
    field: BlockField,
    value: string | undefined,
    callbacks?: BlockRenderCallbacks
): HTMLElement {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'block-field';

    const label = document.createElement('label');
    label.textContent = field.label || field.name;
    fieldDiv.appendChild(label);

    if (field.type === 'keyvalue') {
        const editor = renderKeyValueEditor(blockId, field.name, value as any, callbacks);
        fieldDiv.appendChild(editor);
        return fieldDiv;
    }

    if (field.type === 'select') {
        const select = document.createElement('select');
        select.dataset.fieldName = field.name;
        select.dataset.blockId = blockId;

        const options = field.options || [];
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = typeof option === 'string' ? option : option.value;
            optionEl.textContent = typeof option === 'string' ? option : option.label;
            if (value === optionEl.value || field.value === optionEl.value) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });

        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            callbacks?.onFieldChange?.(blockId, field.name, target.value);
        });

        // Prevent dragging when interacting with select
        select.addEventListener('mousedown', (e) => e.stopPropagation());

        fieldDiv.appendChild(select);
    } else {
        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.placeholder = field.placeholder || '';
        input.value = value || field.value || '';
        input.dataset.fieldName = field.name;
        input.dataset.blockId = blockId;

        input.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            callbacks?.onFieldChange?.(blockId, field.name, target.value);
        });

        // Prevent dragging when interacting with input
        input.addEventListener('mousedown', (e) => e.stopPropagation());

        fieldDiv.appendChild(input);
    }

    return fieldDiv;
}

function renderKeyValueEditor(
    blockId: string,
    fieldName: string,
    currentValue: Record<string, any> | undefined,
    callbacks?: BlockRenderCallbacks
): HTMLElement {
    const container = document.createElement('div');
    container.className = 'kv-editor';

    const entries = currentValue && typeof currentValue === 'object'
        ? Object.entries(currentValue)
        : [];

    function emitChange(): void {
        const result: Record<string, string> = {};
        container.querySelectorAll('.kv-row').forEach(row => {
            const keyInput = row.querySelector('.kv-key') as HTMLInputElement;
            const valInput = row.querySelector('.kv-val') as HTMLInputElement;
            if (keyInput?.value.trim()) {
                result[keyInput.value.trim()] = valInput?.value || '';
            }
        });
        callbacks?.onFieldChange?.(blockId, fieldName, JSON.stringify(result));
    }

    function addRow(key: string, val: string): void {
        const row = document.createElement('div');
        row.className = 'kv-row';

        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.className = 'kv-key';
        keyInput.placeholder = 'name';
        keyInput.value = key;
        keyInput.addEventListener('mousedown', e => e.stopPropagation());
        keyInput.addEventListener('input', emitChange);
        row.appendChild(keyInput);

        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.className = 'kv-val';
        valInput.placeholder = 'value';
        valInput.value = val;
        valInput.addEventListener('mousedown', e => e.stopPropagation());
        valInput.addEventListener('input', emitChange);
        row.appendChild(valInput);

        const delBtn = document.createElement('button');
        delBtn.className = 'kv-del';
        delBtn.textContent = '×';
        delBtn.title = 'Remove';
        delBtn.addEventListener('mousedown', e => e.stopPropagation());
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            row.remove();
            emitChange();
        });
        row.appendChild(delBtn);

        container.insertBefore(row, container.querySelector('.kv-add'));
    }

    for (const [k, v] of entries) {
        addRow(k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''));
    }

    const addBtn = document.createElement('button');
    addBtn.className = 'kv-add';
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('mousedown', e => e.stopPropagation());
    addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addRow('', '');
        emitChange();
    });
    container.appendChild(addBtn);

    return container;
}

function renderPort(
    blockId: string,
    port: VisualPort,
    portType: 'input' | 'output',
    callbacks?: BlockRenderCallbacks
): HTMLElement {
    const portDiv = document.createElement('div');
    portDiv.className = 'port';

    const portTab = document.createElement('div');
    portTab.className = `port-tab ${portType}`;
    portTab.dataset.portType = portType;
    portTab.dataset.portName = port.name;
    portTab.dataset.blockId = blockId;

    if (portType === 'output' && callbacks?.onPortMouseDown) {
        portTab.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            callbacks.onPortMouseDown!(blockId, port.name, portType, e);
        });
    }

    if (portType === 'input' && callbacks?.onPortMouseUp) {
        portTab.addEventListener('mouseup', (e) => {
            e.stopPropagation();
            callbacks.onPortMouseUp!(blockId, port.name, portType, e);
        });
    }

    const portLabel = document.createElement('span');
    portLabel.className = 'port-label';
    portLabel.textContent = port.label || port.name;

    if (portType === 'input') {
        portDiv.appendChild(portTab);
        portDiv.appendChild(portLabel);
    } else {
        portDiv.appendChild(portLabel);
        portDiv.appendChild(portTab);
    }

    return portDiv;
}

/**
 * Update block position (for dragging)
 */
export function updateBlockPosition(element: HTMLElement, x: number, y: number): void {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
}

function summarizeValue(value: any): string {
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
            return `[${value.length} items]`;
        }
        const keys = Object.keys(value);
        const summary = keys.slice(0, 3).join(', ');
        return keys.length > 3 ? `${summary} +${keys.length - 3}` : summary;
    }
    const str = String(value);
    return str.length > 40 ? str.substring(0, 40) + '...' : str;
}

function buildTooltip(_key: string, value: any, vars?: Record<string, any> | null): string {
    if (typeof value !== 'object' || value === null) {
        const raw = String(value);
        if (!vars) return raw;
        return resolveStr(raw, vars);
    }
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
        if (vars && k in vars) {
            result[k] = vars[k];
        } else if (vars && typeof v === 'string') {
            result[k] = resolveStr(v, vars);
        } else {
            result[k] = v;
        }
    }
    return JSON.stringify(result, null, 2);
}

function buildCopyData(key: string, value: any, vars?: Record<string, any> | null): string {
    if (typeof value !== 'object' || value === null) {
        const raw = String(value);
        if (!vars) return JSON.stringify({ [key]: raw }, null, 2);
        return JSON.stringify({ [key]: resolveStr(raw, vars) }, null, 2);
    }
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
        if (vars && k in vars) {
            result[k] = vars[k];
        } else if (vars && typeof v === 'string') {
            result[k] = resolveStr(v, vars);
        } else {
            result[k] = v;
        }
    }
    return JSON.stringify({ [key]: result }, null, 2);
}

function resolveStr(s: string, vars: Record<string, any>): string {
    return s.replace(/\{\{([^}]+)\}\}/g, (match, name) => {
        const trimmed = name.trim();
        if (trimmed in vars) {
            const val = vars[trimmed];
            return typeof val === 'object' ? JSON.stringify(val) : String(val);
        }
        return match;
    });
}

function resolveDisplay(value: any, vars: Record<string, any>): string {
    if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) return `[${value.length} items]`;
        const entries = Object.entries(value);
        const parts = entries.slice(0, 3).map(([k, v]) => {
            // If the key itself is a runtime variable (e.g. outputs: { firstUser: "$.[0].name" })
            if (k in vars) {
                const rv = vars[k];
                const display = typeof rv === 'object' ? JSON.stringify(rv) : String(rv);
                return `${k}=${display.length > 30 ? display.substring(0, 30) + '...' : display}`;
            }
            // Otherwise resolve {{var}} in the value string
            const resolved = resolveStr(String(v), vars);
            const short = resolved.length > 30 ? resolved.substring(0, 30) + '...' : resolved;
            return `${k}=${short}`;
        });
        return entries.length > 3 ? `${parts.join(', ')} +${entries.length - 3}` : parts.join(', ');
    }
    const str = resolveStr(String(value), vars);
    return str.length > 60 ? str.substring(0, 60) + '...' : str;
}

export function updateBlockSelection(element: HTMLElement, selected: boolean): void {
    if (selected) {
        element.classList.add('selected');
    } else {
        element.classList.remove('selected');
    }
}

/**
 * Get port element from block
 */
export function getPortElement(
    blockElement: HTMLElement,
    portName: string,
    portType: 'input' | 'output'
): HTMLElement | null {
    return blockElement.querySelector(
        `.port-tab[data-port-type="${portType}"][data-port-name="${portName}"]`
    );
}

/**
 * Get port position relative to canvas
 */
export function getPortPosition(
    blockElement: HTMLElement,
    portName: string,
    portType: 'input' | 'output',
    canvasWrapper: HTMLElement
): { x: number; y: number } | null {
    const portTab = getPortElement(blockElement, portName, portType);
    if (!portTab) return null;

    const portRect = portTab.getBoundingClientRect();
    const wrapperRect = canvasWrapper.getBoundingClientRect();

    return {
        x: portRect.left - wrapperRect.left + portRect.width / 2,
        y: portRect.top - wrapperRect.top + portRect.height / 2
    };
}

