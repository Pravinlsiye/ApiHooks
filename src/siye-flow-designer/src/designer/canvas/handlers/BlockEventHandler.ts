import { SimpleEventEmitter } from '../../VisualModels';
import { AddItemModal } from '../../../components/AddItemModal';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { AnyWorkflowBlock } from '../../../models/workflow-models';

/**
 * Helper class for setting up block-specific event handlers
 * This extracts the complex event handler setup logic from CanvasRenderer
 */
export class BlockEventHandler extends SimpleEventEmitter {
    private addItemModal: AddItemModal;
    private confirmModal: ConfirmModal;
    private getBlockData: (blockId: string) => AnyWorkflowBlock | undefined;
    
    constructor(
        getBlockData: (blockId: string) => AnyWorkflowBlock | undefined
    ) {
        super();
        this.getBlockData = getBlockData;
        this.addItemModal = new AddItemModal();
        this.confirmModal = new ConfirmModal();
    }
    
    /**
     * Setup event handlers for Start block editable inputs
     */
    public setupStartBlockInputHandlers(blockElement: HTMLElement, blockId: string): void {
        // Add input button (Start block) - add directly without popup
        blockElement.querySelectorAll('.btn-add-input-on-block, .btn-add-item-popup').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.emit('startBlockAddInput', { blockId });
            });
        });
        
        // Edit button - open popup for editing
        blockElement.querySelectorAll('.btn-edit-input').forEach(btn => {
            const inputName = (btn as HTMLElement).dataset.inputName;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                if (inputName) {
                    const blockData = this.getBlockData(blockId);
                    if (blockData && blockData.type === 'start') {
                        const startBlock = blockData as any;
                        let effectiveInputs: Record<string, any> = {};
                        if (startBlock.config.profiles && startBlock.config.profiles.length > 0) {
                            const selectedProfile = startBlock.config.profiles.find((p: any) => p.name === startBlock.config.selectedProfile) ||
                                                   startBlock.config.profiles.find((p: any) => p.default) ||
                                                   startBlock.config.profiles[0];
                            effectiveInputs = selectedProfile?.inputs || {};
                        } else {
                            effectiveInputs = startBlock.config.inputs || {};
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
                                        setTimeout(() => {
                                            this.emit('startBlockInputTypeChange', { blockId, inputName: name, type });
                                            this.emit('startBlockInputValueChange', { blockId, inputName: name, value: finalValue });
                                        }, 100);
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
            });
        });
        
        // Delete input button
        blockElement.querySelectorAll('.btn-delete-input').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const inputName = (btn as HTMLElement).dataset.inputName;
                if (inputName) {
                    this.emit('startBlockDeleteInput', { blockId, inputName });
                }
            });
        });
        
        // Input name change
        blockElement.querySelectorAll('.block-input-name').forEach(input => {
            input.addEventListener('blur', (e) => {
                const target = e.target as HTMLInputElement;
                const originalName = target.dataset.originalName;
                const newName = target.value.trim();
                if (originalName && newName && newName !== originalName) {
                    this.emit('startBlockRenameInput', { blockId, oldName: originalName, newName });
                }
            });
        });
        
        // Input value change
        blockElement.querySelectorAll('.block-input-value, .block-input-name').forEach(input => {
            input.addEventListener('mousedown', (e) => e.stopPropagation());
            input.addEventListener('click', (e) => e.stopPropagation());
            
            if (input.classList.contains('block-input-value')) {
                input.addEventListener('input', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const inputName = target.dataset.inputName;
                    const value = target.value;
                    if (inputName) {
                        this.emit('startBlockInputValueChange', { blockId, inputName, value });
                    }
                });
                input.addEventListener('blur', (e) => {
                    e.stopPropagation();
                    const target = e.target as HTMLInputElement;
                    const inputName = target.dataset.inputName;
                    const value = target.value;
                    if (inputName) {
                        this.emit('startBlockInputValueChange', { blockId, inputName, value });
                    }
                });
            }
        });
        
        // Input type change
        blockElement.querySelectorAll('.input-type-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const typeSelector = (option as HTMLElement).closest('.input-type-selector');
                const inputName = typeSelector?.getAttribute('data-input-name');
                const newType = (option as HTMLElement).dataset.type;
                if (inputName && newType) {
                    this.emit('startBlockInputTypeChange', { blockId, inputName, type: newType });
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
                    if (blockData && blockData.type === 'end') {
                        const endBlock = blockData as any;
                        const outputs = endBlock.config?.outputs || {};
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
                                        setTimeout(() => {
                                            this.emit('endBlockOutputTypeChange', { blockId, outputName: name, type });
                                            this.emit('endBlockOutputValueChange', { blockId, outputName: name, value: finalValue });
                                        }, 100);
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
                        const config = (blockData as any).config;
                        let items: Record<string, any> | undefined;
                        
                        switch (itemType) {
                            case 'variable':
                                if (blockData.type === 'variable') {
                                    items = portType === 'input' ? config.inputs : config.outputs;
                                    if (!items) items = config.variables;
                                }
                                break;
                            case 'header':
                                if (blockData.type === 'http-request') {
                                    items = portType === 'input' ? config.inputs : config.outputs;
                                    if (!items) items = config.headers;
                                }
                                break;
                            case 'output':
                                if (blockData.type === 'end') {
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
                                        setTimeout(() => {
                                            this.emit('blockKeyValueTypeChange', { blockId, itemName: name, type, itemType, portType });
                                            this.emit('blockKeyValueChange', { blockId, itemName: name, value: finalValue, itemType, portType });
                                        }, 100);
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

