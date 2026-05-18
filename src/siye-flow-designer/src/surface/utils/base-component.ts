/**
 * Base class for all components with automatic cleanup
 */

import { EventEmitter } from '../../models/visual-models';

export abstract class BaseComponent extends EventEmitter {
    protected container: HTMLElement;
    protected eventListeners: Array<{
        element: HTMLElement | Document | Window;
        event: string;
        handler: EventListener;
        options?: boolean | AddEventListenerOptions;
    }> = [];
    protected cleanupCallbacks: Array<() => void> = [];

    constructor(containerId: string) {
        super();
        const element = document.getElementById(containerId);
        if (!element) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        this.container = element;
    }

    /**
     * Add event listener with automatic cleanup tracking
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
     * Register cleanup callback
     */
    protected registerCleanup(callback: () => void): void {
        this.cleanupCallbacks.push(callback);
    }

    /**
     * Create element helper
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
                } else if (key === 'style') {
                    element.setAttribute('style', value);
                } else {
                    (element as Record<string, unknown>)[key] = value;
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
     * Cleanup and destroy component
     */
    destroy(): void {
        // Remove event listeners
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

        // Clear events
        this.removeAllListeners();

        // Clear container
        this.container.innerHTML = '';
    }
}

