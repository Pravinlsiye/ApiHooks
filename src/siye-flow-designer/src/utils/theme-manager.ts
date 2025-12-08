/**
 * ThemeManager - Manages theme switching between light, dark, and system themes
 * Stores theme preference in localStorage and applies theme on initialization
 */

export type Theme = 'light' | 'dark' | 'system';

export class ThemeManager {
    private static readonly STORAGE_KEY = 'siyeflow-theme';
    private static readonly THEME_ATTRIBUTE = 'data-theme';
    private static mediaQuery: MediaQueryList | null = null;
    private static listeners: Set<(theme: Theme, resolved: 'light' | 'dark') => void> = new Set();
    
    /**
     * Available themes
     */
    public static readonly THEMES = {
        LIGHT: 'light' as const,
        DARK: 'dark' as const,
        SYSTEM: 'system' as const
    };
    
    /**
     * Get current theme preference from localStorage
     */
    public static getCurrentTheme(): Theme {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
        return 'dark'; // Default to dark
    }
    
    /**
     * Get the resolved theme (light or dark, accounting for system preference)
     */
    public static getResolvedTheme(): 'light' | 'dark' {
        const theme = this.getCurrentTheme();
        if (theme === 'system') {
            return this.getSystemTheme();
        }
        return theme;
    }
    
    /**
     * Get system preference
     */
    public static getSystemTheme(): 'light' | 'dark' {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'dark';
    }
    
    /**
     * Set theme and persist to localStorage
     */
    public static setTheme(theme: Theme): void {
        if (theme !== 'light' && theme !== 'dark' && theme !== 'system') {
            console.warn(`Invalid theme: ${theme}. Using default: dark`);
            theme = 'dark';
        }
        
        localStorage.setItem(this.STORAGE_KEY, theme);
        this.applyTheme();
        
        // Notify listeners
        const resolved = this.getResolvedTheme();
        this.listeners.forEach(listener => {
            try {
                listener(theme, resolved);
            } catch (error) {
                console.error('Error in theme change listener:', error);
            }
        });
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { theme, resolved } 
        }));
    }
    
    /**
     * Apply the current theme to the document
     */
    private static applyTheme(): void {
        const resolved = this.getResolvedTheme();
        document.documentElement.setAttribute(this.THEME_ATTRIBUTE, resolved);
    }
    
    /**
     * Initialize theme on page load
     */
    public static initialize(): void {
        this.applyTheme();
        
        // Listen for system theme changes
        if (typeof window !== 'undefined' && window.matchMedia) {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            const handleChange = () => {
                if (this.getCurrentTheme() === 'system') {
                    this.applyTheme();
                    const resolved = this.getResolvedTheme();
                    this.listeners.forEach(listener => listener('system', resolved));
                }
            };
            
            // Use addEventListener for modern browsers
            if (this.mediaQuery.addEventListener) {
                this.mediaQuery.addEventListener('change', handleChange);
            } else {
                // Fallback for older browsers
                this.mediaQuery.addListener(handleChange);
            }
        }
    }
    
    /**
     * Toggle between light and dark themes
     */
    public static toggleTheme(): Theme {
        const current = this.getCurrentTheme();
        let newTheme: Theme;
        
        if (current === 'light') {
            newTheme = 'dark';
        } else if (current === 'dark') {
            newTheme = 'system';
        } else {
            newTheme = 'light';
        }
        
        this.setTheme(newTheme);
        return newTheme;
    }
    
    /**
     * Add a listener for theme changes
     */
    public static onThemeChange(
        listener: (theme: Theme, resolved: 'light' | 'dark') => void
    ): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    /**
     * Check if current theme is dark (resolved)
     */
    public static isDark(): boolean {
        return this.getResolvedTheme() === 'dark';
    }
    
    /**
     * Check if current theme is light (resolved)
     */
    public static isLight(): boolean {
        return this.getResolvedTheme() === 'light';
    }
}

