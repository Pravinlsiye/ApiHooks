/**
 * Efficient DOM diffing and memoization utilities
 * Only updates changed elements, reducing unnecessary DOM operations
 */
export class DOMDiff {
    /**
     * Efficiently update DOM list based on data changes
     * Only adds/removes/updates changed items
     * 
     * @example
     * ```typescript
     * DOMDiff.updateList(
     *     container,
     *     blocks,
     *     (block) => createBlockElement(block),
     *     (element, block) => updateBlockElement(element, block),
     *     (block) => block.id
     * );
     * ```
     */
    static updateList<T>(
        container: HTMLElement,
        items: Map<string, T> | T[],
        createElement: (item: T, id: string) => HTMLElement,
        updateElement?: (element: HTMLElement, item: T, id: string) => void,
        getKey: (item: T) => string = (item: T) => (item as any).id
    ): void {
        const existingElements = new Map<string, HTMLElement>();
        const existingKeys = new Set<string>();
        
        // Collect existing elements
        Array.from(container.children).forEach(child => {
            let key = child.getAttribute('data-key');
            if (!key) {
                const id = child.id;
                if (id) {
                    if (id.startsWith('block-')) {
                        key = id.substring(6);
                    } else {
                        key = id;
                    }
                }
            }
            if (key) {
                existingElements.set(key, child as HTMLElement);
                existingKeys.add(key);
                if (!child.getAttribute('data-key')) {
                    child.setAttribute('data-key', key);
                }
            }
        });
        
        // Convert array to map if needed
        const itemsMap = items instanceof Map 
            ? items 
            : new Map(items.map(item => [getKey(item), item]));
        
        const newKeys = new Set(itemsMap.keys());
        
        // Remove deleted items
        existingKeys.forEach(key => {
            if (!newKeys.has(key)) {
                const element = existingElements.get(key);
                if (element) {
                    element.remove();
                }
            }
        });
        
        // Update or add items
        itemsMap.forEach((item, key) => {
            const existing = existingElements.get(key);
            if (existing) {
                if (updateElement) {
                    updateElement(existing, item, key);
                } else {
                    const newElement = createElement(item, key);
                    newElement.setAttribute('data-key', key);
                    existing.replaceWith(newElement);
                }
            } else {
                const element = createElement(item, key);
                element.setAttribute('data-key', key);
                container.appendChild(element);
            }
        });
    }
    
    /**
     * Memoize expensive computations
     * 
     * @example
     * ```typescript
     * const memoizedCalc = DOMDiff.memoize(
     *     (input: string) => expensiveCalculation(input),
     *     (input) => input // Cache key - REQUIRED
     * );
     * ```
     */
    static memoize<Args extends any[], Return>(
        fn: (...args: Args) => Return,
        keyFn: (...args: Args) => string,
        maxCacheSize: number = 100
    ): (...args: Args) => Return {
        const cache = new Map<string, Return>();
        
        return (...args: Args): Return => {
            const key = keyFn(...args);
            
            if (cache.has(key)) {
                return cache.get(key)!;
            }
            
            const result = fn(...args);
            
            // Limit cache size (LRU-style)
            if (cache.size >= maxCacheSize) {
                const firstKey = cache.keys().next().value;
                if (firstKey !== undefined) {
                    cache.delete(firstKey);
                }
            }
            
            cache.set(key, result);
            return result;
        };
    }
    
    /**
     * Debounce function calls
     * Waits for delay after last call before executing
     * 
     * @example
     * ```typescript
     * const debouncedSearch = DOMDiff.debounce(
     *     (query: string) => search(query),
     *     300
     * );
     * ```
     */
    static debounce<Args extends any[]>(
        fn: (...args: Args) => void,
        delay: number
    ): (...args: Args) => void {
        let timeoutId: number | null = null;
        
        return (...args: Args) => {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
            timeoutId = window.setTimeout(() => {
                fn(...args);
                timeoutId = null;
            }, delay);
        };
    }
    
    /**
     * Throttle function calls with trailing edge execution
     * 
     * @example
     * ```typescript
     * const throttledMouseMove = DOMDiff.throttle(
     *     (e: MouseEvent) => onMouseMove(e),
     *     16 // ~60fps
     * );
     * ```
     */
    static throttle<Args extends any[]>(
        fn: (...args: Args) => void,
        delay: number
    ): (...args: Args) => void {
        let lastCall = 0;
        let timeoutId: number | null = null;
        
        return (...args: Args) => {
            const now = Date.now();
            
            if (now - lastCall >= delay) {
                lastCall = now;
                fn(...args);
            } else {
                if (timeoutId === null) {
                    timeoutId = window.setTimeout(() => {
                        lastCall = Date.now();
                        fn(...args);
                        timeoutId = null;
                    }, delay - (now - lastCall));
                }
            }
        };
    }
}

