import { SimpleEventEmitter } from '../../VisualModels';
import { AddItemModal } from '../../../components/AddItemModal';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { Node, BlockType } from '../../../models/workflow-models';

/**
 * Helper class for setting up block-specific event handlers
 * This extracts the complex event handler setup logic from CanvasRenderer
 * Tracks all event listeners for proper cleanup
 */
export class BlockEventHandler extends SimpleEventEmitter {
    private addItemModal: AddItemModal;
    private confirmModal: ConfirmModal;
    private getBlockData: (blockId: string) => Node | undefined;
    
    // Track event listeners for cleanup
    private eventListeners: Map<string, Array<{
        element: HTMLElement | Document;
        event: string;
        handler: EventListener;
        options?: boolean | AddEventListenerOptions;
    }>> = new Map();
    
    // Track setTimeout calls for cleanup
    private timeoutIds: Set<number> = new Set();
    
    constructor(
        getBlockData: (blockId: string) => Node | undefined
    ) {
        super();
        this.getBlockData = getBlockData;
        this.addItemModal = new AddItemModal();
        this.confirmModal = new ConfirmModal();
    }
    
    /**
     * Track an event listener for cleanup
     */
    private trackEventListener(
        blockId: string,
        element: HTMLElement | Document,
        event: string,
        handler: EventListener,
        options?: boolean | AddEventListenerOptions
    ): void {
        if (!this.eventListeners.has(blockId)) {
            this.eventListeners.set(blockId, []);
        }
        this.eventListeners.get(blockId)!.push({ element, event, handler, options });
    }
    
    /**
     * Track a setTimeout call for cleanup
     */
    private trackTimeout(timeoutId: number): void {
        this.timeoutIds.add(timeoutId);
    }
    
    /**
     * Clean up all event listeners for a specific block
     */
    public cleanupBlock(blockId: string): void {
        const listeners = this.eventListeners.get(blockId);
        if (listeners) {
            listeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.eventListeners.delete(blockId);
        }
    }
    
    /**
     * Clean up all event listeners and timeouts
     */
    public destroy(): void {
        // Clean up all block listeners
        this.eventListeners.forEach((listeners, _blockId) => {
            listeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        });
        this.eventListeners.clear();
        
        // Clean up all timeouts
        this.timeoutIds.forEach(timeoutId => clearTimeout(timeoutId));
        this.timeoutIds.clear();
        
        // Clean up modals
        this.addItemModal.destroy();
        this.confirmModal.destroy();
    }
    
    /**
     * Setup event handlers for Start block editable inputs
     */
    public setupStartBlockInputHandlers(blockElement: HTMLElement, blockId: string): void {
        // Add input button (Start block) - add directly without popup
        const addButtons = blockElement.querySelectorAll('.btn-add-input-on-block, .btn-add-item-popup');
        console.log('[BlockEventHandler] Setting up Start block handlers for', blockId, 'found buttons:', addButtons.length);
        
        addButtons.forEach(btn => {
            const handler = (e: Event) => {
                console.log('[BlockEventHandler] Add Input button clicked for block:', blockId);
                e.stopPropagation();
                e.preventDefault();
                this.emit('startBlockAddInput', { blockId });
            };
            btn.addEventListener('click', handler);
            this.trackEventListener(blockId, btn as HTMLElement, 'click', handler);
        });
        
        // Edit button - open popup for editing
        blockElement.querySelectorAll('.btn-edit-input').forEach(btn => {
            const inputName = (btn as HTMLElement).dataset.inputName;
            const handler = (e: Event) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (inputName) {
                    const blockData = this.getBlockData(blockId);
                    if (blockData && blockData.type === BlockType.Start) {
                        // Use blockData.data instead of blockData.config
                        const config = blockData.data;
                        let effectiveInputs: Record<string, any> = {};
                        
                        if (config.profiles && config.profiles.length > 0) {
                            const selectedProfile = config.profiles.find((p: any) => p.name === config.selectedProfile) ||
                                                   config.profiles.find((p: any) => p.default) ||
                                                   config.profiles[0];
                            effectiveInputs = selectedProfile?.inputs || {};
                        } else {
                            effectiveInputs = config.inputs || {};
                        }
                        const inputDef = effectiveInputs[inputName];
                        
                        if (inputDef) {
                            const inputType = inputDef.type || 'string';
                            const inputValue = inputDef.value || inputDef.default || '';
                            
                            this.addItemModal.show(
                                'input',
                                'input',
                                (name: string, type: string, value: string) => {
                                    let finalValue: any = value;
                                    try {
                                        switch (type) {
                                            case 'number':
                                                finalValue = value ? parseFloat(value) : 0;
                                                break;
                                            case 'boolean':
                                                finalValue = value.toLowerCase() === 'true';
                                                break;
                                            case 'array':
                                                finalValue = value ? JSON.parse(value) : [];
                                                break;
                                            case 'object':
                                                finalValue = value ? JSON.parse(value) : {};
                                                break;
                                            default:
                                                finalValue = value;
                                        }
                                    } catch {
                                        finalValue = value;
                                    }
                                    
                                    if (name !== inputName) {
                                        this.emit('startBlockRenameInput', { blockId, oldName: inputName, newName: name });
                                        const timeoutId = window.setTimeout(() => {
                                            this.timeoutIds.delete(timeoutId);
                                            this.emit('startBlockInputTypeChange', { blockId, inputName: name, type });
                                            this.emit('startBlockInputValueChange', { blockId, inputName: name, value: finalValue });
                                        }, 100);
                                        this.trackTimeout(timeoutId);
                                    } else {
                                        this.emit('startBlockInputTypeChange', { blockId, inputName, type });
                                        this.emit('startBlockInputValueChange', { blockId, inputName, value: finalValue });
                                    }
                                },
                                inputName,
                                inputType,
                                String(inputValue)
                            );
                        }
                    }
                }
            };
            btn.addEventListener('click', handler);
            this.trackEventListener(blockId, btn as HTMLElement, 'click', handler);
        });
        
