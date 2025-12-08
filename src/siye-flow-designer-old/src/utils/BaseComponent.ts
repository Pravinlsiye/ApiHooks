import { SimpleEventEmitter } from '../designer/VisualModels';

/**
 * Base class for all components
 * Provides common functionality and automatic cleanup
 * 
 * @example
 * ```typescript
 * export class MyComponent extends BaseComponent {
 *     constructor(containerId: string) {
 *         super(containerId);
 *         
 *         // Clean event listener management
 *         this.addEventListener(this.container, 'click', (e) => this.onClick(e));
 *         
 *         // Register cleanup for timers
 *         const timer = setInterval(() => this.update(), 1000);
 *         this.registerCleanup(() => clearInterval(timer));
 *     }
 * }
 * ```
 */
export abstract class BaseComponent extends SimpleEventEmitter {
    protected container: HTMLElement;
    protected eventListeners: Array<{
        element: HTMLElement | Document | Window;
        event: string;
        handler: EventListener;
        options?: boolean | AddEventListenerOptions;
    }> = [];
    protected cleanupCallbacks: Array<() => void> = [];
    
    /**
     * Creates a new BaseComponent instance
     * 
     * @param containerId The ID of the container element
     * @throws {Error} If container element is not found
     * 
     * @example
     * ```typescript
     * class MyComponent extends BaseComponent {
     *   constructor() {
     *     super('my-container-id');
     *   }
     * }
     * ```
     */
    constructor(containerId: string) {
        super();
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        this.container = element;
    }

    /**
     * Adds an event listener with automatic cleanup tracking
     * 
     * Event listeners registered through this method are automatically removed
     * when `destroy()` is called, preventing memory leaks.
     * 
     * @param element The element to attach the listener to
     * @param event The event name (e.g., 'click', 'mousemove')
     * @param handler The event handler function
     * @param options Optional event listener options
     * 
     * @example Basic usage
     * ```typescript
     * const button = document.querySelector('button')!;
     * this.addEventListener(button, 'click', (e) => {
     *   console.log('Button clicked!', e);
     * });
     * ```
     * 
     * @example With options
     * ```typescript
     * // Listen only once
     * this.addEventListener(button, 'click', handler, { once: true });
     * 
     * // Use capture phase
     * this.addEventListener(document, 'click', handler, { capture: true });
     * ```
     * 
     * @example Document and Window listeners
     * ```typescript
     * // Document-level listener
     * this.addEventListener(document, 'keydown', (e) => {
     *   if (e.key === 'Escape') this.close();
     * });
     * 
     * // Window-level listener
     * this.addEventListener(window, 'resize', () => {
     *   this.handleResize();
     * });
     * ```
     */
    protected addEventListener(
        element: HTMLElement | Document | Window,
        event: string,
        handler: EventListener,
        options?: boolean | AddEventListenerOptions
    ): void {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }
    
    /**
     * Registers a cleanup callback to be executed on destroy
     * 
     * Use this to register any cleanup logic such as clearing timers,
     * disconnecting observers, or unsubscribing from services.
     * 
     * @param callback Function to execute during cleanup
     * 
     * @example Timer cleanup
     * ```typescript
     * const intervalId = setInterval(() => this.update(), 1000);
     * this.registerCleanup(() => clearInterval(intervalId));
     * ```
     * 
     * @example Observer cleanup
     * ```typescript
     * const observer = new MutationObserver(this.handleMutation);
     * observer.observe(element, { childList: true });
     * this.registerCleanup(() => observer.disconnect());
     * ```
     * 
     * @example Subscription cleanup
     * ```typescript
     * const unsubscribe = dataService.subscribe(this.handleData);
     * this.registerCleanup(() => unsubscribe());
     * ```
     */
    protected registerCleanup(callback: () => void): void {
        this.cleanupCallbacks.push(callback);
    }
    
    /**
     * Creates an element with attributes and children
     * 
     * Helper method to create DOM elements with attributes and child elements/text
     * in a single call, reducing boilerplate code.
     * 
     * @template T The element type to create
     * @param tag The HTML tag name
     * @param attributes Optional attributes (id, className, data-*, etc.)
     * @param children Optional array of child elements or text nodes
     * @returns The created element
     * 
     * @example Simple element
     * ```typescript
     * const div = this.createElement('div', {
     *   id: 'my-div',
     *   className: 'container'
     * });
     * ```
     * 
     * @example With children
     * ```typescript
     * const button = this.createElement('button', {
     *   className: 'btn btn-primary',
     *   'data-action': 'submit'
     * }, ['Submit']);
     * ```
     * 
     * @example Nested elements
     * ```typescript
     * const card = this.createElement('div', { className: 'card' }, [
     *   this.createElement('h3', {}, ['Title']),
     *   this.createElement('p', {}, ['Description text']),
     *   this.createElement('button', { className: 'btn' }, ['Action'])
     * ]);
     * ```
     */
    protected createElement<T extends HTMLElement>(
        tag: string,
        attributes?: Record<string, string>,
        children?: (HTMLElement | string)[]
    ): T {
        const element = document.createElement(tag) as T;
        
        if (attributes) {
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key.startsWith('data-')) {
                    element.setAttribute(key, value);
                } else if (key === 'style' && typeof value === 'string') {
                    element.setAttribute('style', value);
                } else {
                    (element as any)[key] = value;
                }
            });
        }
        
        if (children) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    element.appendChild(child);
                }
            });
        }
        
        return element;
    }
    
    /**
     * Render template with data binding
     */
    protected renderTemplate(template: string, data: Record<string, any>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? String(data[key]) : match;
        });
    }
    
    /**
     * Cleanup all event listeners and registered callbacks
     */
    destroy(): void {
        // Cleanup event listeners
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];
        
        // Run cleanup callbacks
        this.cleanupCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in cleanup callback:', error);
            }
        });
        this.cleanupCallbacks = [];
        
        // Clear container
        this.container.innerHTML = '';
    }
}

