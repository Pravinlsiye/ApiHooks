import { BlockType, EdgeType } from '../models/workflow-models';

/**
 * Position in 2D space
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Visual representation of a workflow block (Node)
 */
export interface VisualBlock {
    id: string;
    type: BlockType;
    label?: string;
    data: any; // Configuration data
    position: Position;
    width: number;
    height: number;
    selected: boolean;
    inputPorts?: VisualPort[];
    outputPorts?: VisualPort[];
}

/**
 * Visual representation of a port (Handle)
 */
export interface VisualPort {
    name: string; // ID of the handle
    type: string; // Data type (string, number, execution)
    label?: string; // Display name
    position: Position; // Relative to block
    connected: boolean;
    isInput?: boolean;
}

/**
 * Visual representation of a connection (Edge)
 */
export interface VisualConnection {
    id: string;
    type: EdgeType;
    sourceBlockId: string;
    sourcePortName: string;
    targetBlockId: string;
    targetPortName: string;
    path: string; // SVG path data
    selected: boolean;
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
    defaultData: any; // Default configuration
}

/**
 * Event handler type with proper typing
 */
export type EventHandler<T = any> = (data: T) => void;

/**
 * Event emitter interface with better type safety
 */
export interface EventEmitter {
    on<T = any>(event: string, handler: EventHandler<T>): void;
    off<T = any>(event: string, handler: EventHandler<T>): void;
    emit<T = any>(event: string, data: T): void;
}

/**
 * Simple event emitter implementation with improved type safety
 */
export class SimpleEventEmitter implements EventEmitter {
    private events: Map<string, EventHandler[]> = new Map();
    
    on<T = any>(event: string, handler: EventHandler<T>): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(handler as EventHandler);
    }
    
    off<T = any>(event: string, handler: EventHandler<T>): void {
        const handlers = this.events.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler as EventHandler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    emit<T = any>(event: string, data: T): void {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for '${event}':`, error);
                }
            });
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
        icon: 'start',
        category: 'Core',
        description: 'Entry point of the workflow',
        color: '#4CAF50',
        defaultData: { profiles: [], inputs: {} }
    },
    {
        type: BlockType.End,
        name: 'End',
        icon: 'end',
        category: 'Core',
        description: 'Exit point of the workflow',
        color: '#f44336',
        defaultData: { outputs: {} }
    },
    {
        type: BlockType.HttpRequest,
        name: 'HTTP Request',
        icon: 'http',
        category: 'Connectivity',
        description: 'Make an HTTP API call',
        color: '#2196F3',
        defaultData: { method: 'GET', url: '', headers: {} }
    },
    {
        type: BlockType.Variable,
        name: 'Variable',
        icon: 'variable',
        category: 'Core',
        description: 'Set, get, or delete variables',
        color: '#FF9800',
        defaultData: { operation: 'set', values: {} }
    },
    {
        type: BlockType.Switch,
        name: 'Switch',
        icon: 'switch', // You need to add this icon SVG
        category: 'Logic',
        description: 'Branch based on logic',
        color: '#9C27B0',
        defaultData: { expression: '', cases: [], defaultCaseId: 'default' }
    },
    {
        type: BlockType.Delay,
        name: 'Delay',
        icon: 'delay',
        category: 'Logic',
        description: 'Wait for specified time',
        color: '#00BCD4',
        defaultData: { duration: 1000, unit: 'milliseconds' }
    },
    {
        type: BlockType.Log,
        name: 'Log',
        icon: 'log',
        category: 'Core',
        description: 'Log a message',
        color: '#607D8B',
        defaultData: { message: '', level: 'info' }
    },
    {
        type: BlockType.Evaluate,
        name: 'Evaluate',
        icon: 'evaluate',
        category: 'Core',
        description: 'Evaluate an expression',
        color: '#795548',
        defaultData: { language: 'jsonpath', expression: '' }
    },
    {
        type: BlockType.Loop,
        name: 'Loop',
        icon: 'loop',
        category: 'Logic',
        description: 'Iterate over items',
        color: '#E91E63',
        defaultData: { items: [], mode: 'sequential' }
    },
    {
        type: BlockType.BatchProcess,
        name: 'Batch',
        icon: 'batch', // Need icon
        category: 'Logic',
        description: 'Parallel processing',
        color: '#3F51B5',
        defaultData: { items: [], concurrency: 5 }
    }
];
