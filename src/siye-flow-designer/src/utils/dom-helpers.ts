/**
 * DOM utility helpers
 */

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number
): T {
    let inThrottle = false;
    return ((...args: any[]) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    }) as T;
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return ((...args: any[]) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}

/**
 * Create SVG element with namespace
 */
export function createSVGElement<K extends keyof SVGElementTagNameMap>(
    tag: K
): SVGElementTagNameMap[K] {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

/**
 * Set multiple SVG attributes at once
 */
export function setSVGAttributes(
    element: SVGElement,
    attributes: Record<string, string | number>
): void {
    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, String(value));
    });
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

