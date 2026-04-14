/**
 * Variable Inspector - single tabbed panel with pin and detach support
 */

export interface InspectorData {
    variables: Record<string, any>;
    currentBlock: { id: string; type: string; label: string };
    blockOutputs: Record<string, Record<string, any>>;
}

interface InspectorTab {
    id: string;
    label: string;
    data: InspectorData;
    pinned: boolean;
}

let tabIdCounter = 0;

function renderJsonTree(value: any, depth: number): HTMLElement {
    if (value === null || value === undefined) return prim('null', 'null');
    if (typeof value === 'boolean') return prim(String(value), 'boolean');
    if (typeof value === 'number') return prim(String(value), 'number');
    if (typeof value === 'string') {
        const display = value.length > 120 ? value.substring(0, 120) + '…' : value;
        return prim(`"${display}"`, 'string');
    }
    if (Array.isArray(value)) return renderObj(value, depth, true);
    if (typeof value === 'object') return renderObj(value, depth, false);
    return prim(String(value), 'string');
}

function prim(text: string, type: string): HTMLElement {
    const s = document.createElement('span');
    s.className = `json-value json-value-${type}`;
    s.textContent = text;
    return s;
}

function renderObj(obj: any, depth: number, isArray: boolean): HTMLElement {
    const c = document.createElement('div');
    c.className = 'json-tree';

    const entries: [string, any][] = isArray
        ? (obj as any[]).map((v, i) => [String(i), v])
        : Object.entries(obj);

    if (entries.length === 0) {
        const e = document.createElement('span');
        e.className = 'json-value json-value-null';
        e.textContent = isArray ? '[]' : '{}';
        c.appendChild(e);
        return c;
    }

    for (const [key, val] of entries) {
        const row = document.createElement('div');
        row.className = 'json-row';
        row.style.paddingLeft = `${depth * 14}px`;

        const isComplex = val !== null && typeof val === 'object';

        if (isComplex) {
            const toggle = document.createElement('span');
            toggle.className = 'json-toggle';
            toggle.textContent = '▶';
            row.appendChild(toggle);

            const keySpan = document.createElement('span');
            keySpan.className = 'json-key';
            keySpan.textContent = `${key}: `;
            row.appendChild(keySpan);

            const cnt = Array.isArray(val) ? val.length : Object.keys(val).length;
            const lbl = Array.isArray(val) ? `Array(${cnt})` : `{${cnt}}`;
            const ts = document.createElement('span');
            ts.className = 'json-value json-value-null';
            ts.textContent = lbl;
            row.appendChild(ts);

            const child = document.createElement('div');
            child.style.display = 'none';
            child.appendChild(renderJsonTree(val, depth + 1));

            toggle.addEventListener('click', () => {
                const open = child.style.display !== 'none';
                child.style.display = open ? 'none' : '';
                toggle.textContent = open ? '▶' : '▼';
            });

            c.appendChild(row);
            c.appendChild(child);
        } else {
            const spacer = document.createElement('span');
            spacer.className = 'json-toggle-spacer';
            row.appendChild(spacer);

            const keySpan = document.createElement('span');
            keySpan.className = 'json-key';
            keySpan.textContent = `${key}: `;
            row.appendChild(keySpan);

            row.appendChild(renderJsonTree(val, depth + 1));
            c.appendChild(row);
        }
    }

    return c;
}

function renderSection(title: string, data: any, expanded: boolean): HTMLElement {
    const section = document.createElement('div');
    section.className = 'vi-section';

    const header = document.createElement('div');
    header.className = `vi-section-header ${expanded ? 'expanded' : ''}`;

    const count = typeof data === 'object' && data !== null ? Object.keys(data).length : 0;
    header.innerHTML = `<span class="vi-chevron">&#9654;</span> <span>${title}</span> <span class="vi-count">${count}</span>`;

    const content = document.createElement('div');
    content.className = 'vi-section-content';
    content.style.display = expanded ? '' : 'none';
    content.appendChild(renderJsonTree(data, 0));

    header.addEventListener('click', () => {
        header.classList.toggle('expanded');
        content.style.display = header.classList.contains('expanded') ? '' : 'none';
    });

    section.appendChild(header);
    section.appendChild(content);
    return section;
}

