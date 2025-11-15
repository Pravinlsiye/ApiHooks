/**
 * Animation utility for requestAnimationFrame-based animations
 * Provides proper cleanup and lifecycle management
 * 
 * @example
 * ```typescript
 * const animation = new Animation((timestamp) => {
 *     // Update animation state
 *     element.style.left = `${timestamp}px`;
 *     
 *     // Stop animation when done
 *     if (timestamp > 1000) {
 *         animation.stop();
 *     }
 * });
 * 
 * animation.start();
 * 
 * // Cleanup
 * animation.stop();
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
        if (this.isRunning) {
            return;
        }
        
        this.isRunning = true;
        const animate = (timestamp: number) => {
            if (!this.isRunning) {
                return;
            }
            
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
     * 
     * @example
     * ```typescript
     * Animation.animateValue(
     *     0,
     *     100,
     *     1000, // 1 second
     *     (value) => {
     *         element.style.opacity = String(value / 100);
     *     }
     * );
     * ```
     */
    static animateValue(
        start: number,
        end: number,
        duration: number,
        callback: (value: number) => void,
        easing: (t: number) => number = (t) => t // Linear by default
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
        easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    };
}

