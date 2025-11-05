import { BlockType } from '../models/workflow-models';

/**
 * Position in 2D space
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Visual representation of a workflow block
 */
export interface VisualBlock {
    id: string;
    type: BlockType;
    position: Position;
    width: number;
    height: number;
    selected: boolean;
}

/**
 * Visual representation of a connection between blocks
 */
export interface VisualConnection {
    id: string;
    source: string;
    target: string;
    type: string; // 'success', 'failure', 'complete'
}

/**
 * Block template for the palette
 */
export interface BlockTemplate {
    type: BlockType;
    name: string;
    icon: string;
    category: string;
    description: string;
    color: string;
}

/**
 * Event emitter interface
 */
export interface EventEmitter {
    on(event: string, handler: Function): void;
    off(event: string, handler: Function): void;
    emit(event: string, ...args: any[]): void;
}

/**
 * Simple event emitter implementation
 */
export class SimpleEventEmitter implements EventEmitter {
    private events: Map<string, Function[]> = new Map();
    
    on(event: string, handler: Function): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(handler);
    }
    
    off(event: string, handler: Function): void {
        const handlers = this.events.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    emit(event: string, ...args: any[]): void {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(...args));
        }
    }
}

/**
 * Block templates configuration
 */
export const BLOCK_TEMPLATES: BlockTemplate[] = [
    {
        type: BlockType.Start,
        name: 'Start',
        icon: '🟢',
        category: 'Control',
        description: 'Entry point of the workflow',
        color: '#4CAF50'
    },
    {
        type: BlockType.End,
        name: 'End',
        icon: '🔴',
        category: 'Control',
        description: 'Exit point of the workflow',
        color: '#f44336'
    },
    {
        type: BlockType.HttpRequest,
        name: 'HTTP Request',
        icon: '🌐',
        category: 'Action',
        description: 'Make an HTTP API call',
        color: '#2196F3'
    },
    {
        type: BlockType.Variable,
        name: 'Variable',
        icon: '📦',
        category: 'Data',
        description: 'Set, get, or delete variables',
        color: '#FF9800'
    },
    {
        type: BlockType.Condition,
        name: 'Condition',
        icon: '❓',
        category: 'Control',
        description: 'Branch based on a condition',
        color: '#9C27B0'
    },
    {
        type: BlockType.Delay,
        name: 'Delay',
        icon: '⏰',
        category: 'Action',
        description: 'Wait for specified time',
        color: '#00BCD4'
    },
    {
        type: BlockType.Log,
        name: 'Log',
        icon: '📝',
        category: 'Debug',
        description: 'Log a message',
        color: '#607D8B'
    },
    {
        type: BlockType.Evaluate,
        name: 'Evaluate',
        icon: '🧮',
        category: 'Data',
        description: 'Evaluate an expression',
        color: '#795548'
    },
    {
        type: BlockType.Loop,
        name: 'Loop',
        icon: '🔄',
        category: 'Control',
        description: 'Iterate over items',
        color: '#E91E63'
    },
    {
        type: BlockType.TryCatch,
        name: 'Try/Catch',
        icon: '⚠️',
        category: 'Control',
        description: 'Error handling',
        color: '#FFC107'
    }
];
