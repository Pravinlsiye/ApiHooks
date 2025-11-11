/**
 * Code splitting utility for dynamic imports and lazy loading
 * Reduces initial bundle size by loading modules on-demand
 * 
 * @example
 * ```typescript
 * // Lazy load a component
 * const PropertyPanel = await CodeSplitter.load(() => import('./PropertyPanel'));
 * const panel = new PropertyPanel('container-id');
 * 
 * // Lazy load with error handling
 * const modal = await CodeSplitter.load(
 *     () => import('./ConfirmModal'),
 *     'ConfirmModal'
 * );
 * ```
 */
export class CodeSplitter {
    private static cache = new Map<string, Promise<any>>();
    
    /**
     * Dynamically load a module with caching
     * 
     * @param loader Function that returns a dynamic import promise
     * @param moduleName Optional name for caching and error messages
     * @returns Promise resolving to the loaded module
     */
    static async load<T = any>(
        loader: () => Promise<{ [key: string]: any }>,
        moduleName?: string
    ): Promise<T> {
        const cacheKey = moduleName || 'default';
        
        // Return cached promise if already loading
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }
        
        // Create and cache loading promise
        const loadPromise = loader()
            .then(module => {
                // Extract default export or first named export
                const exported = module.default || Object.values(module)[0];
                if (!exported) {
                    throw new Error(`Module ${moduleName || 'unknown'} has no exports`);
                }
                return exported as T;
            })
            .catch(error => {
                // Remove from cache on error so we can retry
                this.cache.delete(cacheKey);
                console.error(`Failed to load module ${moduleName || 'unknown'}:`, error);
                throw error;
            });
        
        this.cache.set(cacheKey, loadPromise);
        return loadPromise;
    }
    
    /**
     * Preload a module without executing it
     * Useful for prefetching critical modules
     * 
     * @param loader Function that returns a dynamic import promise
     * @param moduleName Optional name for caching
     */
    static preload(
        loader: () => Promise<{ [key: string]: any }>,
        moduleName?: string
    ): void {
        const cacheKey = moduleName || 'default';
        
        if (!this.cache.has(cacheKey)) {
            // Start loading but don't wait for it
            this.load(loader, moduleName).catch(() => {
                // Silently handle errors for preload
            });
        }
    }
    
    /**
     * Clear the module cache
     * Useful for testing or forcing reloads
     */
    static clearCache(): void {
        this.cache.clear();
    }
    
    /**
     * Check if a module is already loaded or loading
     * 
     * @param moduleName Module name to check
     * @returns True if module is cached
     */
    static isLoaded(moduleName: string): boolean {
        return this.cache.has(moduleName);
    }
}

