import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { SAMPLES } from '../../samples/index';
import { storeActions } from '../store/designer-store';
import SettingsDropdown from './SettingsDropdown';
import { terminalActions } from '../store/terminal-store';

const Navbar: Component<{ homeUrl?: string }> = (props) => {
    const [samplesOpen, setSamplesOpen] = createSignal(false);

    const handleDocClick = (e: MouseEvent) => {
        const wrapper = document.getElementById('samples-wrapper');
        if (samplesOpen() && wrapper && !wrapper.contains(e.target as Node)) {
            setSamplesOpen(false);
        }
    };

    onMount(() => document.addEventListener('click', handleDocClick));
    onCleanup(() => document.removeEventListener('click', handleDocClick));

    const loadSample = (id: string) => {
        const s = SAMPLES.find(x => x.id === id);
        if (s) {
            terminalActions.clear();
            storeActions.loadFromSchema(s.data);
            setSamplesOpen(false);
        }
    };

    const importWorkflow = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target?.result as string);
                    storeActions.loadFromSchema(data);
                } catch { alert('Invalid workflow JSON'); }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const exportWorkflow = () => {
        const data = storeActions.toSchema();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'workflow.json'; a.click();
        URL.revokeObjectURL(url);
    };

    const BrandEl = () => props.homeUrl
        ? <a class="navbar-brand" href={props.homeUrl}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="var(--accent)" opacity="0.25"/>
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="var(--accent)" stroke-width="1.8" fill="none"/>
                <circle cx="12" cy="12" r="2.8" fill="var(--accent)"/>
            </svg>
            SiyeFlow Designer
          </a>
        : <div class="navbar-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="var(--accent)" opacity="0.25"/>
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="var(--accent)" stroke-width="1.8" fill="none"/>
                <circle cx="12" cy="12" r="2.8" fill="var(--accent)"/>
            </svg>
            SiyeFlow Designer
          </div>;

    return (
        <header class="navbar">
            <BrandEl />
            <div class="navbar-actions">
                {/* Import */}
                <button class="navbar-btn" title="Import workflow" onClick={importWorkflow}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                </button>
                {/* Export */}
                <button class="navbar-btn" title="Export workflow" onClick={exportWorkflow}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                </button>
                <div class="navbar-sep" />
                {/* Try a sample */}
                <div class="samples-wrapper" id="samples-wrapper" style="position:relative">
                    <button
                        class="samples-trigger navbar-btn"
                        style="width:auto;gap:5px;padding:0 10px;font-size:12px;font-weight:500;"
                        aria-expanded={samplesOpen()}
                        onClick={(e) => { e.stopPropagation(); setSamplesOpen(v => !v); }}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        Try a sample
                        <svg class="chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                            style={samplesOpen() ? 'transform:rotate(180deg)' : ''}>
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </button>
                    <div class={`samples-menu${samplesOpen() ? ' open' : ''}`}>
                        {SAMPLES.map(s => (
                            <button class="samples-item" onClick={() => loadSample(s.id)}>
                                <span class="sample-label">{s.label}</span>
                                <span class="sample-desc">{s.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div class="navbar-sep" />
                <SettingsDropdown />
            </div>
        </header>
    );
};

export default Navbar;
