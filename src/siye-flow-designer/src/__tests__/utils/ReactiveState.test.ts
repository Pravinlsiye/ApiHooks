import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReactiveState } from '../../utils/ReactiveState';

describe('ReactiveState', () => {
  describe('Constructor and Initial State', () => {
    it('should initialize with provided state', () => {
      const initialState = { count: 0, name: 'test' };
      const state = new ReactiveState(initialState);
      
      expect(state.getState()).toEqual(initialState);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = new ReactiveState({ value: 42 });
      
      expect(state.getState()).toEqual({ value: 42 });
    });
  });

  describe('setState', () => {
    it('should update state with partial updates', () => {
      const state = new ReactiveState({ a: 1, b: 2, c: 3 });
      
      state.setState({ b: 20 });
      
      expect(state.getState()).toEqual({ a: 1, b: 20, c: 3 });
    });

    it('should trigger render callbacks', () => {
      const state = new ReactiveState({ count: 0 });
      const callback = vi.fn();
      
      state.subscribe(callback);
      state.setState({ count: 1 });
      
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should emit stateChanged event', () => {
      const state = new ReactiveState({ value: 10 });
      const listener = vi.fn();
      
      state.on('stateChanged', listener);
      state.setState({ value: 20 });
      
      expect(listener).toHaveBeenCalledWith({
        oldState: { value: 10 },
        newState: { value: 20 }
      });
    });

    it('should handle multiple state updates', () => {
      const state = new ReactiveState({ x: 0, y: 0 });
      
      state.setState({ x: 10 });
      state.setState({ y: 20 });
      state.setState({ x: 30, y: 40 });
      
      expect(state.getState()).toEqual({ x: 30, y: 40 });
    });
  });

  describe('setFullState', () => {
    it('should replace entire state', () => {
      const state = new ReactiveState({ a: 1, b: 2 });
      
      state.setFullState({ c: 3, d: 4 } as any);
      
      expect(state.getState()).toEqual({ c: 3, d: 4 });
    });

    it('should trigger render callbacks', () => {
      const state = new ReactiveState({ count: 0 });
      const callback = vi.fn();
      
      state.subscribe(callback);
      state.setFullState({ count: 5 });
      
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('should allow subscribing to state changes', () => {
      const state = new ReactiveState({ value: 0 });
      const callback = vi.fn();
      
      state.subscribe(callback);
      state.setState({ value: 1 });
      
      expect(callback).toHaveBeenCalled();
    });

    it('should return unsubscribe function', () => {
      const state = new ReactiveState({ value: 0 });
      const callback = vi.fn();
      
      const unsubscribe = state.subscribe(callback);
      state.setState({ value: 1 });
      expect(callback).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      state.setState({ value: 2 });
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should support multiple subscribers', () => {
      const state = new ReactiveState({ value: 0 });
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();
      
      state.subscribe(callback1);
      state.subscribe(callback2);
      state.subscribe(callback3);
      
      state.setState({ value: 1 });
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('should handle unsubscribing one of multiple subscribers', () => {
      const state = new ReactiveState({ value: 0 });
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      state.subscribe(callback1);
      const unsubscribe2 = state.subscribe(callback2);
      
      state.setState({ value: 1 });
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      
      unsubscribe2();
      state.setState({ value: 2 });
      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Event Emitter Integration', () => {
    it('should support on/off event listeners', () => {
      const state = new ReactiveState({ value: 0 });
      const listener = vi.fn();
      
      state.on('stateChanged', listener);
      state.setState({ value: 1 });
      
      expect(listener).toHaveBeenCalled();
      
      state.off('stateChanged', listener);
      state.setState({ value: 2 });
      
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Performance', () => {
    it('should handle many state updates efficiently', () => {
      const state = new ReactiveState({ count: 0 });
      const callback = vi.fn();
      
      state.subscribe(callback);
      
      for (let i = 0; i < 1000; i++) {
        state.setState({ count: i });
      }
      
      expect(callback).toHaveBeenCalledTimes(1000);
      expect(state.getState().count).toBe(999);
    });

    it('should handle many subscribers efficiently', () => {
      const state = new ReactiveState({ value: 0 });
      const callbacks = Array.from({ length: 100 }, () => vi.fn());
      
      callbacks.forEach(cb => state.subscribe(cb));
      state.setState({ value: 1 });
      
      callbacks.forEach(cb => expect(cb).toHaveBeenCalledTimes(1));
    });
  });
});

