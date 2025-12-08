import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DOMDiff } from '../../utils/DOMDiff';

describe('DOMDiff', () => {
  describe('updateList', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    it('should add new items', () => {
      const items = new Map([
        ['1', { id: '1', name: 'Item 1' }],
        ['2', { id: '2', name: 'Item 2' }]
      ]);

      DOMDiff.updateList(
        container,
        items,
        (item) => {
          const div = document.createElement('div');
          div.textContent = item.name;
          return div;
        }
      );

      expect(container.children.length).toBe(2);
      expect(container.children[0].textContent).toBe('Item 1');
      expect(container.children[1].textContent).toBe('Item 2');
    });

    it('should remove deleted items', () => {
      // Initial items
      const items1 = new Map([
        ['1', { id: '1', name: 'Item 1' }],
        ['2', { id: '2', name: 'Item 2' }],
        ['3', { id: '3', name: 'Item 3' }]
      ]);

      DOMDiff.updateList(container, items1, (item) => {
        const div = document.createElement('div');
        div.textContent = item.name;
        return div;
      });

      expect(container.children.length).toBe(3);

      // Remove item 2
      const items2 = new Map([
        ['1', { id: '1', name: 'Item 1' }],
        ['3', { id: '3', name: 'Item 3' }]
      ]);

      DOMDiff.updateList(container, items2, (item) => {
        const div = document.createElement('div');
        div.textContent = item.name;
        return div;
      });

      expect(container.children.length).toBe(2);
      expect(container.children[0].textContent).toBe('Item 1');
      expect(container.children[1].textContent).toBe('Item 3');
    });

    it('should update existing items', () => {
      const items1 = new Map([['1', { id: '1', name: 'Item 1' }]]);

      DOMDiff.updateList(container, items1, (item) => {
        const div = document.createElement('div');
        div.textContent = item.name;
        return div;
      });

      expect(container.children[0].textContent).toBe('Item 1');

      // Update item
      const items2 = new Map([['1', { id: '1', name: 'Updated Item' }]]);

      DOMDiff.updateList(
        container,
        items2,
        (item) => {
          const div = document.createElement('div');
          div.textContent = item.name;
          return div;
        },
        (element, item) => {
          element.textContent = item.name;
        }
      );

      expect(container.children.length).toBe(1);
      expect(container.children[0].textContent).toBe('Updated Item');
    });

    it('should handle array input', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ];

      DOMDiff.updateList(
        container,
        items,
        (item) => {
          const div = document.createElement('div');
          div.textContent = item.name;
          return div;
        },
        undefined,
        (item) => item.id
      );

      expect(container.children.length).toBe(2);
    });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = DOMDiff.memoize(fn, (x) => String(x));

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use custom key function', () => {
      const fn = vi.fn((obj: { x: number; y: number }) => obj.x + obj.y);
      const memoized = DOMDiff.memoize(fn, (obj) => `${obj.x},${obj.y}`);

      const obj1 = { x: 1, y: 2 };
      const obj2 = { x: 1, y: 2 };

      expect(memoized(obj1)).toBe(3);
      expect(memoized(obj2)).toBe(3);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect cache size limit', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = DOMDiff.memoize(fn, (x) => String(x), 2);

      memoized(1);
      memoized(2);
      memoized(3); // This should evict the first entry

      expect(memoized(1)).toBe(2);
      expect(fn).toHaveBeenCalledTimes(4); // Original + eviction + recall
    });

    it('should handle different arguments', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = DOMDiff.memoize(fn, (x) => String(x));

      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const fn = vi.fn();
      const debounced = DOMDiff.debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass latest arguments', async () => {
      const fn = vi.fn();
      const debounced = DOMDiff.debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledWith('third');
    });

    it('should reset timer on new calls', async () => {
      const fn = vi.fn();
      const debounced = DOMDiff.debounce(fn, 100);

      debounced();
      await new Promise(resolve => setTimeout(resolve, 50));
      debounced();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(fn).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      const fn = vi.fn();
      const throttled = DOMDiff.throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 150));
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should execute function immediately on first call', () => {
      const fn = vi.fn();
      const throttled = DOMDiff.throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should execute trailing call after delay', async () => {
      const fn = vi.fn();
      const throttled = DOMDiff.throttle(fn, 100);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);

      // Call multiple times within throttle period
      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      // Wait for trailing call
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass correct arguments', () => {
      const fn = vi.fn();
      const throttled = DOMDiff.throttle(fn, 100);

      throttled('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});