function renderTabBody(data: InspectorData): HTMLElement {
    const body = document.createElement('div');
    body.className = 'vi-tab-body';
    body.appendChild(renderSection('Current Block', {
        id: data.currentBlock.id,
        type: data.currentBlock.type,
        label: data.currentBlock.label,
    }, true));
    body.appendChild(renderSection('Variables', data.variables, true));
    body.appendChild(renderSection('Block Outputs', data.blockOutputs, false));
    return body;
}

function makeDraggable(panel: HTMLElement, handle: HTMLElement, excludeSelector: string): void {
    let dragging = false;
    let ox = 0, oy = 0;

    handle.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).closest(excludeSelector)) return;
        e.preventDefault();
        dragging = true;
        const r = panel.getBoundingClientRect();
        ox = e.clientX - r.left;
        oy = e.clientY - r.top;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        panel.style.right = 'auto';
        panel.style.left = `${e.clientX - ox}px`;
        panel.style.top = `${e.clientY - oy}px`;
    });

    document.addEventListener('mouseup', () => {
        dragging = false;
        document.body.style.userSelect = '';
    });
}

/**
 * Detached floating window showing a frozen snapshot
 */
class DetachedInspector {
    readonly panel: HTMLElement;
    readonly tab: InspectorTab;
    private onAttach: () => void;

    constructor(tab: InspectorTab, offset: number, onClose: () => void, onAttach: () => void) {
        this.tab = tab;
        this.onAttach = onAttach;

        this.panel = document.createElement('div');
        this.panel.className = 'variable-inspector detached-inspector';
        this.panel.style.top = `${80 + offset * 28}px`;
        this.panel.style.right = `${380 + 20 + offset * 20}px`;

        const header = document.createElement('div');
        header.className = 'vi-header';
        header.innerHTML = `
            <span class="vi-title">Pinned: ${tab.label}</span>
            <div class="vi-header-actions">
                <button class="vi-attach" title="Attach back to inspector">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="10" height="10" rx="1"/><path d="M10 5V1H1v9h4"/></svg>
                </button>
                <button class="vi-close" title="Close">&times;</button>
            </div>
        `;
        this.panel.appendChild(header);

        const body = renderTabBody(tab.data);
        body.className = 'vi-body';
        this.panel.appendChild(body);

        document.body.appendChild(this.panel);

        header.querySelector('.vi-close')!.addEventListener('click', () => onClose());
        header.querySelector('.vi-attach')!.addEventListener('click', () => this.onAttach());
        makeDraggable(this.panel, header, '.vi-close, .vi-attach');
    }

    destroy(): void {
        this.panel.remove();
    }
}

/**
 * Single tabbed inspector panel with pin/detach support
 */
export class VariableInspector {
    private panel: HTMLElement;
    private tabBar: HTMLElement;
    private bodyContainer: HTMLElement;
    private actionsBar: HTMLElement;
    private tabs: InspectorTab[] = [];
    private activeTabId: string | null = null;
    private detached: DetachedInspector[] = [];
    private visible = false;
    private minimized = true;

