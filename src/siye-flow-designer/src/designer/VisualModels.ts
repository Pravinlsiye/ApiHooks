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
    inputPorts?: VisualPort[];
    outputPorts?: VisualPort[];
}

/**
 * Visual representation of a port
 */
export interface VisualPort {
    name: string;
    type: string;
    position: Position; // Relative to block
    connected: boolean;
}

/**
 * Visual representation of a connection between blocks
 */
export interface VisualConnection {
    id: string;
    sourceBlockId: string;
    sourcePortName: string;
    targetBlockId: string;
    targetPortName: string;
    path: string; // SVG path data
}

/**
 * Legacy connection (for backward compatibility)
 */
export interface LegacyConnection {
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
 * Icons are now SVG identifiers (use with Icons utility)
 */
export const BLOCK_TEMPLATES: BlockTemplate[] = [
    {
        type: BlockType.Start,
        name: 'Start',
        icon: 'start',
        category: 'Control',
        description: 'Entry point of the workflow',
        color: '#4CAF50'
    },
    {
        type: BlockType.End,
        name: 'End',
        icon: 'end',
        category: 'Control',
        description: 'Exit point of the workflow',
        color: '#f44336'
    },
    {
        type: BlockType.HttpRequest,
        name: 'HTTP Request',
        icon: 'http',
        category: 'Action',
        description: 'Make an HTTP API call',
        color: '#2196F3'
    },
    {
        type: BlockType.Variable,
        name: 'Variable',
        icon: 'variable',
        category: 'Data',
        description: 'Set, get, or delete variables',
        color: '#FF9800'
    },
    {
        type: BlockType.Condition,
        name: 'Condition',
        icon: 'condition',
        category: 'Control',
        description: 'Branch based on a condition',
        color: '#9C27B0'
    },
    {
        type: BlockType.Delay,
        name: 'Delay',
        icon: 'delay',
        category: 'Action',
        description: 'Wait for specified time',
        color: '#00BCD4'
    },
    {
        type: BlockType.Log,
        name: 'Log',
        icon: 'log',
        category: 'Debug',
        description: 'Log a message',
        color: '#607D8B'
    },
    {
        type: BlockType.Evaluate,
        name: 'Evaluate',
        icon: 'evaluate',
        category: 'Data',
        description: 'Evaluate an expression',
        color: '#795548'
    },
    {
        type: BlockType.Loop,
        name: 'Loop',
        icon: 'loop',
        category: 'Control',
        description: 'Iterate over items',
        color: '#E91E63'
    },
    {
        type: BlockType.TryCatch,
        name: 'Try/Catch',
        icon: 'trycatch',
        category: 'Control',
        description: 'Error handling',
        color: '#FFC107'
    }
];
