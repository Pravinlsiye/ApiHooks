import { SimpleEventEmitter } from '../designer/VisualModels';

type RenderCallback = () => void;

/**
 * Reactive state manager that automatically triggers renders on state changes
 * Eliminates need for manual render calls
 * 
 * @example
 * ```typescript
 * const state = new ReactiveState({ count: 0 });
 * state.subscribe(() => console.log('State changed:', state.getState()));
 * state.setState({ count: 1 }); // Automatically triggers render
 * ```
 */
export class ReactiveState<T> extends SimpleEventEmitter {
    private state: T;
    private renderCallbacks: Set<RenderCallback> = new Set();
    private isBatchingUpdates: boolean = false;
    private pendingRender: boolean = false;
    
    constructor(initialState: T) {
        super();
        this.state = initialState;
    }
    
    /**
     * Get current state
     */
    getState(): T {
        return this.state;
    }
    
    /**
     * Update state and automatically trigger renders
     * @param updates Partial state updates
     */
    setState(updates: Partial<T>): void {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // Emit change event
        this.emit('stateChanged', { oldState, newState: this.state });
        
        // Auto-trigger renders
        this.triggerRender();
    }
    
    /**
     * Replaces the entire state object
     * 
     * Unlike `setState` which merges updates, this replaces the entire state.
     * Use this when you need to completely reset the state.
     * 
     * @param newState The complete new state object
     * 
     * @example
     * ```typescript
     * // Reset to initial state
     * state.setFullState({ count: 0, user: 'guest' });
     * ```
     */
    setFullState(newState: T): void {
        const oldState = { ...this.state };
        this.state = newState;
        
        // Emit change event
        this.emit('stateChanged', { oldState, newState: this.state });
        
        // Auto-trigger renders
        this.triggerRender();
    }
    
    /**
     * Subscribes to state changes for automatic rendering
     * 
     * The callback will be invoked whenever the state changes via `setState`
     * or `setFullState`. Returns an unsubscribe function for cleanup.
     * 
     * @param callback Function to call when state changes
     * @returns Unsubscribe function to stop receiving updates
     * 
     * @example
     * ```typescript
     * const unsubscribe = state.subscribe(() => {
     *   // Re-render UI
     *   render();
     * });
     * 
     * // Later, when component is destroyed
     * unsubscribe();
     * ```
     * 
     * @example Multiple subscriptions
     * ```typescript
     * // Each subscription can serve a different purpose
     * const unsubscribe1 = state.subscribe(() => updateUI());
     * const unsubscribe2 = state.subscribe(() => logStateChange());
     * const unsubscribe3 = state.subscribe(() => saveToLocalStorage());
     * 
     * // Clean up all subscriptions
     * unsubscribe1();
     * unsubscribe2();
     * unsubscribe3();
     * ```
     */
    subscribe(callback: RenderCallback): () => void {
        this.renderCallbacks.add(callback);
        return () => this.renderCallbacks.delete(callback);
    }
    
    /**
     * Trigger all render callbacks
     */
    private triggerRender(): void {
        if (this.isBatchingUpdates) {
            // If batching, just mark that a render is pending
            this.pendingRender = true;
            return;
        }
        
        this.renderCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in render callback:', error);
            }
        });
    }
    
    /**
     * Batch multiple state updates to trigger only one render
     * Useful for operations that update multiple state properties
     * 
     * @param updateFn Function containing multiple setState calls
     * 
     * @example
     * ```typescript
     * state.batchUpdate(() => {
     *   state.setState({ isDragging: true });
     *   state.setState({ draggedBlockId: blockId });
     *   state.setState({ dragOffset: offset });
     * }); // Only one render triggered
     * ```
     */
    batchUpdate(updateFn: () => void): void {
        if (this.isBatchingUpdates) {
            // Already batching, just execute
            updateFn();
            return;
        }
        
        this.isBatchingUpdates = true;
        this.pendingRender = false;
        
        try {
            updateFn();
        } finally {
            this.isBatchingUpdates = false;
            
            // Trigger a single render if any updates occurred
            if (this.pendingRender) {
                this.pendingRender = false;
                this.triggerRender();
            }
        }
    }
    
    /**
     * Clear all subscriptions
     */
    clearSubscriptions(): void {
        this.renderCallbacks.clear();
    }
}

