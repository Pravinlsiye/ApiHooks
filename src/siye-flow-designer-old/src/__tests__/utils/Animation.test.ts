import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Animation } from '../../utils/Animation';

describe('Animation', () => {
    let animation: Animation;
    let callback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        callback = vi.fn();
        animation = new Animation(callback);
    });

    afterEach(() => {
        if (animation) {
            animation.stop();
        }
        vi.useRealTimers();
    });

    describe('Initialization', () => {
        it('should create animation instance', () => {
            expect(animation).toBeDefined();
            expect(animation.running).toBe(false);
        });

        it('should not be running initially', () => {
            expect(animation.running).toBe(false);
        });
    });

    describe('Start/Stop', () => {
        it('should start animation', () => {
            animation.start();
            expect(animation.running).toBe(true);
        });

        it('should call callback on animation frame', () => {
            animation.start();
            
            // Advance one frame
            vi.advanceTimersByTime(16);
            
            expect(callback).toHaveBeenCalled();
        });

        it('should stop animation', () => {
            animation.start();
            animation.stop();
            
            expect(animation.running).toBe(false);
        });

        it('should not call callback after stop', () => {
            animation.start();
            animation.stop();
            
            callback.mockClear();
            vi.advanceTimersByTime(100);
            
            expect(callback).not.toHaveBeenCalled();
        });

        it('should not start if already running', () => {
            animation.start();
            const initialCallCount = callback.mock.calls.length;
            
            animation.start(); // Second start should be ignored
            
            vi.advanceTimersByTime(16);
            
            // Should not have doubled the call count
            expect(callback.mock.calls.length).toBeLessThanOrEqual(initialCallCount + 1);
        });
    });

    describe('animateValue', () => {
        it('should animate value from start to end', () => {
            const valueCallback = vi.fn();
            const anim = Animation.animateValue(0, 100, 1000, valueCallback);
            
            // Advance time
            vi.advanceTimersByTime(500);
            
            expect(valueCallback).toHaveBeenCalled();
            const lastValue = valueCallback.mock.calls[valueCallback.mock.calls.length - 1][0];
            expect(lastValue).toBeGreaterThan(0);
            expect(lastValue).toBeLessThanOrEqual(100);
            
            anim.stop();
        });

        it('should complete animation at end value', () => {
            const valueCallback = vi.fn();
            const anim = Animation.animateValue(0, 100, 1000, valueCallback);
            
            // Advance to completion and allow for animation frame
            vi.advanceTimersByTime(1100);
            
            // Animation should have stopped itself
            const callCount = valueCallback.mock.calls.length;
            expect(callCount).toBeGreaterThan(0);
            
            // Check that the last value is 100 or very close
            const lastValue = valueCallback.mock.calls[callCount - 1][0];
            expect(Math.abs(lastValue - 100)).toBeLessThan(0.1);
        });

        it('should use linear easing by default', () => {
            const valueCallback = vi.fn();
            const anim = Animation.animateValue(0, 100, 1000, valueCallback);
            
            vi.advanceTimersByTime(500);
            
            const midValue = valueCallback.mock.calls[valueCallback.mock.calls.length - 1][0];
            // Linear should be approximately 50 at halfway
            expect(midValue).toBeCloseTo(50, 0);
            
            anim.stop();
        });

        it('should use custom easing function', () => {
            const valueCallback = vi.fn();
            const easeIn = Animation.easing.easeIn;
            const anim = Animation.animateValue(0, 100, 1000, valueCallback, easeIn);
            
            vi.advanceTimersByTime(500);
            
            const midValue = valueCallback.mock.calls[valueCallback.mock.calls.length - 1][0];
            // EaseIn should be less than 50 at halfway (starts slow)
            expect(midValue).toBeLessThan(50);
            
            anim.stop();
        });
    });

    describe('Easing Functions', () => {
        it('should have linear easing', () => {
            expect(Animation.easing.linear(0)).toBe(0);
            expect(Animation.easing.linear(0.5)).toBe(0.5);
            expect(Animation.easing.linear(1)).toBe(1);
        });

        it('should have easeIn easing', () => {
            expect(Animation.easing.easeIn(0)).toBe(0);
            expect(Animation.easing.easeIn(1)).toBe(1);
            expect(Animation.easing.easeIn(0.5)).toBeLessThan(0.5);
        });

        it('should have easeOut easing', () => {
            expect(Animation.easing.easeOut(0)).toBe(0);
            expect(Animation.easing.easeOut(1)).toBe(1);
            expect(Animation.easing.easeOut(0.5)).toBeGreaterThan(0.5);
        });

        it('should have easeInOut easing', () => {
            expect(Animation.easing.easeInOut(0)).toBe(0);
            expect(Animation.easing.easeInOut(1)).toBe(1);
            expect(Animation.easing.easeInOut(0.5)).toBeCloseTo(0.5, 1);
        });
    });

    describe('Performance', () => {
        it('should handle rapid start/stop cycles', () => {
            for (let i = 0; i < 10; i++) {
                animation.start();
                animation.stop();
            }
            
            expect(animation.running).toBe(false);
        });

        it('should handle long-running animations', () => {
            animation.start();
            
            // Simulate 100 frames
            for (let i = 0; i < 100; i++) {
                vi.advanceTimersByTime(16);
            }
            
            expect(callback.mock.calls.length).toBeGreaterThan(0);
            animation.stop();
        });
    });
});

