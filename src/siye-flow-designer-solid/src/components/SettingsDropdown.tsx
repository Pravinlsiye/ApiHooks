import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { currentTheme, setCurrentTheme } from '../store/designer-store';

const SettingsDropdown: Component = () => {
    const [open, setOpen] = createSignal(false);

    const handleDocClick = (e: MouseEvent) => {
        const wrap = document.getElementById('settings-dropdown-wrap');
        if (open() && wrap && !wrap.contains(e.target as Node)) setOpen(false);
    };

    onMount(() => document.addEventListener('click', handleDocClick));
    onCleanup(() => document.removeEventListener('click', handleDocClick));

    const themes = [
        { id: 'light', label: 'Light', icon: '☀' },
        { id: 'dark',  label: 'Dark',  icon: '🌙' },
        { id: 'system',label: 'Auto',  icon: '💻' },
    ];

    return (
        <div id="settings-dropdown-wrap" style="position:relative">
            <button class="navbar-btn" title="Settings" onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
            </button>
            <div class={`settings-dropdown${open() ? ' open' : ''}`}>
                <div class="settings-section-title">Theme</div>
                <div class="theme-options">
                    {themes.map(t => (
                        <button
                            class={`theme-option${currentTheme() === t.id ? ' active' : ''}`}
                            onClick={() => { setCurrentTheme(t.id as any); setOpen(false); }}
                        >
                            <span style="font-size:16px">{t.icon}</span>
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SettingsDropdown;
