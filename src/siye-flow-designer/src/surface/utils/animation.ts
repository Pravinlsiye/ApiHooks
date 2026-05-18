/**
 * Animation utility for requestAnimationFrame-based animations
 * Provides proper cleanup and lifecycle management
 * 
 * @example
 * ```typescript
 * const animation = new Animation((timestamp) => {
 *     element.style.left = `${timestamp}px`;
 *     if (timestamp > 1000) animation.stop();
 * });
 * animation.start();
 * ```
 */
export class Animation {
    private animationFrameId: number | null = null;
    private isRunning: boolean = false;
    private callback: (timestamp: number) => void;
    
    constructor(callback: (timestamp: number) => void) {
        this.callback = callback;
    }
    
    /**
     * Start the animation loop
     */
    start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        const animate = (timestamp: number) => {
            if (!this.isRunning) return;
            this.callback(timestamp);
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }
    
    /**
     * Stop the animation loop
     */
    stop(): void {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    /**
     * Check if animation is running
     */
    get running(): boolean {
        return this.isRunning;
    }
    
    /**
     * Animate a value from start to end over duration
     */
    static animateValue(
        start: number,
        end: number,
        duration: number,
        callback: (value: number) => void,
        easing: (t: number) => number = Animation.easing.linear
    ): Animation {
        const startTime = performance.now();
        const difference = end - start;
        
        const animation = new Animation((timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easing(progress);
            const value = start + (difference * eased);
            
            callback(value);
            
            if (progress >= 1) {
                animation.stop();
            }
        });
        
        animation.start();
        return animation;
    }
    
    /**
     * Common easing functions
     */
    static easing = {
        linear: (t: number) => t,
        easeIn: (t: number) => t * t,
        easeOut: (t: number) => t * (2 - t),
        easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: (t: number) => t * t * t,
        easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
        easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        bounce: (t: number) => {
            const n1 = 7.5625, d1 = 2.75;
            if (t < 1 / d1) return n1 * t * t;
            if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
            if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    };
    
    /**
     * Fade in an element
     */
    static fadeIn(element: HTMLElement, duration: number = 300): Promise<void> {
        return new Promise((resolve) => {
            element.style.opacity = '0';
            element.style.display = '';
            
            Animation.animateValue(0, 1, duration, (value) => {
                element.style.opacity = String(value);
                if (value >= 1) resolve();
            }, Animation.easing.easeOut);
        });
    }
    
    /**
     * Fade out an element
     */
    static fadeOut(element: HTMLElement, duration: number = 300): Promise<void> {
        return new Promise((resolve) => {
            Animation.animateValue(1, 0, duration, (value) => {
                element.style.opacity = String(value);
                if (value <= 0) {
                    element.style.display = 'none';
                    resolve();
                }
            }, Animation.easing.easeIn);
        });
    }
    
    /**
     * Slide down (expand) an element
     */
    static slideDown(element: HTMLElement, duration: number = 300): Promise<void> {
        return new Promise((resolve) => {
            element.style.overflow = 'hidden';
            element.style.display = '';
            const height = element.scrollHeight;
            element.style.height = '0px';
            
            Animation.animateValue(0, height, duration, (value) => {
                element.style.height = `${value}px`;
                if (value >= height) {
                    element.style.height = '';
                    element.style.overflow = '';
                    resolve();
                }
            }, Animation.easing.easeOut);
        });
    }
    
    /**
     * Slide up (collapse) an element
     */
    static slideUp(element: HTMLElement, duration: number = 300): Promise<void> {
        return new Promise((resolve) => {
            const height = element.scrollHeight;
            element.style.overflow = 'hidden';
            element.style.height = `${height}px`;
            
            Animation.animateValue(height, 0, duration, (value) => {
                element.style.height = `${value}px`;
                if (value <= 0) {
                    element.style.display = 'none';
                    element.style.height = '';
                    element.style.overflow = '';
                    resolve();
                }
            }, Animation.easing.easeIn);
        });
    }
}

