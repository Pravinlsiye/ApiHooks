import { Component, createEffect, onMount } from 'solid-js';
import Navbar from './Navbar';
import BlockPalette from './BlockPalette';
import CanvasArea from './CanvasArea';
import { currentTheme } from '../store/designer-store';

const App: Component<{ homeUrl?: string }> = (props) => {
    onMount(() => {
        // Apply system theme on load
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => {
            const t = currentTheme();
            if (t === 'system') {
                document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
            } else {
                document.documentElement.setAttribute('data-theme', t);
            }
        };
        mq.addEventListener('change', apply);
        apply();
    });

    createEffect(() => {
        const t = currentTheme();
        if (t !== 'system') {
            document.documentElement.setAttribute('data-theme', t);
        }
    });

    return (
        <div class="app">
            <Navbar />
            <BlockPalette />
            <CanvasArea />
        </div>
    );
};

export default App;
