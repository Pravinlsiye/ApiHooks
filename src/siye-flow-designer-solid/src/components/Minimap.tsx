import { Component, createEffect, onMount } from 'solid-js';
import { blocks, zoom, pan } from '../store/designer-store';

const CANVAS_SIZE = 8000;
const MINI_W = 160;
const MINI_H = 100;
const SCALE = MINI_W / CANVAS_SIZE;

const Minimap: Component<{ containerEl: () => HTMLElement | undefined; wrapperEl: () => HTMLElement | undefined }> = (props) => {
    return (
        <div class="minimap">
            <svg width={MINI_W} height={MINI_H} viewBox={`0 0 ${MINI_W} ${MINI_H}`}>
                {/* Blocks */}
                {Object.values(blocks).map(b => (
                    <rect
                        x={b.position.x * SCALE}
                        y={b.position.y * SCALE}
                        width={Math.max(2, b.width * SCALE)}
                        height={Math.max(1, 20 * SCALE)}
                        rx="1"
                        fill="var(--border-strong)"
                        opacity="0.6"
                    />
                ))}
                {/* Viewport indicator */}
                {(() => {
                    const container = props.containerEl?.();
                    if (!container) return null;
                    const cw = container.clientWidth;
                    const ch = container.clientHeight;
                    const z = zoom();
                    const p = pan();
                    const cx = CANVAS_SIZE / 2 - p.x / z;
                    const cy = CANVAS_SIZE / 2 - p.y / z;
                    const vw = cw / z;
                    const vh = ch / z;
                    return (
                        <rect
                            class="minimap-viewport"
                            x={(cx - vw / 2) * SCALE}
                            y={(cy - vh / 2) * SCALE}
                            width={vw * SCALE}
                            height={vh * SCALE}
                            rx="1"
                        />
                    );
                })()}
            </svg>
        </div>
    );
};

export default Minimap;