    constructor() {
        this.panel = document.createElement('div');
        this.panel.className = 'variable-inspector minimized';
        this.panel.style.display = 'none';

        const header = document.createElement('div');
        header.className = 'vi-header';
        header.innerHTML = `
            <span class="vi-title">Inspector</span>
            <div class="vi-header-actions">
                <button class="vi-minimize" title="Restore">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v1H3zM3 8h10v1H3zM3 13h10v1H3z"/></svg>
                </button>
            </div>
        `;
        this.panel.appendChild(header);

        header.querySelector('.vi-minimize')!.addEventListener('click', () => this.toggleMinimize());

        const tabWrapper = document.createElement('div');
        tabWrapper.className = 'vi-tabs-wrapper';

        const scrollLeft = document.createElement('button');
        scrollLeft.className = 'vi-tab-scroll vi-tab-scroll-left';
        scrollLeft.innerHTML = '&#9664;';
        scrollLeft.addEventListener('click', () => {
            this.tabBar.scrollBy({ left: -120, behavior: 'smooth' });
        });
        tabWrapper.appendChild(scrollLeft);

        this.tabBar = document.createElement('div');
        this.tabBar.className = 'vi-tabs';
        tabWrapper.appendChild(this.tabBar);

        const scrollRight = document.createElement('button');
        scrollRight.className = 'vi-tab-scroll vi-tab-scroll-right';
        scrollRight.innerHTML = '&#9654;';
        scrollRight.addEventListener('click', () => {
            this.tabBar.scrollBy({ left: 120, behavior: 'smooth' });
        });
        tabWrapper.appendChild(scrollRight);

        this.panel.appendChild(tabWrapper);

        this.actionsBar = document.createElement('div');
        this.actionsBar.className = 'vi-tab-actions';
        this.panel.appendChild(this.actionsBar);

        this.bodyContainer = document.createElement('div');
        this.bodyContainer.className = 'vi-body';
        this.panel.appendChild(this.bodyContainer);

        document.body.appendChild(this.panel);
        makeDraggable(this.panel, header, '.vi-close, .vi-tab-actions');
    }

    show(): void {
        if (this.tabs.length === 0) return;
        this.visible = true;
        this.panel.style.display = '';
    }

    hide(): void {
        this.visible = false;
        this.panel.style.display = 'none';
    }

    toggle(): void {
        if (this.visible) this.hide();
        else this.show();
    }

    private toggleMinimize(): void {
        this.minimized = !this.minimized;
        this.panel.classList.toggle('minimized', this.minimized);
        const btn = this.panel.querySelector('.vi-minimize');
        if (btn) {
            btn.innerHTML = this.minimized
                ? '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v1H3zM3 8h10v1H3zM3 13h10v1H3z"/></svg>'
                : '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10v1H3z"/></svg>';
            btn.setAttribute('title', this.minimized ? 'Restore' : 'Minimize');
        }
    }

    update(data: InspectorData): void {
        const id = `tab_${++tabIdCounter}`;
        this.tabs.push({ id, label: data.currentBlock.label, data, pinned: false });
        this.activeTabId = id;

        this.render();
        this.show();
    }

    clearUnpinned(): void {
        this.tabs = this.tabs.filter(t => t.pinned);
        if (this.tabs.length > 0) {
            if (!this.tabs.find(t => t.id === this.activeTabId)) {
                this.activeTabId = this.tabs[0].id;
            }
            this.render();
        } else {
            this.activeTabId = null;
            this.hide();
        }
    }

    clearAll(): void {
        this.tabs = [];
        this.activeTabId = null;
        this.hide();
        this.detached.forEach(d => d.destroy());
        this.detached = [];
        tabIdCounter = 0;
    }

    destroyAll(): void {
        this.clearAll();
    }

    private render(): void {
        this.renderTabBar();
        this.renderActions();
        this.renderBody();
    }

    private renderTabBar(): void {
        this.tabBar.innerHTML = '';

        for (const tab of this.tabs) {
            const el = document.createElement('div');
            el.className = `vi-tab ${tab.id === this.activeTabId ? 'active' : ''} ${tab.pinned ? 'pinned' : ''}`;
            el.setAttribute('data-tab-id', tab.id);

            const label = document.createElement('span');
            label.className = 'vi-tab-label';
            label.textContent = tab.label;
            el.appendChild(label);

            if (tab.pinned) {
                const dot = document.createElement('span');
                dot.className = 'vi-tab-pin-dot';
                dot.textContent = '📌';
                el.appendChild(dot);
            }

            const closeBtn = document.createElement('span');
            closeBtn.className = 'vi-tab-close';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(tab.id);
            });
            el.appendChild(closeBtn);

