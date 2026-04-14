/**
 * Reactive state manager that automatically triggers renders on state changes
 * 
 * @example
 * ```typescript
 * const state = new ReactiveState({ count: 0 });
 * state.subscribe(() => console.log('State changed:', state.getState()));
 * state.setState({ count: 1 }); // Automatically triggers render
 * ```
 */

type RenderCallback = () => void;
type StateChangeHandler<T> = (oldState: T, newState: T) => void;

export class ReactiveState<T extends object> {
    private state: T;
    private renderCallbacks: Set<RenderCallback> = new Set();
    private changeHandlers: Set<StateChangeHandler<T>> = new Set();
    private isBatchingUpdates: boolean = false;
    private pendingRender: boolean = false;
    
    constructor(initialState: T) {
        this.state = initialState;
    }
    
    /**
     * Get current state
     */
    getState(): T {
        return this.state;
    }
    
    /**
     * Get a specific property from state
     */
    get<K extends keyof T>(key: K): T[K] {
        return this.state[key];
    }
    
    /**
     * Update state and automatically trigger renders
     */
    setState(updates: Partial<T>): void {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // Emit change to handlers
        this.changeHandlers.forEach(handler => {
            try {
                handler(oldState, this.state);
            } catch (error) {
                console.error('Error in state change handler:', error);
            }
        });
        
        this.triggerRender();
    }
    
    /**
     * Replace the entire state object
     */
    setFullState(newState: T): void {
        const oldState = { ...this.state };
        this.state = newState;
        
        this.changeHandlers.forEach(handler => {
            try {
                handler(oldState, this.state);
            } catch (error) {
                console.error('Error in state change handler:', error);
            }
        });
        
        this.triggerRender();
    }
    
    /**
     * Subscribe to state changes for automatic rendering
     * Returns an unsubscribe function
     */
    subscribe(callback: RenderCallback): () => void {
        this.renderCallbacks.add(callback);
        return () => this.renderCallbacks.delete(callback);
    }
    
    /**
     * Add a change handler that receives old and new state
     */
    onChange(handler: StateChangeHandler<T>): () => void {
        this.changeHandlers.add(handler);
        return () => this.changeHandlers.delete(handler);
    }
    
    /**
     * Trigger all render callbacks
     */
    private triggerRender(): void {
        if (this.isBatchingUpdates) {
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
     */
    batchUpdate(updateFn: () => void): void {
        if (this.isBatchingUpdates) {
            updateFn();
            return;
        }
        
        this.isBatchingUpdates = true;
        this.pendingRender = false;
        
        try {
            updateFn();
        } finally {
            this.isBatchingUpdates = false;
            
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
        this.changeHandlers.clear();
    }
    
    /**
     * Create a computed value that updates when state changes
     */
    computed<R>(selector: (state: T) => R): () => R {
        return () => selector(this.state);
    }
    
    /**
     * Watch a specific property and call handler when it changes
     */
    watch<K extends keyof T>(key: K, handler: (newValue: T[K], oldValue: T[K]) => void): () => void {
        return this.onChange((oldState, newState) => {
            if (oldState[key] !== newState[key]) {
                handler(newState[key], oldState[key]);
            }
        });
    }
}

