import { BaseComponent } from './BaseComponent';

/**
 * Testing utilities similar to React Testing Library
 * Makes testing vanilla TypeScript components easier
 */
export class TestUtils {
    /**
     * Render component for testing
     */
    static render(component: BaseComponent): {
        container: HTMLElement;
        querySelector: <T extends HTMLElement>(selector: string) => T | null;
        querySelectorAll: <T extends HTMLElement>(selector: string) => T[];
        getByText: (text: string) => HTMLElement | null;
        getByTestId: (testId: string) => HTMLElement | null;
        cleanup: () => void;
    } {
        const container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);
        
        return {
            container,
            querySelector: <T extends HTMLElement>(selector: string) => {
                return container.querySelector<T>(selector);
            },
            querySelectorAll: <T extends HTMLElement>(selector: string) => {
                return Array.from(container.querySelectorAll<T>(selector));
            },
            getByText: (text: string) => {
                const walker = document.createTreeWalker(
                    container,
                    NodeFilter.SHOW_TEXT,
                    null
                );
                
                let node;
                while (node = walker.nextNode()) {
                    if (node.textContent?.includes(text)) {
                        return node.parentElement;
                    }
                }
                return null;
            },
            getByTestId: (testId: string) => {
                return container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
            },
            cleanup: () => {
                component.destroy();
                container.remove();
            }
        };
    }
    
    /**
     * Simulate user events
     */
    static fireEvent(element: HTMLElement, eventType: string, options?: any): void {
        const event = new Event(eventType, { bubbles: true, cancelable: true, ...options });
        element.dispatchEvent(event);
    }
    
    static click(element: HTMLElement): void {
        this.fireEvent(element, 'click');
    }
    
    static mouseDown(element: HTMLElement, options?: MouseEventInit): void {
        const event = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            ...options
        });
        element.dispatchEvent(event);
    }
    
    static mouseMove(element: HTMLElement, options?: MouseEventInit): void {
        const event = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            ...options
        });
        element.dispatchEvent(event);
    }
    
    static keyDown(element: HTMLElement, key: string, options?: KeyboardEventInit): void {
        const event = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key,
            ...options
        });
        element.dispatchEvent(event);
    }
    
    /**
     * Wait for element to appear
     */
    static async waitFor(
        callback: () => HTMLElement | null,
        options: { timeout?: number; interval?: number } = {}
    ): Promise<HTMLElement> {
        const { timeout = 1000, interval = 50 } = options;
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                const element = callback();
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime >= timeout) {
                    reject(new Error('Element not found within timeout'));
                } else {
                    setTimeout(check, interval);
                }
            };
            check();
        });
    }
}

