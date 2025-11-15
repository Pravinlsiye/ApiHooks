import { describe, it, expect, beforeEach } from 'vitest';
import { DOMUpdater } from '../../utils/DOMUpdater';

describe('DOMUpdater', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
  });

  describe('updateElement', () => {
    it('should update text content', () => {
      const element = document.createElement('div');
      
      DOMUpdater.updateElement(element, { text: 'Hello World' });
      
      expect(element.textContent).toBe('Hello World');
    });

    it('should update HTML content', () => {
      const element = document.createElement('div');
      
      DOMUpdater.updateElement(element, { html: '<span>HTML</span>' });
      
      expect(element.innerHTML).toBe('<span>HTML</span>');
    });

    it('should update attributes', () => {
      const element = document.createElement('div');
      
      DOMUpdater.updateElement(element, {
        attributes: {
          'data-id': '123',
          'data-name': 'test'
        }
      });
      
      expect(element.getAttribute('data-id')).toBe('123');
      expect(element.getAttribute('data-name')).toBe('test');
    });

    it('should update styles', () => {
      const element = document.createElement('div');
      
      DOMUpdater.updateElement(element, {
        styles: {
          color: 'red',
          'font-size': '16px',
          'background-color': 'blue'
        }
      });
      
      expect(element.style.color).toBe('red');
      expect(element.style.fontSize).toBe('16px');
      expect(element.style.backgroundColor).toBe('blue');
    });

    it('should update classes', () => {
      const element = document.createElement('div');
      
      DOMUpdater.updateElement(element, {
        classes: ['class1', 'class2', 'class3']
      });
      
      expect(element.className).toBe('class1 class2 class3');
    });

    it('should update children', () => {
      const element = document.createElement('div');
      const child1 = document.createElement('span');
      const child2 = document.createElement('div');
      
      DOMUpdater.updateElement(element, {
        children: [child1, child2]
      });
      
      expect(element.children.length).toBe(2);
      expect(element.children[0]).toBe(child1);
      expect(element.children[1]).toBe(child2);
    });

    it('should handle multiple updates at once', () => {
      const element = document.createElement('div');
      
      DOMUpdater.updateElement(element, {
        text: 'Updated',
        attributes: { 'data-id': '456' },
        styles: { color: 'green' },
        classes: ['updated-class']
      });
      
      expect(element.textContent).toBe('Updated');
      expect(element.getAttribute('data-id')).toBe('456');
      expect(element.style.color).toBe('green');
      expect(element.className).toBe('updated-class');
    });

    it('should accept kebab-case CSS properties', () => {
      const element = document.createElement('div');
      
      DOMUpdater.updateElement(element, {
        styles: {
          'background-color': 'red',
          'font-size': '14px'
        }
      });
      
      expect(element.style.backgroundColor).toBe('red');
      expect(element.style.fontSize).toBe('14px');
    });
  });

  describe('query', () => {
    beforeEach(() => {
      container.innerHTML = `
        <div class="test-div">
          <span class="test-span">Content</span>
        </div>
      `;
    });

    it('should query element', () => {
      const result = DOMUpdater.query(container, '.test-div');
      
      expect(result).not.toBeNull();
      expect(result?.classList.contains('test-div')).toBe(true);
    });

    it('should return null if element not found', () => {
      const result = DOMUpdater.query(container, '.non-existent');
      
      expect(result).toBeNull();
    });

    it('should throw if element not found and required', () => {
      expect(() => {
        DOMUpdater.query(container, '.non-existent', true);
      }).toThrow('Required element not found: .non-existent');
    });

    it('should return typed element', () => {
      const result = DOMUpdater.query<HTMLSpanElement>(container, '.test-span');
      
      expect(result).not.toBeNull();
      expect(result?.tagName).toBe('SPAN');
    });
  });

  describe('queryAll', () => {
    beforeEach(() => {
      container.innerHTML = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `;
    });

    it('should query all elements', () => {
      const results = DOMUpdater.queryAll(container, '.item');
      
      expect(results.length).toBe(3);
    });

    it('should return empty array if no elements found', () => {
      const results = DOMUpdater.queryAll(container, '.non-existent');
      
      expect(results).toEqual([]);
    });

    it('should return typed elements', () => {
      const results = DOMUpdater.queryAll<HTMLDivElement>(container, '.item');
      
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.tagName).toBe('DIV');
      });
    });
  });

  describe('batchUpdate', () => {
    it('should batch multiple updates', async () => {
      const updates = [
        () => {
          const div = document.createElement('div');
          div.textContent = 'Div 1';
          container.appendChild(div);
        },
        () => {
          const div = document.createElement('div');
          div.textContent = 'Div 2';
          container.appendChild(div);
        },
        () => {
          const div = document.createElement('div');
          div.textContent = 'Div 3';
          container.appendChild(div);
        }
      ];

      DOMUpdater.batchUpdate(updates);

      // Wait for RAF
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      
      expect(container.children.length).toBe(3);
    });

    it('should use requestAnimationFrame', async () => {
      const update = vi.fn(() => {
        const div = document.createElement('div');
        container.appendChild(div);
      });

      DOMUpdater.batchUpdate([update]);

      // Update should not be called immediately
      expect(update).not.toHaveBeenCalled();

      // Wait for RAF
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
      expect(update).toHaveBeenCalled();
    });

    it.skip('should execute callback after updates (not implemented)', () => {
      // batchUpdate doesn't currently support callbacks
      // This is a known limitation - batch updates happen async via RAF
    });
  });

  describe('Integration', () => {
    it('should support chaining operations', () => {
      const element = document.createElement('div');
      
      const result = DOMUpdater.updateElement(element, {
        text: 'Test',
        classes: ['test-class']
      });
      
      DOMUpdater.updateElement(result, {
        attributes: { 'data-id': '123' }
      });
      
      expect(element.textContent).toBe('Test');
      expect(element.className).toBe('test-class');
      expect(element.getAttribute('data-id')).toBe('123');
    });
  });
});

