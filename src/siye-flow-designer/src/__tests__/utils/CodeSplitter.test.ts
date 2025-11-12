import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeSplitter } from '../../utils/CodeSplitter';

describe('CodeSplitter', () => {
    beforeEach(() => {
        // Clear cache before each test
        (CodeSplitter as any).cache.clear();
    });

    describe('load', () => {
        it('should load module successfully', async () => {
            const mockModule = { default: { test: 'value' } };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            const result = await CodeSplitter.load(loader);
            
            expect(loader).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockModule.default);
        });

        it('should extract default export', async () => {
            const mockModule = { default: 'default-export' };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            const result = await CodeSplitter.load(loader);
            
            expect(result).toBe('default-export');
        });

        it('should extract first named export if no default', async () => {
            const mockModule = { NamedExport: 'named-export' };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            const result = await CodeSplitter.load(loader);
            
            expect(result).toBe('named-export');
        });

        it('should cache loaded modules', async () => {
            const mockModule = { default: 'cached' };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            await CodeSplitter.load(loader, 'test-module');
            await CodeSplitter.load(loader, 'test-module');
            
            // Loader should only be called once due to caching
            expect(loader).toHaveBeenCalledTimes(1);
        });

        it('should use module name for caching', async () => {
            const mockModule1 = { default: 'module1' };
            const mockModule2 = { default: 'module2' };
            const loader1 = vi.fn().mockResolvedValue(mockModule1);
            const loader2 = vi.fn().mockResolvedValue(mockModule2);
            
            const result1 = await CodeSplitter.load(loader1, 'module1');
            const result2 = await CodeSplitter.load(loader2, 'module2');
            
            expect(result1).toBe('module1');
            expect(result2).toBe('module2');
            expect(loader1).toHaveBeenCalledTimes(1);
            expect(loader2).toHaveBeenCalledTimes(1);
        });

        it('should handle loading errors', async () => {
            const error = new Error('Load failed');
            const loader = vi.fn().mockRejectedValue(error);
            
            await expect(CodeSplitter.load(loader, 'failing-module')).rejects.toThrow('Load failed');
        });

        it('should remove from cache on error', async () => {
            const error = new Error('Load failed');
            const loader = vi.fn().mockRejectedValue(error);
            
            try {
                await CodeSplitter.load(loader, 'failing-module');
            } catch (e) {
                // Expected to throw
            }
            
            // Cache should be cleared, so retry should call loader again
            const mockModule = { default: 'retry-success' };
            loader.mockResolvedValue(mockModule);
            
            const result = await CodeSplitter.load(loader, 'failing-module');
            expect(result).toBe('retry-success');
            expect(loader).toHaveBeenCalledTimes(2);
        });

        it('should throw error if module has no exports', async () => {
            const mockModule = {};
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            await expect(CodeSplitter.load(loader, 'empty-module')).rejects.toThrow('has no exports');
        });

        it('should handle multiple concurrent loads', async () => {
            const mockModule = { default: 'concurrent' };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            const promises = [
                CodeSplitter.load(loader, 'concurrent-module'),
                CodeSplitter.load(loader, 'concurrent-module'),
                CodeSplitter.load(loader, 'concurrent-module')
            ];
            
            const results = await Promise.all(promises);
            
            expect(results).toEqual(['concurrent', 'concurrent', 'concurrent']);
            // Should only load once due to caching
            expect(loader).toHaveBeenCalledTimes(1);
        });
    });

    describe('clearCache', () => {
        it('should clear all cached modules', async () => {
            const mockModule = { default: 'cached' };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            await CodeSplitter.load(loader, 'test-module');
            CodeSplitter.clearCache();
            
            await CodeSplitter.load(loader, 'test-module');
            
            // Loader should be called twice after cache clear
            expect(loader).toHaveBeenCalledTimes(2);
        });
    });

    describe('isLoaded', () => {
        it('should return false for non-loaded module', () => {
            expect(CodeSplitter.isLoaded('non-existent')).toBe(false);
        });

        it('should return true for loaded module', async () => {
            const mockModule = { default: 'loaded' };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            await CodeSplitter.load(loader, 'test-module');
            
            expect(CodeSplitter.isLoaded('test-module')).toBe(true);
        });
    });

    describe('preload', () => {
        it('should preload module without waiting', async () => {
            const mockModule = { default: 'preloaded' };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            CodeSplitter.preload(loader, 'preload-module');
            
            // Wait a bit for preload to start
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(loader).toHaveBeenCalled();
            expect(CodeSplitter.isLoaded('preload-module')).toBe(true);
        });

        it('should not reload if already cached', async () => {
            const mockModule = { default: 'cached' };
            const loader = vi.fn().mockResolvedValue(mockModule);
            
            await CodeSplitter.load(loader, 'cached-module');
            CodeSplitter.preload(loader, 'cached-module');
            
            // Should not call loader again
            expect(loader).toHaveBeenCalledTimes(1);
        });
    });
});

