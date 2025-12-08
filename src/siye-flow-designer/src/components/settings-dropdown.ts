/**
 * Settings Dropdown Component
 * Shows theme toggle and other settings
 */

import { BaseComponent } from '../utils/base-component';
import { DOMUpdater } from '../utils/dom-updater';


type Theme = 'light' | 'dark' | 'system';

export interface SettingsState {
    theme: Theme;
    minimapEnabled: boolean;
}

export class SettingsDropdown extends BaseComponent {
    private isOpen: boolean = false;
    private currentTheme: Theme = 'light';
    private minimapEnabled: boolean = false; // Default off

    constructor(containerId: string) {
        super(containerId);
        this.loadSettings();
        this.render();
        this.setupEventHandlers();
    }

    private loadSettings(): void {
        // Load theme
        const savedTheme = localStorage.getItem('siyeflow-theme') as Theme;
        this.currentTheme = savedTheme || 'dark';
        this.applyTheme(this.currentTheme);

        // Load minimap setting (default off)
        const savedMinimap = localStorage.getItem('siyeflow-minimap');
        this.minimapEnabled = savedMinimap === 'true';
    }

    private applyTheme(theme: Theme): void {
        let effectiveTheme = theme;
        
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        document.body.setAttribute('data-theme', effectiveTheme);
        localStorage.setItem('siyeflow-theme', theme);
        this.currentTheme = theme;
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="settings-dropdown ${this.isOpen ? 'open' : ''}">
                <div class="settings-dropdown-content">
                    <div class="settings-section">
                        <div class="settings-section-title">Appearance</div>
                        <div class="settings-theme-options">
                            <button class="theme-option ${this.currentTheme === 'light' ? 'active' : ''}" data-theme="light">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="5"/>
                                    <line x1="12" y1="1" x2="12" y2="3"/>
                                    <line x1="12" y1="21" x2="12" y2="23"/>
                                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                                    <line x1="1" y1="12" x2="3" y2="12"/>
                                    <line x1="21" y1="12" x2="23" y2="12"/>
                                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                                </svg>
                                <span>Light</span>
                            </button>
                            <button class="theme-option ${this.currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                                </svg>
                                <span>Dark</span>
                            </button>
                            <button class="theme-option ${this.currentTheme === 'system' ? 'active' : ''}" data-theme="system">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                                <span>System</span>
                            </button>
                        </div>
                    </div>
                    <div class="settings-divider"></div>
                    <div class="settings-section">
                        <div class="settings-section-title">Canvas</div>
                        <div class="settings-toggle-row">
                            <span class="settings-toggle-label">Show Minimap</span>
                            <button class="settings-toggle ${this.minimapEnabled ? 'active' : ''}" id="minimap-toggle">
                                <span class="settings-toggle-slider"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private setupEventHandlers(): void {
        // Theme option buttons
        DOMUpdater.queryAll<HTMLButtonElement>(this.container, '.theme-option').forEach(btn => {
            this.addEventListener(btn, 'click', (e) => {
                const theme = (e.currentTarget as HTMLElement).dataset.theme as Theme;
                this.setTheme(theme);
            });
        });

        // Minimap toggle
        const minimapToggle = DOMUpdater.query<HTMLButtonElement>(this.container, '#minimap-toggle');
        if (minimapToggle) {
            this.addEventListener(minimapToggle, 'click', () => {
                this.toggleMinimap();
            });
        }

        // Close dropdown when clicking outside
        this.addEventListener(document, 'click', (e) => {
            const target = e.target as HTMLElement;
            if (!this.container.contains(target) && !target.closest('#settings-btn')) {
                this.close();
            }
        });

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (this.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });
    }

    private setTheme(theme: Theme): void {
        this.applyTheme(theme);
        this.updateActiveState();
        this.emit('themeChange', { theme });
    }

    private toggleMinimap(): void {
        this.minimapEnabled = !this.minimapEnabled;
        localStorage.setItem('siyeflow-minimap', this.minimapEnabled.toString());
        
        const toggle = DOMUpdater.query<HTMLButtonElement>(this.container, '#minimap-toggle');
        if (toggle) {
            if (this.minimapEnabled) {
                DOMUpdater.addClasses(toggle, 'active');
            } else {
                DOMUpdater.removeClasses(toggle, 'active');
            }
        }

        this.emit('minimapToggle', { enabled: this.minimapEnabled });
    }

    private updateActiveState(): void {
        DOMUpdater.queryAll<HTMLButtonElement>(this.container, '.theme-option').forEach(btn => {
            const btnTheme = btn.dataset.theme;
            if (btnTheme === this.currentTheme) {
                DOMUpdater.addClasses(btn, 'active');
            } else {
                DOMUpdater.removeClasses(btn, 'active');
            }
        });
    }

    toggle(): void {
        this.isOpen = !this.isOpen;
        const dropdown = DOMUpdater.query<HTMLElement>(this.container, '.settings-dropdown');
        if (dropdown) {
            if (this.isOpen) {
                DOMUpdater.addClasses(dropdown, 'open');
            } else {
                DOMUpdater.removeClasses(dropdown, 'open');
            }
        }
    }

    open(): void {
        this.isOpen = true;
        const dropdown = DOMUpdater.query<HTMLElement>(this.container, '.settings-dropdown');
        if (dropdown) {
            DOMUpdater.addClasses(dropdown, 'open');
        }
    }

    close(): void {
        this.isOpen = false;
        const dropdown = DOMUpdater.query<HTMLElement>(this.container, '.settings-dropdown');
        if (dropdown) {
            DOMUpdater.removeClasses(dropdown, 'open');
        }
    }

    getTheme(): Theme {
        return this.currentTheme;
    }

    isMinimapEnabled(): boolean {
        return this.minimapEnabled;
    }

    setMinimapEnabled(enabled: boolean): void {
        this.minimapEnabled = enabled;
        localStorage.setItem('siyeflow-minimap', enabled.toString());
        
        const toggle = DOMUpdater.query<HTMLButtonElement>(this.container, '#minimap-toggle');
        if (toggle) {
            if (enabled) {
                DOMUpdater.addClasses(toggle, 'active');
            } else {
                DOMUpdater.removeClasses(toggle, 'active');
            }
        }
    }
}
