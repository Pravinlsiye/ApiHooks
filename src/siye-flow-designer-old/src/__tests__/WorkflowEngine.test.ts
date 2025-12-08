import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowEngine } from '../core/WorkflowEngine';
import { BlockType, StartBlock, EndBlock, HttpRequestBlock, VariableBlock, ConditionBlock, DelayBlock, LogBlock } from '../models/workflow-models';

describe('WorkflowEngine', () => {
    let engine: WorkflowEngine;

    beforeEach(() => {
        engine = new WorkflowEngine();
    });

    describe('Initialization', () => {
        it('should initialize with empty workflow', () => {
            const workflow = engine.getWorkflow();
            expect(workflow.name).toBe('New Workflow');
            expect(workflow.blocks).toEqual([]);
        });

        it('should have empty blocks map initially', () => {
            const blocks = engine.getBlocks();
            expect(blocks).toEqual([]);
        });
    });

    describe('Block Creation', () => {
        it('should create Start block', () => {
            const block = engine.createBlock(BlockType.Start);
            expect(block.type).toBe(BlockType.Start);
            expect(block.id).toBeDefined();
            expect((block as StartBlock).config.profiles).toBeDefined();
            expect((block as StartBlock).config.profiles!.length).toBeGreaterThan(0);
        });

        it('should create End block', () => {
            const block = engine.createBlock(BlockType.End);
            expect(block.type).toBe(BlockType.End);
            expect(block.id).toBeDefined();
            expect((block as EndBlock).config.outputs).toBeDefined();
        });

        it('should create HttpRequest block with output ports', () => {
            const block = engine.createBlock(BlockType.HttpRequest);
            expect(block.type).toBe(BlockType.HttpRequest);
            expect((block as HttpRequestBlock).outputPorts).toBeDefined();
            expect((block as HttpRequestBlock).outputPorts!.length).toBeGreaterThanOrEqual(2);
            const portNames = (block as HttpRequestBlock).outputPorts!.map(p => p.name);
            expect(portNames).toContain('success');
            expect(portNames).toContain('fail');
        });

        it('should create Variable block', () => {
            const block = engine.createBlock(BlockType.Variable);
            expect(block.type).toBe(BlockType.Variable);
            expect((block as VariableBlock).config.variables).toBeDefined();
        });

        it('should create Condition block', () => {
            const block = engine.createBlock(BlockType.Condition);
            expect(block.type).toBe(BlockType.Condition);
        });

        it('should create Delay block', () => {
            const block = engine.createBlock(BlockType.Delay);
            expect(block.type).toBe(BlockType.Delay);
        });

        it('should create Log block', () => {
            const block = engine.createBlock(BlockType.Log);
            expect(block.type).toBe(BlockType.Log);
        });

        it('should throw error for unknown block type', () => {
            expect(() => {
                engine.createBlock('unknown' as BlockType);
            }).toThrow();
        });
    });

    describe('Block Management', () => {
        it('should add block to workflow', () => {
            const block = engine.createBlock(BlockType.Start);
            engine.addBlock(block);
            
            const workflow = engine.getWorkflow();
            expect(workflow.blocks?.length).toBe(1);
            expect(workflow.blocks?.[0].id).toBe(block.id);
        });

        it('should generate ID for block without ID', () => {
            const block = engine.createBlock(BlockType.Start);
            const originalId = block.id;
            block.id = undefined as any;
            engine.addBlock(block);
            
            expect(block.id).toBeDefined();
            expect(block.id).toContain('start');
            expect(block.id).not.toBe(originalId);
        });

        it('should get block by ID', () => {
            const block = engine.createBlock(BlockType.Start);
            engine.addBlock(block);
            
            const retrieved = engine.getBlock(block.id!);
            expect(retrieved).toBeDefined();
            expect(retrieved!.id).toBe(block.id);
        });

        it('should return undefined for non-existent block', () => {
            const block = engine.getBlock('non-existent');
            expect(block).toBeUndefined();
        });

        it('should get all blocks', () => {
            engine.addBlock(engine.createBlock(BlockType.Start));
            engine.addBlock(engine.createBlock(BlockType.End));
            engine.addBlock(engine.createBlock(BlockType.HttpRequest));
            
            const blocks = engine.getBlocks();
            expect(blocks.length).toBe(3);
        });

        it('should update block', () => {
            const block = engine.createBlock(BlockType.Start);
            engine.addBlock(block);
            
            engine.updateBlock(block.id!, { name: 'Updated Start' });
            
            const updated = engine.getBlock(block.id!);
            expect(updated!.name).toBe('Updated Start');
        });

        it('should remove block', () => {
            const block = engine.createBlock(BlockType.Start);
            engine.addBlock(block);
            
            engine.removeBlock(block.id!);
            
            const workflow = engine.getWorkflow();
            expect(workflow.blocks?.length).toBe(0);
            expect(engine.getBlock(block.id!)).toBeUndefined();
        });
    });

    describe('Workflow Serialization', () => {
        it('should save workflow to JSON', () => {
            const block = engine.createBlock(BlockType.Start);
            engine.addBlock(block);
            
            const json = engine.saveWorkflow();
            expect(json).toBeDefined();
            expect(() => JSON.parse(json)).not.toThrow();
            
            const parsed = JSON.parse(json);
            expect(parsed.blocks).toBeDefined();
            expect(parsed.blocks.length).toBe(1);
        });

        it('should load workflow from JSON', () => {
            const testWorkflow = {
                name: 'Test Workflow',
                description: 'Test Description',
                version: '1.0',
                blocks: [
                    {
                        id: 'start-1',
                        type: 'start',
                        name: 'Start',
                        config: {
                            profiles: [{
                                name: 'Default',
                                default: true,
                                inputs: {}
                            }],
                            selectedProfile: 'Default'
                        }
                    },
                    {
                        id: 'end-1',
                        type: 'end',
                        name: 'End',
                        config: {
                            outputs: {}
                        }
                    }
                ]
            };
            
            engine.loadWorkflow(JSON.stringify(testWorkflow));
            
            const workflow = engine.getWorkflow();
            expect(workflow.name).toBe('Test Workflow');
            expect(workflow.blocks?.length).toBe(2);
        });

        it('should throw error for invalid JSON', () => {
            expect(() => {
                engine.loadWorkflow('invalid json');
            }).toThrow();
        });

        it('should handle workflow with no blocks', () => {
            const testWorkflow = {
                name: 'Empty Workflow',
                blocks: []
            };
            
            engine.loadWorkflow(JSON.stringify(testWorkflow));
            
            const workflow = engine.getWorkflow();
            expect(workflow.blocks).toEqual([]);
            expect(workflow.blocks?.length).toBe(0);
        });
    });

    describe('Workflow Validation', () => {
        it('should validate workflow with Start and End', () => {
            engine.addBlock(engine.createBlock(BlockType.Start));
            engine.addBlock(engine.createBlock(BlockType.End));
            
            const result = engine.validate();
            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should fail validation without Start block', () => {
            engine.addBlock(engine.createBlock(BlockType.End));
            
            const result = engine.validate();
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Workflow must have a Start block');
        });

        it('should fail validation without End block', () => {
            engine.addBlock(engine.createBlock(BlockType.Start));
            
            const result = engine.validate();
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Workflow must have an End block');
        });

        it('should warn about blocks without connections', () => {
            const startBlock = engine.createBlock(BlockType.Start);
            const endBlock = engine.createBlock(BlockType.End);
            const httpBlock = engine.createBlock(BlockType.HttpRequest);
            
            engine.addBlock(startBlock);
            engine.addBlock(endBlock);
            engine.addBlock(httpBlock);
            
            const result = engine.validate();
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it('should return empty errors and warnings for valid workflow', () => {
            const startBlock = engine.createBlock(BlockType.Start);
            const endBlock = engine.createBlock(BlockType.End);
            
            // Create a connection
            startBlock.onSuccess = endBlock.id;
            
            engine.addBlock(startBlock);
            engine.addBlock(endBlock);
            
            const result = engine.validate();
            expect(result.isValid).toBe(true);
        });
    });

    describe('Block ID Generation', () => {
        it('should generate unique IDs for blocks', () => {
            const block1 = engine.createBlock(BlockType.Start);
            const block2 = engine.createBlock(BlockType.Start);
            
            expect(block1.id).not.toBe(block2.id);
        });

        it('should generate IDs with correct prefix', () => {
            const startBlock = engine.createBlock(BlockType.Start);
            const httpBlock = engine.createBlock(BlockType.HttpRequest);
            
            expect(startBlock.id).toContain('start');
            expect(httpBlock.id).toContain('http');
        });
    });
});

