/**
 * ThemeManager - Manages theme switching between light and dark themes
 * Stores theme preference in localStorage and applies theme on initialization
 */
export class ThemeManager {
    private static readonly STORAGE_KEY = 'siye-flow-designer-theme';
    private static readonly THEME_ATTRIBUTE = 'data-theme';
    
    /**
     * Available themes
     */
    public static readonly THEMES = {
        LIGHT: 'light',
        DARK: 'dark'
    } as const;
    
    /**
     * Get current theme from localStorage or default to light
     */
    public static getCurrentTheme(): string {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored || this.THEMES.LIGHT;
    }
    
    /**
     * Set theme and persist to localStorage
     */
    public static setTheme(theme: string): void {
        if (theme !== this.THEMES.LIGHT && theme !== this.THEMES.DARK) {
            console.warn(`Invalid theme: ${theme}. Using default: ${this.THEMES.LIGHT}`);
            theme = this.THEMES.LIGHT;
        }
        
        document.documentElement.setAttribute(this.THEME_ATTRIBUTE, theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        
        // Dispatch custom event for theme change
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }
    
    /**
     * Initialize theme on page load
     */
    public static initializeTheme(): void {
        const theme = this.getCurrentTheme();
        this.setTheme(theme);
    }
    
    /**
     * Toggle between light and dark themes
     */
    public static toggleTheme(): string {
        const current = this.getCurrentTheme();
        const newTheme = current === this.THEMES.LIGHT ? this.THEMES.DARK : this.THEMES.LIGHT;
        this.setTheme(newTheme);
        return newTheme;
    }
}

