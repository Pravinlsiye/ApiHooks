/**
 * Navigation Bar Component
 */

import { BaseComponent } from '../utils/base-component';
import { SettingsDropdown } from './settings-dropdown';
import { DOMUpdater } from '../utils/dom-updater';

export class Navbar extends BaseComponent {
    private settingsDropdown: SettingsDropdown | null = null;

    constructor(containerId: string) {
        super(containerId);
        this.render();
        this.initSettingsDropdown();
        this.setupEventHandlers();
    }

    private render(): void {
        DOMUpdater.updateElement(this.container, { html: `
            <div class="navbar">
                <div class="navbar-brand">
                    <span class="navbar-logo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="var(--accent-primary)" opacity="0.2"/>
                            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="var(--accent-primary)" stroke-width="2" fill="none"/>
                            <circle cx="12" cy="12" r="3" fill="var(--accent-primary)"/>
                        </svg>
                    </span>
                    <span class="navbar-title">SiyeFlow Designer</span>
                </div>
                <div class="navbar-actions">
                    <button class="navbar-btn" id="import-btn" title="Import Workflow">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                    </button>
                    <button class="navbar-btn" id="export-btn" title="Export Workflow">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                    </button>
                    <div class="navbar-separator"></div>
                    <div class="settings-dropdown-wrapper">
                        <button class="navbar-btn" id="settings-btn" title="Settings">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                        </button>
                        <div id="settings-dropdown-container"></div>
                    </div>
                </div>
            </div>
        `});
    }

    private initSettingsDropdown(): void {
        const dropdownContainer = DOMUpdater.query<HTMLElement>(this.container, '#settings-dropdown-container');
        if (dropdownContainer) {
            dropdownContainer.id = 'settings-dropdown-' + Date.now();
            this.settingsDropdown = new SettingsDropdown(dropdownContainer.id);
            
            this.settingsDropdown.on('themeChange', (data: { theme: string }) => {
                this.emit('themeChange', data);
            });

            this.settingsDropdown.on('minimapToggle', (data: { enabled: boolean }) => {
                this.emit('minimapToggle', data);
            });
        }
    }

    isMinimapEnabled(): boolean {
        return this.settingsDropdown?.isMinimapEnabled() ?? false;
    }

    private setupEventHandlers(): void {
        const settingsBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#settings-btn');
        if (settingsBtn) {
            this.addEventListener(settingsBtn, 'click', (e) => {
                e.stopPropagation();
                this.settingsDropdown?.toggle();
            });
        }

        const importBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#import-btn');
        if (importBtn) {
            this.addEventListener(importBtn, 'click', () => {
                this.emit('import', {});
            });
        }

        const exportBtn = DOMUpdater.query<HTMLButtonElement>(this.container, '#export-btn');
        if (exportBtn) {
            this.addEventListener(exportBtn, 'click', () => {
                this.emit('export', {});
            });
        }
    }

    destroy(): void {
        this.settingsDropdown?.destroy();
        super.destroy();
    }
}

