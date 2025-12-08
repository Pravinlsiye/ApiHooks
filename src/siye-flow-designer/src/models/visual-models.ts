/**
 * Visual Models for the Flow Designer
 */

import { BlockType, EdgeType } from './workflow-models';

/**
 * Position in 2D space
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Port definition for visual blocks
 */
export interface VisualPort {
    name: string;
    type: string;
    label?: string;
}

/**
 * Field definition for block forms
 */
export interface BlockField {
    name: string;
    label?: string;
    type: 'text' | 'select' | 'number' | 'checkbox';
    placeholder?: string;
    value?: string;
    options?: Array<string | { value: string; label: string }>;
}

/**
 * Visual representation of a workflow block
 */
export interface VisualBlock {
    id: string;
    type: BlockType;
    name: string;
    position: Position;
    width: number;
    height: number;
    selected: boolean;
    inputPorts: VisualPort[];
    outputPorts: VisualPort[];
    fields: BlockField[];
    fieldValues: Record<string, any>;
    data?: Record<string, unknown>;
}

/**
 * Visual representation of a connection
 */
export interface VisualConnection {
    id: string;
    type: EdgeType;
    sourceBlockId: string;
    sourcePortName: string;
    targetBlockId: string;
    targetPortName: string;
}

/**
 * Simple event emitter for component communication
 */
export type EventHandler<T = unknown> = (data: T) => void;

export class EventEmitter {
    private events: Map<string, EventHandler[]> = new Map();

    on<T = unknown>(event: string, handler: EventHandler<T>): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(handler as EventHandler);
    }

    off<T = unknown>(event: string, handler: EventHandler<T>): void {
        const handlers = this.events.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler as EventHandler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit<T = unknown>(event: string, data: T): void {
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

    removeAllListeners(): void {
        this.events.clear();
    }
}

