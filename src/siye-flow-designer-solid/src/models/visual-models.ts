/**
 * Visual Models — adapted for SolidJS (EventEmitter removed; use signals/store).
 */
import { BlockType, EdgeType } from './workflow-models';

export interface Position { x: number; y: number; }

export interface VisualPort {
    name: string;
    type: string;
    label?: string;
}

export interface BlockField {
    name: string;
    label?: string;
    type: 'text' | 'select' | 'number' | 'checkbox' | 'keyvalue';
    placeholder?: string;
    value?: string;
    options?: Array<string | { value: string; label: string }>;
}

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
    hasBreakpoint?: boolean;
    executionState?: 'executing' | 'success' | 'fail' | null;
}

export interface VisualConnection {
    id: string;
    type: EdgeType;
    sourceBlockId: string;
    sourcePortName: string;
    targetBlockId: string;
    targetPortName: string;
}
