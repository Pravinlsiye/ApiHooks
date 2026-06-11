/**
 * Per-block field configuration for the Settings Panel.
 * Additive layer on top of VisualBlock.fields — the panel reads fieldValues
 * directly and uses this schema for rich UI controls.
 */

import { BlockType } from '../models/workflow-models';

export type PanelFieldType =
    | 'text'
    | 'textarea'
    | 'expression'
    | 'number'
    | 'pill-select'
    | 'select'
    | 'keyvalue'
    | 'checkbox';

export interface PanelField {
    name: string;
    label: string;
    type: PanelFieldType;
    placeholder?: string;
    hint?: string;
    options?: string[];
    unit?: string;
    defaultValue?: string;
}

export const BLOCK_PANEL_FIELDS: Partial<Record<BlockType, PanelField[]>> = {
    [BlockType.Start]: [
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'What does this workflow do?' },
        { name: 'values', label: 'Initial Variables', type: 'keyvalue', hint: 'Key-value pairs set at workflow start' },
    ],

    [BlockType.End]: [
        { name: 'outputs', label: 'Outputs', type: 'keyvalue', hint: 'Variables to expose as workflow outputs' },
    ],

    [BlockType.HttpRequest]: [
        { name: 'method', label: 'Method', type: 'pill-select', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], defaultValue: 'GET' },
        { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/{{endpoint}}' },
        { name: 'headers', label: 'Headers', type: 'keyvalue', hint: 'e.g. Authorization: Bearer {{token}}' },
        { name: 'body', label: 'Body', type: 'textarea', placeholder: '{ "key": "{{value}}" }' },
        { name: 'outputs', label: 'Extract Outputs', type: 'keyvalue', hint: 'variable: $.jsonpath.expression' },
    ],

    [BlockType.Variable]: [
        { name: 'name', label: 'Variable Name', type: 'text', placeholder: 'myVariable' },
        { name: 'value', label: 'Value', type: 'text', placeholder: '{{someOtherVar}} or literal' },
    ],

    [BlockType.Log]: [
        { name: 'message', label: 'Message', type: 'text', placeholder: 'Log: {{variableName}}' },
        { name: 'level', label: 'Level', type: 'pill-select', options: ['info', 'warn', 'error', 'debug'], defaultValue: 'info' },
    ],

    [BlockType.Delay]: [
        { name: 'duration', label: 'Duration', type: 'number', placeholder: '1000', defaultValue: '1000' },
        { name: 'unit', label: 'Unit', type: 'pill-select', options: ['ms', 's', 'm'], defaultValue: 'ms' },
    ],

    [BlockType.Condition]: [
        { name: 'expression', label: 'Expression', type: 'expression', placeholder: '{{statusCode}} == 200', hint: 'Evaluates to true or false' },
    ],

    [BlockType.Switch]: [
        { name: 'expression', label: 'Expression', type: 'expression', placeholder: '{{statusCode}}', hint: 'Value to match against cases' },
    ],

    [BlockType.Loop]: [
        { name: 'items', label: 'Items', type: 'expression', placeholder: '{{myArray}}', hint: 'Array variable to iterate' },
        { name: 'maxIterations', label: 'Max Iterations', type: 'number', placeholder: '1000', hint: 'Safety limit (0 = unlimited)' },
    ],

    [BlockType.Evaluate]: [
        { name: 'expression', label: 'Expression', type: 'textarea', placeholder: 'return {{value}} * 2;', hint: 'JavaScript expression; use return to set output' },
        { name: 'outputVariable', label: 'Output Variable', type: 'text', placeholder: 'result' },
    ],

    [BlockType.BatchProcess]: [
        { name: 'items', label: 'Items', type: 'expression', placeholder: '{{myArray}}', hint: 'Array to process in parallel' },
        { name: 'concurrency', label: 'Concurrency', type: 'number', placeholder: '5', defaultValue: '5', hint: 'Max parallel executions' },
    ],

    [BlockType.SubWorkflow]: [
        { name: 'workflowId', label: 'Workflow ID', type: 'text', placeholder: 'my-nested-workflow', hint: 'ID of the workflow to execute inline' },
    ],

    [BlockType.WebhookTrigger]: [
        { name: 'path', label: 'Path', type: 'text', placeholder: '/webhook/my-event' },
        { name: 'method', label: 'Method', type: 'pill-select', options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], defaultValue: 'POST' },
    ],

    [BlockType.FileDownload]: [
        { name: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com/file.csv' },
        { name: 'outputVar', label: 'Output Variable', type: 'text', placeholder: 'fileData', hint: 'Variable to store file contents (base64 for binary, text for text/*)' },
        { name: 'encoding', label: 'Encoding', type: 'pill-select', options: ['auto', 'base64', 'text'], defaultValue: 'auto' },
        { name: 'saveAs', label: 'Save to Disk (browser only)', type: 'checkbox' },
        { name: 'fileName', label: 'File Name', type: 'text', placeholder: 'output.csv', hint: 'Used when Save to Disk is enabled' },
    ],

    [BlockType.FileUpload]: [
        { name: 'outputVar', label: 'Output Variable', type: 'text', placeholder: 'uploadedFile', hint: 'Variable to store file contents' },
        { name: 'accept', label: 'Accept', type: 'text', placeholder: '.csv,.json,*/*', hint: 'File types accepted (MIME type or extension)' },
        { name: 'encoding', label: 'Encoding', type: 'pill-select', options: ['auto', 'base64', 'text'], defaultValue: 'auto' },
    ],

    [BlockType.FileStreamWriter]: [
        { name: 'streamVar', label: 'Stream Variable', type: 'text', placeholder: 'myStream', hint: 'Variable that accumulates the written data' },
        { name: 'value', label: 'Value', type: 'text', placeholder: '{{line}}', hint: 'Value to append on each call' },
        { name: 'separator', label: 'Separator', type: 'text', placeholder: '\\n', hint: 'Appended between writes (default: newline)' },
    ],

    [BlockType.FileStreamReader]: [
        { name: 'source', label: 'Source Variable', type: 'text', placeholder: '{{fileData}}', hint: 'Variable holding the file contents to iterate' },
        { name: 'mode', label: 'Mode', type: 'pill-select', options: ['lines', 'chars', 'bytes'], defaultValue: 'lines' },
        { name: 'chunkSize', label: 'Chunk Size', type: 'number', placeholder: '1', hint: 'Lines / chars per iteration. Increase (e.g. 100) for large files.' },
        { name: 'skip', label: 'Skip Lines', type: 'number', placeholder: '0', hint: 'Skip the first N lines (e.g. 1 to skip a CSV header)' },
        { name: 'limit', label: 'Max Chunks', type: 'number', placeholder: '0', hint: '0 = process all. Set a number to cap iterations (useful for large files).' },
        { name: 'outputVar', label: 'Chunk Variable', type: 'text', placeholder: 'chunk', hint: 'Variable set to the current chunk each iteration' },
    ],
};

