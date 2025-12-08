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
}

/**
 * Renders a visual block as an HTML element
 */
export function renderBlock(block: VisualBlock, callbacks?: BlockRenderCallbacks): HTMLElement {
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

    // Header
    const header = DOMUpdater.create('div', { className: 'block-header' });
    
    const headerTitle = DOMUpdater.create('span', {
        className: 'block-header-title',
        text: block.name || block.type
    });
    header.appendChild(headerTitle);
    
    // Delete button
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
            // Don't trigger drag when clicking delete button
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

/**
 * Render a port (connection point)
 */
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

/**
 * Update block selection state
 */
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