        // Delete input button
        blockElement.querySelectorAll('.btn-delete-input').forEach(btn => {
            const handler = (e: Event) => {
                e.stopPropagation();
                e.preventDefault();
                const inputName = (btn as HTMLElement).dataset.inputName;
                if (inputName) {
                    this.emit('startBlockDeleteInput', { blockId, inputName });
                }
            };
            btn.addEventListener('click', handler);
            this.trackEventListener(blockId, btn as HTMLElement, 'click', handler);
        });
        
        // Input name change
        blockElement.querySelectorAll('.block-input-name').forEach(input => {
            const handler = (e: Event) => {
                const target = e.target as HTMLInputElement;
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();
                if (originalName && newName && newName !== originalName) {
                    this.emit('startBlockRenameInput', { blockId, oldName: originalName, newName });
                }
            };
            input.addEventListener('blur', handler);
            this.trackEventListener(blockId, input as HTMLElement, 'blur', handler);
        });
        
        // Input value change
        blockElement.querySelectorAll('.block-input-value, .block-input-name').forEach(input => {
            const mousedownHandler = (e: Event) => e.stopPropagation();
            const clickHandler = (e: Event) => e.stopPropagation();
            input.addEventListener('mousedown', mousedownHandler);
            input.addEventListener('click', clickHandler);
            this.trackEventListener(blockId, input as HTMLElement, 'mousedown', mousedownHandler);
            this.trackEventListener(blockId, input as HTMLElement, 'click', clickHandler);
            
            if (input.classList.contains('block-input-value')) {
                const inputHandler = (e: Event) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const inputName = target.dataset.inputName;
                    const value = target.value;
                    if (inputName) {
                        this.emit('startBlockInputValueChange', { blockId, inputName, value });
                    }
                };
                const blurHandler = (e: Event) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const inputName = target.dataset.inputName;
                    const value = target.value;
                    if (inputName) {
                        this.emit('startBlockInputValueChange', { blockId, inputName, value });
                    }
                };
                input.addEventListener('input', inputHandler);
                input.addEventListener('blur', blurHandler);
                this.trackEventListener(blockId, input as HTMLElement, 'input', inputHandler);
                this.trackEventListener(blockId, input as HTMLElement, 'blur', blurHandler);
            }
        });
        
        // Input type change
        blockElement.querySelectorAll('.input-type-option').forEach(option => {
            const handler = (e: Event) => {
                e.stopPropagation();
                e.preventDefault();
                const typeSelector = (option as HTMLElement).closest('.input-type-selector');
                const inputName = typeSelector?.getAttribute('data-input-name');
                const newType = (option as HTMLElement).dataset.type;
                if (inputName && newType) {
                    this.emit('startBlockInputTypeChange', { blockId, inputName, type: newType });
                }
            };
            option.addEventListener('click', handler);
            this.trackEventListener(blockId, option as HTMLElement, 'click', handler);
        });
        
        // Close dropdown when clicking outside
        const documentClickHandler = (e: Event) => {
            const target = e.target as HTMLElement;
            if (!blockElement.contains(target)) {
                blockElement.querySelectorAll('.input-type-dropdown').forEach(dropdown => {
                    (dropdown as HTMLElement).style.display = 'none';
                });
            }
        };
        document.addEventListener('click', documentClickHandler);
        this.trackEventListener(blockId, document, 'click', documentClickHandler);
    }
    
    /**
     * Setup event handlers for End block editable outputs
     */
    public setupEndBlockOutputHandlers(blockElement: HTMLElement, blockId: string): void {
        // Add output button
        blockElement.querySelectorAll('.btn-add-item-popup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.emit('endBlockAddOutput', { blockId });
            });
        });
        
        // Edit button
        blockElement.querySelectorAll('.btn-edit-output').forEach(btn => {
            const outputName = (btn as HTMLElement).dataset.outputName;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (outputName) {
                    const blockData = this.getBlockData(blockId);
                    if (blockData && blockData.type === BlockType.End) {
                        // Use blockData.data instead of blockData.config
                        const config = blockData.data;
                        const outputs = config.outputs || {};
                        const outputDef = outputs[outputName];
                        
                        if (outputDef) {
                            const outputType = outputDef.type || 'string';
                            const outputValue = outputDef.value || '';
                            
                            this.addItemModal.show(
                                'output',
                                'output',
                                (name: string, type: string, value: string) => {
                                    let finalValue: any = value;
                                    try {
                                        switch (type) {
                                            case 'number':
                                                finalValue = value ? parseFloat(value) : 0;
                                                break;
                                            case 'boolean':
                                                finalValue = value.toLowerCase() === 'true';
                                                break;
                                            case 'array':
                                                finalValue = value ? JSON.parse(value) : [];
                                                break;
                                            case 'object':
                                                finalValue = value ? JSON.parse(value) : {};
                                                break;
                                            default:
                                                finalValue = value;
                                        }
                                    } catch {
                                        finalValue = value;
                                    }
                                    
                                    if (name !== outputName) {
                                        this.emit('endBlockRenameOutput', { blockId, oldName: outputName, newName: name });
                                        const timeoutId = window.setTimeout(() => {
                                            this.timeoutIds.delete(timeoutId);
                                            this.emit('endBlockOutputTypeChange', { blockId, outputName: name, type });
                                            this.emit('endBlockOutputValueChange', { blockId, outputName: name, value: finalValue });
                                        }, 100);
                                        this.trackTimeout(timeoutId);
                                    } else {
                                        this.emit('endBlockOutputTypeChange', { blockId, outputName, type });
                                        this.emit('endBlockOutputValueChange', { blockId, outputName, value: finalValue });
                                    }
                                },
                                outputName,
                                outputType,
                                String(outputValue)
                            );
                        }
                    }
                }
            });
        });
        
        // Delete output button
        blockElement.querySelectorAll('.btn-delete-output').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const outputName = (btn as HTMLElement).dataset.outputName;
                if (outputName) {
                    this.emit('endBlockDeleteOutput', { blockId, outputName });
                }
            });
        });
        
        // Output name change
        blockElement.querySelectorAll('.block-output-name').forEach(input => {
            input.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();
                if (originalName && newName && newName !== originalName) {
                    this.emit('endBlockRenameOutput', { blockId, oldName: originalName, newName });
                }
            });
        });
        
        // Output value change
        blockElement.querySelectorAll('.block-output-value, .block-output-name').forEach(input => {
            input.addEventListener('mousedown', (e) => e.stopPropagation());
            input.addEventListener('click', (e) => e.stopPropagation());
            
            if (input.classList.contains('block-output-value')) {
                input.addEventListener('input', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const outputName = target.dataset.outputName;
                    const value = target.value;
                    if (outputName) {
                        this.emit('endBlockOutputValueChange', { blockId, outputName, value });
                    }
                });
                input.addEventListener('blur', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const outputName = target.dataset.outputName;
                    const value = target.value;
                    if (outputName) {
                        this.emit('endBlockOutputValueChange', { blockId, outputName, value });
                    }
                });
            }
        });
        
        // Output type button click to show dropdown
        blockElement.querySelectorAll('.output-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const outputName = (btn as HTMLElement).dataset.outputName;
                const dropdown = blockElement.querySelector(`.output-type-dropdown[data-output-name="${outputName}"]`) as HTMLElement;
                if (dropdown) {
                    const isVisible = dropdown.style.display === 'block';
                    blockElement.querySelectorAll('.output-type-dropdown').forEach(d => {
                        (d as HTMLElement).style.display = 'none';
                    });
                    dropdown.style.display = isVisible ? 'none' : 'block';
                }
            });
        });
        
        // Output type change
        blockElement.querySelectorAll('.output-type-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const typeSelector = (option as HTMLElement).closest('.input-type-selector');
                const outputName = typeSelector?.getAttribute('data-output-name');
                const newType = (option as HTMLElement).dataset.type;
                if (outputName && newType) {
                    this.emit('endBlockOutputTypeChange', { blockId, outputName, type: newType });
                }
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!blockElement.contains(target)) {
                blockElement.querySelectorAll('.output-type-dropdown').forEach(dropdown => {
                    (dropdown as HTMLElement).style.display = 'none';
                });
            }
        });
    }
    
    /**
     * Setup event handlers for editable key-value lists (variables, headers, outputs)
     */
    public setupEditableKeyValueHandlers(blockElement: HTMLElement, blockId: string): void {
        // Add item button
        blockElement.querySelectorAll('.btn-add-item-popup').forEach(btn => {
            const btnElement = btn as HTMLElement;
            const itemType = btnElement.dataset.itemType;
            let portType = btnElement.dataset.portType;
            if (!portType || (portType !== 'input' && portType !== 'output')) {
                const section = btnElement.closest('.block-variables-section');
                if (section) {
                    const sectionLabel = section.querySelector('.block-section-label');
                    if (sectionLabel && sectionLabel.textContent?.toLowerCase().includes('input')) {
                        portType = 'input';
                    } else {
                        portType = 'output';
                    }
                } else {
                    portType = 'output';
                }
            }
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (itemType && portType) {
                    this.emit('blockAddKeyValue', { 
                        blockId, 
                        itemType, 
                        portType: portType as 'input' | 'output'
                    });
                }
            });
        });
        
        // Edit button
        blockElement.querySelectorAll('.btn-edit-input').forEach(btn => {
            const itemName = (btn as HTMLElement).dataset.itemName;
            const itemType = (btn as HTMLElement).dataset.itemType;
            const portType = (btn as HTMLElement).dataset.portType || 'output';
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (itemName && itemType) {
                    const blockData = this.getBlockData(blockId);
                    if (blockData) {
                        const config = blockData.data;
                        let items: Record<string, any> | undefined;
                        
                        switch (itemType) {
                            case 'variable':
                                if (blockData.type === BlockType.Variable) {
                                    items = portType === 'input' ? config.inputs : config.outputs;
                                    if (!items) items = config.variables;
                                }
                                break;
                            case 'header':
                                if (blockData.type === BlockType.HttpRequest) {
                                    items = portType === 'input' ? config.inputs : config.outputs;
                                    if (!items) items = config.headers;
                                }
                                break;
                            case 'output':
                                if (blockData.type === BlockType.End) {
                                    items = portType === 'input' ? config.inputs : config.finalOutputs;
                                    if (!items) items = config.outputs;
                                }
                                break;
                        }
                        
                        if (items && items[itemName] !== undefined) {
                            const itemValue = items[itemName];
                            let itemTypeValue = 'string';
                            if (itemValue === null || itemValue === undefined) {
                                itemTypeValue = 'string';
                            } else if (typeof itemValue === 'number') {
                                itemTypeValue = 'number';
                            } else if (typeof itemValue === 'boolean') {
                                itemTypeValue = 'boolean';
                            } else if (Array.isArray(itemValue)) {
                                itemTypeValue = 'array';
                            } else if (typeof itemValue === 'object') {
                                itemTypeValue = 'object';
                            }
                            const displayValue = typeof itemValue === 'object' ? JSON.stringify(itemValue) : String(itemValue || '');
                            
                            this.addItemModal.show(
                                itemType,
                                portType as 'input' | 'output',
                                (name: string, type: string, value: string) => {
                                    let finalValue: any = value;
                                    try {
                                        switch (type) {
                                            case 'number':
                                                finalValue = value ? parseFloat(value) : 0;
                                                break;
                                            case 'boolean':
                                                finalValue = value.toLowerCase() === 'true';
                                                break;
                                            case 'array':
                                                finalValue = value ? JSON.parse(value) : [];
                                                break;
                                            case 'object':
                                                finalValue = value ? JSON.parse(value) : {};
                                                break;
                                            default:
                                                finalValue = value;
                                        }
                                    } catch {
                                        finalValue = value;
                                    }
                                    
                                    if (name !== itemName) {
                                        this.emit('blockRenameKeyValue', { blockId, oldName: itemName, newName: name, itemType, portType });
                                        const timeoutId = window.setTimeout(() => {
                                            this.timeoutIds.delete(timeoutId);
                                            this.emit('blockKeyValueTypeChange', { blockId, itemName: name, type, itemType, portType });
                                            this.emit('blockKeyValueChange', { blockId, itemName: name, value: finalValue, itemType, portType });
                                        }, 100);
                                        this.trackTimeout(timeoutId);
                                    } else {
                                        this.emit('blockKeyValueTypeChange', { blockId, itemName, type, itemType, portType });
                                        this.emit('blockKeyValueChange', { blockId, itemName, value: finalValue, itemType, portType });
                                    }
                                },
                                itemName,
                                itemTypeValue,
                                displayValue
                            );
                        }
                    }
                }
            });
        });
        
        // Delete item button
        blockElement.querySelectorAll('.btn-delete-input').forEach(btn => {
            const itemName = (btn as HTMLElement).dataset.itemName;
            const itemType = (btn as HTMLElement).dataset.itemType;
            const portType = (btn as HTMLElement).closest('.block-input-row')?.getAttribute('data-port-type') || 'output';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (itemName && itemType) {
                    this.emit('blockDeleteKeyValue', { blockId, itemName, itemType, portType });
                }
            });
        });
        
        // Item name change
        blockElement.querySelectorAll('.block-input-name').forEach(input => {
            const itemType = (input as HTMLElement).dataset.itemType;
            const portType = (input as HTMLElement).closest('.block-input-row')?.getAttribute('data-port-type') || 'output';
            input.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();
                if (originalName && newName && newName !== originalName && itemType) {
                    this.emit('blockRenameKeyValue', { blockId, oldName: originalName, newName, itemType, portType });
                }
            });
        });
        
        // Item value change
        blockElement.querySelectorAll('.block-input-value, .block-input-name').forEach(input => {
            input.addEventListener('mousedown', (e) => e.stopPropagation());
            input.addEventListener('click', (e) => e.stopPropagation());
            
            if (input.classList.contains('block-input-value')) {
                const itemType = (input as HTMLElement).dataset.itemType;
                const portType = (input as HTMLElement).closest('.block-input-row')?.getAttribute('data-port-type') || 'output';
                input.addEventListener('input', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const itemName = target.dataset.itemName;
                    const value = target.value;
                    if (itemName && itemType) {
                        this.emit('blockKeyValueChange', { blockId, itemName, value, itemType, portType });
                    }
                });
                input.addEventListener('blur', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const itemName = target.dataset.itemName;
                    const value = target.value;
                    if (itemName && itemType) {
                        this.emit('blockKeyValueChange', { blockId, itemName, value, itemType, portType });
                    }
                });
            }
        });
        
        // Item type change
        blockElement.querySelectorAll('.input-type-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const typeSelector = (option as HTMLElement).closest('.input-type-selector');
                const itemName = typeSelector?.getAttribute('data-item-name');
                const itemType = typeSelector?.getAttribute('data-item-type');
                const portType = typeSelector?.closest('.block-input-row')?.getAttribute('data-port-type') || 'output';
                const newType = (option as HTMLElement).dataset.type;
                if (itemName && itemType && newType) {
                    this.emit('blockKeyValueTypeChange', { blockId, itemName, type: newType, itemType, portType });
                }
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!blockElement.contains(target)) {
                blockElement.querySelectorAll('.input-type-dropdown').forEach(dropdown => {
                    (dropdown as HTMLElement).style.display = 'none';
                });
            }
        });
    }
}