            el.addEventListener('click', () => {
                this.activeTabId = tab.id;
                this.render();
            });

            this.tabBar.appendChild(el);
        }
    }

    private renderActions(): void {
        this.actionsBar.innerHTML = '';
        const activeTab = this.tabs.find(t => t.id === this.activeTabId);
        if (!activeTab) return;

        const pinBtn = document.createElement('button');
        pinBtn.className = `vi-action-btn ${activeTab.pinned ? 'active' : ''}`;
        pinBtn.title = activeTab.pinned ? 'Unpin' : 'Pin';
        pinBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5H9v4l-1 2-1-2v-4H3.5a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A5.921 5.921 0 0 1 5 6.708V2.277a2.77 2.77 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z"/></svg>`;
        pinBtn.addEventListener('click', () => this.togglePin(activeTab.id));
        this.actionsBar.appendChild(pinBtn);

        const detachBtn = document.createElement('button');
        detachBtn.className = 'vi-action-btn';
        detachBtn.title = 'Detach to window';
        detachBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="10" height="10" rx="1"/><path d="M6 1h9v9M6 10L15 1"/></svg>`;
        detachBtn.addEventListener('click', () => this.detachTab(activeTab.id));
        this.actionsBar.appendChild(detachBtn);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'vi-action-btn';
        closeBtn.title = 'Close tab';
        closeBtn.innerHTML = '&times;';
        closeBtn.style.fontSize = '16px';
        closeBtn.addEventListener('click', () => this.closeTab(activeTab.id));
        this.actionsBar.appendChild(closeBtn);
    }

    private renderBody(): void {
        this.bodyContainer.innerHTML = '';
        const activeTab = this.tabs.find(t => t.id === this.activeTabId);
        if (!activeTab) return;
        const content = renderTabBody(activeTab.data);
        this.bodyContainer.appendChild(content);
    }

    private togglePin(tabId: string): void {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        tab.pinned = !tab.pinned;
        if (tab.pinned) {
            const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            tab.label = `${tab.data.currentBlock.label} ${ts}`;
        } else {
            tab.label = tab.data.currentBlock.label;
        }
        this.render();
    }

    private detachTab(tabId: string): void {
        const idx = this.tabs.findIndex(t => t.id === tabId);
        if (idx === -1) return;
        const tab = this.tabs[idx];

        tab.pinned = true;
        if (!tab.label.includes(':')) {
            const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            tab.label = `${tab.data.currentBlock.label} ${ts}`;
        }
        const detached = new DetachedInspector(
            tab,
            this.detached.length,
            () => this.removeDetached(detached),
            () => this.attachTab(detached)
        );
        this.detached.push(detached);

        this.tabs.splice(idx, 1);
        if (this.activeTabId === tabId) {
            this.activeTabId = this.tabs.length > 0 ? this.tabs[0].id : null;
        }
        if (this.tabs.length === 0) {
            this.hide();
        } else {
            this.render();
        }
    }

    private attachTab(detached: DetachedInspector): void {
        const tab = detached.tab;
        this.removeDetached(detached);

        this.tabs.push(tab);
        this.activeTabId = tab.id;
        this.render();
        this.show();
    }

    private removeDetached(detached: DetachedInspector): void {
        detached.destroy();
        this.detached = this.detached.filter(d => d !== detached);
    }

    private closeTab(tabId: string): void {
        const idx = this.tabs.findIndex(t => t.id === tabId);
        if (idx === -1) return;

        this.tabs.splice(idx, 1);
        if (this.activeTabId === tabId) {
            this.activeTabId = this.tabs.length > 0 ? this.tabs[Math.max(0, idx - 1)].id : null;
        }
        if (this.tabs.length === 0) {
            this.hide();
        } else {
            this.render();
        }
    }
}
