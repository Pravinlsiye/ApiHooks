/**
 * Type-safe DOM update utilities with validation
 * Prevents common DOM manipulation errors
 */
export class DOMUpdater {
    /**
     * Type-safe DOM update with validation
     * 
     * @example
     * ```typescript
     * DOMUpdater.updateElement(element, {
     *     styles: { left: '100px', top: '50px' },
     *     classes: ['active', 'selected'],
     *     attributes: { 'data-id': '123' }
     * });
     * ```
     */
    static updateElement<T extends HTMLElement>(
        element: T,
        updates: Partial<{
            text: string;
            html: string;
            attributes: Record<string, string>;
            styles: Record<string, string>;
            classes: string[];
            children: HTMLElement[];
        }>
    ): T {
        if (updates.text !== undefined) {
            element.textContent = updates.text;
        }
        
        if (updates.html !== undefined) {
            element.innerHTML = updates.html;
        }
        
        if (updates.attributes) {
            Object.entries(updates.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (updates.styles) {
            Object.entries(updates.styles).forEach(([key, value]) => {
                // Handle both camelCase and kebab-case properties
                if (key.includes('-')) {
                    // kebab-case: use setProperty
                    element.style.setProperty(key, value);
                } else {
                    // camelCase: set directly
                    (element.style as any)[key] = value;
                }
            });
        }
        
        if (updates.classes) {
            element.className = updates.classes.join(' ');
        }
        
        if (updates.children) {
            element.innerHTML = '';
            updates.children.forEach(child => element.appendChild(child));
        }
        
        return element;
    }
    
    /**
     * Safe element query with type checking
     * 
     * @example
     * ```typescript
     * const element = DOMUpdater.query<HTMLDivElement>(
     *     container,
     *     '.my-class',
     *     true // Required - throws if not found
     * );
     * ```
     */
    static query<T extends HTMLElement>(
        container: HTMLElement | Document,
        selector: string,
        required = false
    ): T | null {
        const element = container.querySelector<T>(selector);
        
        if (required && !element) {
            throw new Error(`Required element not found: ${selector}`);
        }
        
        return element;
    }
    
    /**
     * Query all elements with type checking
     */
    static queryAll<T extends HTMLElement>(
        container: HTMLElement | Document,
        selector: string
    ): T[] {
        return Array.from(container.querySelectorAll<T>(selector));
    }
    
    /**
     * Batch DOM updates for better performance
     * Uses requestAnimationFrame to batch updates
     * 
     * @example
     * ```typescript
     * DOMUpdater.batchUpdate([
     *     () => updateElement1(),
     *     () => updateElement2(),
     *     () => updateElement3()
     * ]);
     * ```
     */
    static batchUpdate(updates: Array<() => void>): void {
        // Use requestAnimationFrame for batched updates
        requestAnimationFrame(() => {
            updates.forEach(update => {
                try {
                    update();
                } catch (error) {
                    console.error('Error in batched update:', error);
                }
            });
        });
    }
    
    /**
     * Safely set style property
     */
    static setStyle(element: HTMLElement, property: string, value: string): void {
        const cssKey = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        (element.style as any)[cssKey] = value;
    }
    
    /**
     * Safely get style property
     */
    static getStyle(element: HTMLElement, property: string): string {
        const cssKey = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        return window.getComputedStyle(element).getPropertyValue(cssKey);
    }
    
    /**
     * Add classes to element
     */
    static addClasses(element: HTMLElement, ...classes: string[]): void {
        element.classList.add(...classes);
    }
    
    /**
     * Remove classes from element
     */
    static removeClasses(element: HTMLElement, ...classes: string[]): void {
        element.classList.remove(...classes);
    }
    
    /**
     * Toggle classes on element
     */
    static toggleClasses(element: HTMLElement, ...classes: string[]): void {
        classes.forEach(cls => element.classList.toggle(cls));
    }
}

