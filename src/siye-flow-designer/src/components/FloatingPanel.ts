/**
 * FloatingPanel - A floating toolbar panel with action buttons
 */
export class FloatingPanel {
    private container: HTMLElement;
    private panelElement: HTMLElement | null = null;
    private dropdownMenu: HTMLElement | null = null;
    private getStartBlocksCallback?: () => Array<{ id: string; name: string }>;
    private getProfilesCallback?: (startBlockId: string) => Array<{ name: string; default?: boolean }>;
    private selectedStartBlockId: string | null = null;
    private selectedProfile: string | null = null;
    private onRunCallback?: (startBlockId: string, profile: string | null) => void;
    private onProfileChangeCallback?: (startBlockId: string, profile: string) => void;
    private onZoomInCallback?: () => void;
    private onZoomOutCallback?: () => void;
    private onZoomFitCallback?: () => void;
    private onToolChangeCallback?: (tool: 'pointer' | 'hand') => void;

    constructor(
        containerId: string, 
        getStartBlocksCallback?: () => Array<{ id: string; name: string }>,
        getProfilesCallback?: (startBlockId: string) => Array<{ name: string; default?: boolean }>,
        onRunCallback?: (startBlockId: string, profile: string | null) => void,
        onProfileChangeCallback?: (startBlockId: string, profile: string) => void,
        onZoomInCallback?: () => void,
        onZoomOutCallback?: () => void,
        onZoomFitCallback?: () => void,
        onToolChangeCallback?: (tool: 'pointer' | 'hand') => void
    ) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element '${containerId}' not found`);
        }
        this.container = container;
        this.getStartBlocksCallback = getStartBlocksCallback;
        this.getProfilesCallback = getProfilesCallback;
        this.onRunCallback = onRunCallback;
        this.onProfileChangeCallback = onProfileChangeCallback;
        this.onZoomInCallback = onZoomInCallback;
        this.onZoomOutCallback = onZoomOutCallback;
        this.onZoomFitCallback = onZoomFitCallback;
        this.onToolChangeCallback = onToolChangeCallback;
        this.render();
    }

    private render(): void {
        // Create floating panel element
        this.panelElement = document.createElement('div');
        this.panelElement.className = 'floating-panel';
        this.panelElement.innerHTML = `
            <div class="floating-panel-content">
                <button class="floating-btn tool-btn" id="floating-pointer" title="Pointer Tool (V)" data-active="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z"/>
                    </svg>
                </button>
                <button class="floating-btn tool-btn" id="floating-hand" title="Hand Tool (H)">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 3.5c0-1 .5-1.5 1.5-1.5s1.5.5 1.5 1.5v2M6 5.5v2c0 1 .5 1.5 1.5 1.5h1c1 0 1.5-.5 1.5-1.5v-2"/>
                        <path d="M4 7c0-1 .5-1.5 1.5-1.5h.5M12 7c0-1-.5-1.5-1.5-1.5h-.5"/>
                        <path d="M5 10h6"/>
                        <path d="M6 12h4"/>
                    </svg>
                </button>
                <div class="floating-separator"></div>
                <button class="floating-btn" id="floating-zoom-out" title="Zoom Out">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="7" cy="7" r="4.5"/>
                        <path d="M10.5 10.5L13 13"/>
                        <path d="M4.5 7h5"/>
                    </svg>
                </button>
                <button class="floating-btn" id="floating-zoom-in" title="Zoom In">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="7" cy="7" r="4.5"/>
                        <path d="M10.5 10.5L13 13"/>
                        <path d="M7 4.5v5M4.5 7h5"/>
                    </svg>
                </button>
                <button class="floating-btn" id="floating-fit-screen" title="Fit to Screen">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2h12v12H2V2zm1 1v10h10V3H3z"/>
                        <path d="M4 4h8v8H4V4zm1 1v6h6V5H5z"/>
                    </svg>
                </button>
                <div class="floating-separator"></div>
                <div class="floating-run-container">
                    <button class="floating-btn floating-btn-primary" id="floating-run" title="Run">
                        <span>Run</span>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" class="dropdown-arrow" id="floating-run-arrow">
                            <path d="M6 9L1 4h10L6 9z"/>
                        </svg>
                    </button>
                    <div class="floating-dropdown-menu" id="floating-run-menu">
                        <div class="floating-dropdown-header" id="floating-run-start-blocks-header">Select Start Block</div>
                        <div class="floating-dropdown-items" id="floating-run-start-blocks"></div>
                        <div class="floating-dropdown-header" id="floating-run-profiles-header" style="display: none;">Select Profile</div>
                        <div class="floating-dropdown-items" id="floating-run-profiles" style="display: none;"></div>
                    </div>
                </div>
                <button class="floating-btn" id="floating-refresh" title="Refresh">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 1 0-1h5.793l-2.147-2.146a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 7.5H4.5z"/>
                    </svg>
                </button>
                <div class="floating-separator"></div>
                <button class="floating-btn" id="floating-add-block" title="Add Block">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7.5 4a.5.5 0 0 1 1 0v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0V8h-3a.5.5 0 0 1 0-1h3V4z"/>
                    </svg>
                    <span>Block</span>
                </button>
                <button class="floating-btn" id="floating-text" title="Text">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 2h12v2H2V2zm0 3h8v2H2V5zm0 3h12v2H2V8zm0 3h8v2H2v-2z"/>
                    </svg>
                </button>
            </div>
        `;

        // Append to container
        this.container.appendChild(this.panelElement);

        // Setup event handlers for dummy buttons
        this.setupEventHandlers();
        this.updateStartBlocks();
    }

    private setupEventHandlers(): void {
        // Tool toggle handlers
        document.getElementById('floating-pointer')?.addEventListener('click', () => {
            this.setActiveTool('pointer');
        });

        document.getElementById('floating-hand')?.addEventListener('click', () => {
            this.setActiveTool('hand');
        });

        document.getElementById('floating-zoom-out')?.addEventListener('click', () => {
            if (this.onZoomOutCallback) {
                this.onZoomOutCallback();
            } else {
                console.log('[FloatingPanel] Zoom Out clicked');
            }
        });

        document.getElementById('floating-zoom-in')?.addEventListener('click', () => {
            if (this.onZoomInCallback) {
                this.onZoomInCallback();
            } else {
                console.log('[FloatingPanel] Zoom In clicked');
            }
        });

        document.getElementById('floating-fit-screen')?.addEventListener('click', () => {
            if (this.onZoomFitCallback) {
                this.onZoomFitCallback();
            } else {
                console.log('[FloatingPanel] Fit to Screen clicked');
            }
        });

        // Run button - main action
        const runButton = document.getElementById('floating-run');
        const dropdownMenu = document.getElementById('floating-run-menu');
        
        if (runButton && dropdownMenu) {
            this.dropdownMenu = dropdownMenu as HTMLElement;
            
            // Click on main button area (not dropdown arrow) - execute run
            runButton.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const isDropdownArrow = target.closest('.dropdown-arrow') || target.classList.contains('dropdown-arrow');
                
                if (isDropdownArrow) {
                    // Clicked on dropdown arrow - toggle menu
                    e.stopPropagation();
                    this.toggleDropdown();
                } else {
                    // Clicked on main button - execute run
                    if (this.selectedStartBlockId) {
                        if (this.onRunCallback) {
                            this.onRunCallback(this.selectedStartBlockId, this.selectedProfile);
                        } else {
                            console.log('[FloatingPanel] Run clicked', {
                                startBlockId: this.selectedStartBlockId,
                                profile: this.selectedProfile || 'default'
                            });
                        }
                        this.hideDropdown();
                    } else {
                        // No start block selected, show dropdown to select
                        this.toggleDropdown();
                    }
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!runButton.contains(e.target as Node) && !dropdownMenu.contains(e.target as Node)) {
                    this.hideDropdown();
                }
            });
        }

        document.getElementById('floating-refresh')?.addEventListener('click', () => {
            console.log('[FloatingPanel] Refresh clicked');
            this.updateStartBlocks();
        });

        document.getElementById('floating-add-block')?.addEventListener('click', () => {
            console.log('[FloatingPanel] Add Block clicked');
        });

        document.getElementById('floating-text')?.addEventListener('click', () => {
            console.log('[FloatingPanel] Text clicked');
        });
    }

    private toggleDropdown(): void {
        if (this.dropdownMenu) {
            const isVisible = this.dropdownMenu.style.display === 'block';
            if (!isVisible) {
                // Opening dropdown - refresh Start blocks and profiles
                this.updateStartBlocks();
            }
            this.dropdownMenu.style.display = isVisible ? 'none' : 'block';
            this.updateDropdownArrow(!isVisible);
        }
    }

    private hideDropdown(): void {
        if (this.dropdownMenu) {
            this.dropdownMenu.style.display = 'none';
            this.updateDropdownArrow(false);
        }
    }

    private updateDropdownArrow(isOpen: boolean): void {
        const arrow = document.getElementById('floating-run-arrow');
        if (arrow) {
            // Down arrow: M6 9L1 4h10L6 9z
            // Up arrow: M6 3L1 8h10L6 3z
            arrow.innerHTML = isOpen 
                ? '<path d="M6 3L1 8h10L6 3z"/>'  // Up arrow when open
                : '<path d="M6 9L1 4h10L6 9z"/>'; // Down arrow when closed
        }
    }

    private updateStartBlocks(): void {
        const startBlocksContainer = document.getElementById('floating-run-start-blocks');
        const startBlocksHeader = document.getElementById('floating-run-start-blocks-header');
        if (!startBlocksContainer) {
            console.warn('[FloatingPanel] Start blocks container not found');
            return;
        }

        // Get start blocks from callback
        const startBlocks = this.getStartBlocksCallback ? this.getStartBlocksCallback() : [];
        console.log('[FloatingPanel] Found Start blocks:', startBlocks);
        
        if (startBlocks.length === 0) {
            startBlocksContainer.innerHTML = '<div class="floating-dropdown-item floating-dropdown-empty">No Start blocks available</div>';
            startBlocksContainer.style.display = 'block';
            // Hide profiles section
            const profilesHeader = document.getElementById('floating-run-profiles-header');
            const profilesContainer = document.getElementById('floating-run-profiles');
            if (profilesHeader) profilesHeader.style.display = 'none';
            if (profilesContainer) profilesContainer.style.display = 'none';
            if (startBlocksHeader) startBlocksHeader.style.display = 'block';
            return;
        }

        // If only one Start block, auto-select it and hide the selection section
        if (startBlocks.length === 1) {
            this.selectedStartBlockId = startBlocks[0].id;
            console.log('[FloatingPanel] Auto-selected single Start block:', this.selectedStartBlockId);
            if (startBlocksHeader) startBlocksHeader.style.display = 'none';
            startBlocksContainer.style.display = 'none';
            // Update profiles for the single Start block
            this.updateProfiles();
            return;
        }

        // Multiple Start blocks - show selection
        if (startBlocksHeader) startBlocksHeader.style.display = 'block';
        startBlocksContainer.style.display = 'block';

        // Render start block items
        startBlocksContainer.innerHTML = startBlocks.map(block => {
            const isSelected = this.selectedStartBlockId === block.id;
            return `
                <div class="floating-dropdown-item ${isSelected ? 'selected' : ''}" data-start-block-id="${block.id}">
                    ${block.name || block.id}
                </div>
            `;
        }).join('');

        // Add click handlers for start block items
        startBlocksContainer.querySelectorAll('.floating-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const startBlockId = (e.currentTarget as HTMLElement).dataset.startBlockId;
                if (startBlockId) {
                    this.selectStartBlock(startBlockId);
                }
            });
        });

        // Select first start block if none selected
        if (!this.selectedStartBlockId && startBlocks.length > 0) {
            this.selectStartBlock(startBlocks[0].id);
        }
    }

    private selectStartBlock(startBlockId: string): void {
        this.selectedStartBlockId = startBlockId;
        
        // Update UI to show selected start block (only if multiple blocks exist)
        const startBlocksContainer = document.getElementById('floating-run-start-blocks');
        if (startBlocksContainer && startBlocksContainer.style.display !== 'none') {
            const items = startBlocksContainer.querySelectorAll('.floating-dropdown-item');
            items.forEach(item => {
                if ((item as HTMLElement).dataset.startBlockId === startBlockId) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }

        // Update profiles for selected start block
        this.updateProfiles();
        
        console.log('[FloatingPanel] Start block selected:', startBlockId);
    }

    private updateProfiles(): void {
        const profilesHeader = document.getElementById('floating-run-profiles-header');
        const profilesContainer = document.getElementById('floating-run-profiles');
        
        if (!profilesContainer || !this.selectedStartBlockId) {
            console.warn('[FloatingPanel] Cannot update profiles - no container or no selected Start block');
            if (profilesHeader) profilesHeader.style.display = 'none';
            if (profilesContainer) profilesContainer.style.display = 'none';
            return;
        }

        // Show profiles section
        if (profilesHeader) profilesHeader.style.display = 'block';
        if (profilesContainer) profilesContainer.style.display = 'block';

        // Get profiles from callback for selected start block
        const profiles = this.getProfilesCallback ? this.getProfilesCallback(this.selectedStartBlockId) : [];
        console.log('[FloatingPanel] Found profiles for Start block', this.selectedStartBlockId, ':', profiles);
        
        if (profiles.length === 0) {
            profilesContainer.innerHTML = '<div class="floating-dropdown-item floating-dropdown-empty">No profiles available</div>';
            this.selectedProfile = null;
            return;
        }

        // Render profile items
        profilesContainer.innerHTML = profiles.map(profile => {
            const isSelected = this.selectedProfile === profile.name;
            const defaultBadge = profile.default ? ' (default)' : '';
            return `
                <div class="floating-dropdown-item ${isSelected ? 'selected' : ''}" data-profile="${profile.name}">
                    ${profile.name}${defaultBadge}
                </div>
            `;
        }).join('');

        // Add click handlers for profile items
        profilesContainer.querySelectorAll('.floating-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const profileName = (e.currentTarget as HTMLElement).dataset.profile;
                if (profileName) {
                    this.selectProfile(profileName);
                    this.hideDropdown();
                }
            });
        });

        // Select first profile if none selected
        if (!this.selectedProfile && profiles.length > 0) {
            const defaultProfile = profiles.find(p => p.default) || profiles[0];
            this.selectProfile(defaultProfile.name);
        }
    }

    private selectProfile(profileName: string): void {
        this.selectedProfile = profileName;
        
        // Update UI to show selected profile
        const items = document.querySelectorAll('#floating-run-profiles .floating-dropdown-item');
        items.forEach(item => {
            if ((item as HTMLElement).dataset.profile === profileName) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });

        // Notify callback about profile change
        if (this.selectedStartBlockId && this.onProfileChangeCallback) {
            this.onProfileChangeCallback(this.selectedStartBlockId, profileName);
        }

        console.log('[FloatingPanel] Profile selected:', profileName);
    }
    
    /**
     * Set selected profile programmatically (for syncing with Start block)
     */
    public setSelectedProfile(profileName: string): void {
        if (this.selectedProfile !== profileName) {
            this.selectedProfile = profileName;
            // Update UI
            const items = document.querySelectorAll('#floating-run-profiles .floating-dropdown-item');
            items.forEach(item => {
                if ((item as HTMLElement).dataset.profile === profileName) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }
    }

    public setCallbacks(
        getStartBlocksCallback: () => Array<{ id: string; name: string }>,
        getProfilesCallback: (startBlockId: string) => Array<{ name: string; default?: boolean }>,
        onRunCallback?: (startBlockId: string, profile: string | null) => void
    ): void {
        this.getStartBlocksCallback = getStartBlocksCallback;
        this.getProfilesCallback = getProfilesCallback;
        this.onRunCallback = onRunCallback;
        this.updateStartBlocks();
    }

    public getSelectedStartBlockId(): string | null {
        return this.selectedStartBlockId;
    }

    public getSelectedProfile(): string | null {
        return this.selectedProfile;
    }

    private setActiveTool(tool: 'pointer' | 'hand'): void {
        const pointerBtn = document.getElementById('floating-pointer');
        const handBtn = document.getElementById('floating-hand');
        
        if (tool === 'pointer') {
            pointerBtn?.setAttribute('data-active', 'true');
            handBtn?.setAttribute('data-active', 'false');
        } else {
            pointerBtn?.setAttribute('data-active', 'false');
            handBtn?.setAttribute('data-active', 'true');
        }
        
        // Notify callback
        if (this.onToolChangeCallback) {
            this.onToolChangeCallback(tool);
        }
        
        console.log('[FloatingPanel] Tool changed:', tool);
    }

    public destroy(): void {
        if (this.panelElement) {
            this.panelElement.remove();
            this.panelElement = null;
        }
    }
}

