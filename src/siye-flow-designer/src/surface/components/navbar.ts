/**
 * Navigation Bar Component
 */

import { BaseComponent } from '../utils/base-component';
import { SettingsDropdown } from './settings-dropdown';
import { DOMUpdater } from '../utils/dom-updater';
import { SAMPLES } from '../../../samples/index';

export interface NavbarOptions {
    homeUrl?: string;
}

export class Navbar extends BaseComponent {
    private settingsDropdown: SettingsDropdown | null = null;
    private homeUrl?: string;
    private samplesOpen = false;

    constructor(containerId: string, options: NavbarOptions = {}) {
        super(containerId);
        this.homeUrl = options.homeUrl;
        this.render();
        this.initSettingsDropdown();
        this.setupEventHandlers();
    }

    private render(): void {
        const brandTag = this.homeUrl ? 'a' : 'div';
        const brandAttrs = this.homeUrl
            ? `class="navbar-brand navbar-brand-link" href="${this.homeUrl}" title="Back to Home"`
            : `class="navbar-brand"`;

        DOMUpdater.updateElement(this.container, { html: `
            <div class="navbar">
                <${brandTag} ${brandAttrs}>
                    <span class="navbar-logo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="var(--accent-primary)" opacity="0.2"/>
                            <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="var(--accent-primary)" stroke-width="2" fill="none"/>
                            <circle cx="12" cy="12" r="3" fill="var(--accent-primary)"/>
                        </svg>
                    </span>
                    <span class="navbar-title">SiyeFlow Designer</span>
                </${brandTag}>

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
                    <div class="samples-dropdown-wrapper" id="samples-dropdown-wrapper">
                        <button class="samples-trigger" id="samples-trigger" aria-haspopup="listbox" aria-expanded="false">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            Try a sample
                            <svg class="samples-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <div class="samples-menu" id="samples-menu" role="listbox" aria-label="Sample workflows">
                            ${SAMPLES.map(s => `
                                <button class="samples-item" role="option" data-sample-id="${s.id}" title="${s.description}">
                                    <span class="samples-item-label">${s.label}</span>
                                    <span class="samples-item-desc">${s.description}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
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

            this.settingsDropdown.on('inspectorModeChange', (data: { mode: string }) => {
                this.emit('inspectorModeChange', data);
            });
        }
    }

    isMinimapEnabled(): boolean {
        return this.settingsDropdown?.isMinimapEnabled() ?? false;
    }

    getInspectorMode(): string {
        return this.settingsDropdown?.getInspectorMode() ?? 'breakpoints';
    }

    private setupEventHandlers(): void {
        // ── Samples dropdown ──────────────────────────────────────────────
        const trigger = DOMUpdater.query<HTMLButtonElement>(this.container, '#samples-trigger');
        const menu    = DOMUpdater.query<HTMLElement>(this.container, '#samples-menu');
        const wrapper = DOMUpdater.query<HTMLElement>(this.container, '#samples-dropdown-wrapper');

        const openMenu  = () => {
            this.samplesOpen = true;
            menu?.classList.add('open');
            trigger?.setAttribute('aria-expanded', 'true');
        };
        const closeMenu = () => {
            this.samplesOpen = false;
            menu?.classList.remove('open');
            trigger?.setAttribute('aria-expanded', 'false');
        };

        if (trigger) {
            this.addEventListener(trigger, 'click', (e) => {
                e.stopPropagation();
                this.settingsDropdown?.close?.();
                this.samplesOpen ? closeMenu() : openMenu();
            });
        }

        // Close when clicking outside
        this.addEventListener(document, 'click', (e) => {
            if (this.samplesOpen && wrapper && !wrapper.contains(e.target as Node)) {
                closeMenu();
            }
        });

        // Close on Escape
        this.addEventListener(document, 'keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Escape' && this.samplesOpen) closeMenu();
        });

        // Item clicks
        if (menu) {
            this.addEventListener(menu, 'click', (e) => {
                const item = (e.target as HTMLElement).closest<HTMLElement>('.samples-item');
                if (!item) return;
                const id = item.dataset.sampleId;
                const sample = SAMPLES.find(s => s.id === id);
                if (sample) {
                    this.emit('loadSample', { data: sample.data });
                    closeMenu();
                }
            });
        }

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

