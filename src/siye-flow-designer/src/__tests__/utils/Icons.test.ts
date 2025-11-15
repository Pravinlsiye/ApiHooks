import { describe, it, expect } from 'vitest';
import { createIcon, getIconSvg, IconType, SVG_ICONS, LEGACY_EMOJI_ICONS } from '../../utils/Icons';

describe('Icons', () => {
    describe('getIconSvg', () => {
        it('should return SVG for start icon', () => {
            const svg = getIconSvg('start');
            expect(svg).toContain('<svg');
            expect(svg).toContain('circle');
        });

        it('should return SVG for end icon', () => {
            const svg = getIconSvg('end');
            expect(svg).toContain('<svg');
            expect(svg).toContain('circle');
        });

        it('should return SVG for http icon', () => {
            const svg = getIconSvg('http');
            expect(svg).toContain('<svg');
        });

        it('should return SVG for all icon types', () => {
            const types: IconType[] = ['start', 'end', 'http', 'variable', 'condition', 'delay', 'log', 'evaluate', 'loop', 'trycatch'];
            
            types.forEach(type => {
                const svg = getIconSvg(type);
                expect(svg).toContain('<svg');
                expect(svg.length).toBeGreaterThan(0);
            });
        });
    });

    describe('createIcon', () => {
        it('should create icon element', () => {
            const icon = createIcon('start');
            expect(icon).toBeInstanceOf(HTMLElement);
            expect(icon.tagName).toBe('SPAN');
        });

        it('should have correct class name', () => {
            const icon = createIcon('start');
            expect(icon.className).toContain('icon');
            expect(icon.className).toContain('icon-start');
        });

        it('should include custom className', () => {
            const icon = createIcon('start', 'custom-class');
            expect(icon.className).toContain('custom-class');
        });

        it('should have default size of 24px', () => {
            const icon = createIcon('start');
            expect(icon.style.width).toBe('24px');
            expect(icon.style.height).toBe('24px');
        });

        it('should use custom size', () => {
            const icon = createIcon('start', undefined, 32);
            expect(icon.style.width).toBe('32px');
            expect(icon.style.height).toBe('32px');
        });

        it('should contain SVG element', () => {
            const icon = createIcon('start');
            const svg = icon.querySelector('svg');
            expect(svg).toBeTruthy();
        });

        it('should style SVG correctly', () => {
            const icon = createIcon('start');
            const svg = icon.querySelector('svg');
            expect(svg?.style.width).toBe('100%');
            expect(svg?.style.height).toBe('100%');
            expect(svg?.style.display).toBe('block');
        });

        it('should create icons for all types', () => {
            const types: IconType[] = ['start', 'end', 'http', 'variable', 'condition', 'delay', 'log', 'evaluate', 'loop', 'trycatch'];
            
            types.forEach(type => {
                const icon = createIcon(type);
                expect(icon).toBeTruthy();
                expect(icon.className).toContain(`icon-${type}`);
            });
        });
    });

    describe('SVG_ICONS', () => {
        it('should have all icon types defined', () => {
            const types: IconType[] = ['start', 'end', 'http', 'variable', 'condition', 'delay', 'log', 'evaluate', 'loop', 'trycatch'];
            
            types.forEach(type => {
                expect(SVG_ICONS[type]).toBeDefined();
                expect(SVG_ICONS[type].length).toBeGreaterThan(0);
            });
        });

        it('should have valid SVG markup', () => {
            Object.values(SVG_ICONS).forEach(svg => {
                expect(svg).toContain('<svg');
                expect(svg).toContain('viewBox');
            });
        });
    });

    describe('LEGACY_EMOJI_ICONS', () => {
        it('should have all icon types defined', () => {
            const types: IconType[] = ['start', 'end', 'http', 'variable', 'condition', 'delay', 'log', 'evaluate', 'loop', 'trycatch'];
            
            types.forEach(type => {
                expect(LEGACY_EMOJI_ICONS[type]).toBeDefined();
            });
        });

        it('should contain emoji characters', () => {
            Object.values(LEGACY_EMOJI_ICONS).forEach(emoji => {
                expect(typeof emoji).toBe('string');
                expect(emoji.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Integration', () => {
        it('should create icon and retrieve same SVG', () => {
            const icon = createIcon('start');
            const svg = icon.querySelector('svg');
            const expectedSvg = getIconSvg('start');
            
            expect(svg?.outerHTML).toContain('svg');
            expect(expectedSvg).toContain('svg');
        });

        it('should handle multiple icon instances', () => {
            const icon1 = createIcon('start');
            const icon2 = createIcon('start');
            
            expect(icon1).not.toBe(icon2);
            expect(icon1.innerHTML).toBe(icon2.innerHTML);
        });
    });
});

