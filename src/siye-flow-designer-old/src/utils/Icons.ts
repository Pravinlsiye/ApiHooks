/**
 * SVG Icon utilities for cross-platform consistency
 * Replaces emoji icons with proper SVG for consistent rendering
 */

export type IconType = 
    | 'start' | 'end' | 'http-request' | 'variable' | 'condition' | 'delay' 
    | 'log' | 'evaluate' | 'loop' | 'try-catch'
    | 'switch' | 'batch-process' | 'sub-workflow' | 'webhook-trigger';

/**
 * SVG icon definitions
 * All icons are 24x24 viewBox for consistency
 */
export const SVG_ICONS: Record<string, string> = {
    start: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#4CAF50"/>
        <path d="M9 8 L16 12 L9 16 Z" fill="white"/>
    </svg>`,
    
    end: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#f44336"/>
        <rect x="8" y="8" width="8" height="8" rx="1" fill="white"/>
    </svg>`,
    
    'http-request': `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#2196F3" opacity="0.2"/>
        <path d="M12 2 C6.48 2 2 6.48 2 12 C2 17.52 6.48 22 12 22 C17.52 22 22 17.52 22 12 C22 6.48 17.52 2 12 2 Z M11 19.93 C7.05 19.44 4 16.08 4 12 C4 11.38 4.08 10.79 4.21 10.21 L9 15 V16 C9 17.1 9.9 18 11 18 V19.93 Z M17.9 17.39 C17.64 16.58 16.9 16 16 16 H15 V13 C15 12.45 14.55 12 14 12 H8 V10 H10 C10.55 10 11 9.55 11 9 V7 H13 C14.1 7 15 6.1 15 5 V4.59 C17.93 5.78 20 8.65 20 12 C20 14.08 19.2 15.97 17.9 17.39 Z" fill="#2196F3"/>
    </svg>`,
    
    variable: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="5" width="18" height="14" rx="2" fill="#FF9800" opacity="0.2"/>
        <path d="M20 6 H4 C2.89 6 2 6.89 2 8 V16 C2 17.1 2.89 18 4 18 H20 C21.1 18 22 17.1 22 16 V8 C22 6.89 21.1 6 20 6 Z M20 16 H4 V8 H20 V16 Z M13 10 H18 V12 H13 V10 Z M13 14 H15 V16 H13 V14 Z M6 10 H11 V12 H6 V10 Z" fill="#FF9800"/>
    </svg>`,
    
    condition: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="#9C27B0" opacity="0.2"/>
        <path d="M12 3.5 L20.5 12 L12 20.5 L3.5 12 Z M12 6.5 L6.5 12 L12 17.5 L17.5 12 Z" fill="#9C27B0"/>
        <text x="12" y="15" text-anchor="middle" font-size="12" font-weight="bold" fill="#9C27B0">?</text>
    </svg>`,
    
    switch: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="#9C27B0" opacity="0.2"/>
        <path d="M16 6l-4 4-4-4M16 18l-4-4-4 4" stroke="#9C27B0" stroke-width="2" fill="none"/>
    </svg>`,
    
    delay: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#00BCD4" opacity="0.2"/>
        <path d="M12 2 C6.5 2 2 6.5 2 12 C2 17.5 6.5 22 12 22 C17.5 22 22 17.5 22 12 C22 6.5 17.5 2 12 2 Z M12 20 C7.59 20 4 16.41 4 12 C4 7.59 7.59 4 12 4 C16.41 4 20 7.59 20 12 C20 16.41 16.41 20 12 20 Z M12.5 7 H11 V13 L16.25 16.15 L17 14.92 L12.5 12.25 V7 Z" fill="#00BCD4"/>
    </svg>`,
    
    log: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#607D8B" opacity="0.2"/>
        <path d="M19 3 H5 C3.9 3 3 3.9 3 5 V19 C3 20.1 3.9 21 5 21 H19 C20.1 21 21 20.1 21 19 V5 C21 3.9 20.1 3 19 3 Z M19 19 H5 V5 H19 V19 Z M7 10 H17 V12 H7 V10 Z M7 14 H17 V16 H7 V14 Z M7 6 H17 V8 H7 V6 Z" fill="#607D8B"/>
    </svg>`,
    
    evaluate: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#795548" opacity="0.2"/>
        <path d="M19 3 H5 C3.9 3 3 3.9 3 5 V19 C3 20.1 3.9 21 5 21 H19 C20.1 21 21 20.1 21 19 V5 C21 3.9 20.1 3 19 3 Z M13 17 H11 V15 H13 V17 Z M15.07 11.25 L14.17 12.17 C13.45 12.9 13 13.5 13 15 H11 V14.5 C11 13.4 11.45 12.4 12.17 11.67 L13.41 10.41 C13.78 10.05 14 9.55 14 9 C14 7.9 13.1 7 12 7 C10.9 7 10 7.9 10 9 H8 C8 6.79 9.79 5 12 5 C14.21 5 16 6.79 16 9 C16 9.88 15.64 10.68 15.07 11.25 Z" fill="#795548"/>
    </svg>`,
    
    loop: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="#E91E63" opacity="0.2"/>
        <path d="M12 4 V1 L8 5 L12 9 V6 C15.31 6 18 8.69 18 12 C18 13.01 17.75 13.97 17.3 14.8 L18.76 16.26 C19.54 15.03 20 13.57 20 12 C20 7.58 16.42 4 12 4 Z M12 18 C8.69 18 6 15.31 6 12 C6 10.99 6.25 10.03 6.7 9.2 L5.24 7.74 C4.46 8.97 4 10.43 4 12 C4 16.42 7.58 20 12 20 V23 L16 19 L12 15 V18 Z" fill="#E91E63"/>
    </svg>`,
    
    'batch-process': `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="6" width="20" height="12" rx="2" fill="#3F51B5" opacity="0.2"/>
        <path d="M4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4z" fill="#3F51B5"/>
    </svg>`,
    
    'try-catch': `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 L2 7 V17 L12 22 L22 17 V7 Z" fill="#FFC107" opacity="0.2"/>
        <path d="M12 1 L3 5 V11 C3 16.55 6.84 21.74 12 23 C17.16 21.74 21 16.55 21 11 V5 L12 1 Z M12 11.99 H19 C18.47 16.11 15.72 19.78 12 20.93 V12 H5 V6.3 L12 3.19 V11.99 Z" fill="#FFC107"/>
        <text x="12" y="15" text-anchor="middle" font-size="10" font-weight="bold" fill="#FFC107">!</text>
    </svg>`,

    'sub-workflow': `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" fill="#9E9E9E" opacity="0.2"/>
        <path d="M19 3 H5 C3.9 3 3 3.9 3 5 V19 C3 20.1 3.9 21 5 21 H19 C20.1 21 21 20.1 21 19 V5 C21 3.9 20.1 3 19 3 Z M19 19 H5 V5 H19 V19 Z M11 7 h2 v2 h-2 z M11 11 h2 v2 h-2 z M11 15 h2 v2 h-2 z" fill="#9E9E9E"/>
    </svg>`,

    'webhook-trigger': `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 C6.48 2 2 6.48 2 12 C2 17.52 6.48 22 12 22 C17.52 22 22 17.52 22 12 C22 6.48 17.52 2 12 2 Z" fill="#FF5722" opacity="0.2"/>
        <path d="M12 6 v4.2 l4 2.4 l-0.7 1.2 l-4.3 -2.6 V6 z" fill="#FF5722"/>
    </svg>`
};

/**
 * Creates an SVG icon element
 * @param type The icon type
 * @param className Optional CSS classes to add
 * @param size Optional size (default: 24)
 */
export function createIcon(type: string, className?: string, size: number = 24): HTMLElement {
    const container = document.createElement('span');
    container.className = `icon icon-${type}${className ? ' ' + className : ''}`;
    container.style.display = 'inline-block';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    
    // Fallback for unknown icons
    const svgContent = SVG_ICONS[type] || SVG_ICONS['start'];
    container.innerHTML = svgContent;
    
    // Style the SVG
    const svg = container.querySelector('svg');
    if (svg) {
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';
    }
    
    return container;
}

/**
 * Gets the SVG markup for an icon
 * @param type The icon type
 */
export function getIconSvg(type: string): string {
    return SVG_ICONS[type] || SVG_ICONS['start'];
}
