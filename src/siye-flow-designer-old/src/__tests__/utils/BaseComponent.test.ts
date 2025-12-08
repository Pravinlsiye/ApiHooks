import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseComponent } from '../../utils/BaseComponent';

// Create a concrete test component
class TestComponent extends BaseComponent {
  public exposedAddEventListener = this.addEventListener.bind(this);
  public exposedRegisterCleanup = this.registerCleanup.bind(this);
  public exposedCreateElement = this.createElement.bind(this);
  public exposedRenderTemplate = this.renderTemplate.bind(this);
}

describe('BaseComponent', () => {
  let container: HTMLElement;
  let component: TestComponent;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    component = new TestComponent('test-container');
  });

  afterEach(() => {
    component.destroy();
    container.remove();
  });

  describe('Constructor', () => {
    it('should find and store container element', () => {
      expect(component['container']).toBe(container);
    });

    it('should throw error if container not found', () => {
      expect(() => {
        new TestComponent('non-existent');
      }).toThrow("Container element 'non-existent' not found");
    });
  });

  describe('addEventListener', () => {
    it('should add event listener to element', () => {
      const button = document.createElement('button');
      const handler = vi.fn();
      
      component.exposedAddEventListener(button, 'click', handler);
      button.click();
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should track event listeners for cleanup', () => {
      const button = document.createElement('button');
      const handler = vi.fn();
      
      component.exposedAddEventListener(button, 'click', handler);
      component.destroy();
      button.click();
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support event listener options', () => {
      const button = document.createElement('button');
      const handler = vi.fn();
      
      component.exposedAddEventListener(button, 'click', handler, { once: true });
      button.click();
      button.click();
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple event listeners on same element', () => {
      const button = document.createElement('button');
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      component.exposedAddEventListener(button, 'click', handler1);
      component.exposedAddEventListener(button, 'click', handler2);
      button.click();
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle document and window listeners', () => {
      const docHandler = vi.fn();
      const winHandler = vi.fn();
      
      component.exposedAddEventListener(document, 'click', docHandler);
      component.exposedAddEventListener(window, 'resize', winHandler);
      
      document.dispatchEvent(new Event('click'));
      window.dispatchEvent(new Event('resize'));
      
      expect(docHandler).toHaveBeenCalled();
      expect(winHandler).toHaveBeenCalled();
    });
  });

  describe('registerCleanup', () => {
    it('should register cleanup callback', () => {
      const cleanup = vi.fn();
      
      component.exposedRegisterCleanup(cleanup);
      component.destroy();
      
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should execute multiple cleanup callbacks', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      const cleanup3 = vi.fn();
      
      component.exposedRegisterCleanup(cleanup1);
      component.exposedRegisterCleanup(cleanup2);
      component.exposedRegisterCleanup(cleanup3);
      
      component.destroy();
      
      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(cleanup3).toHaveBeenCalledTimes(1);
    });
  });

  describe('createElement', () => {
    it('should create element with tag', () => {
      const div = component.exposedCreateElement('div');
      
      expect(div.tagName).toBe('DIV');
    });

    it('should create element with attributes', () => {
      const div = component.exposedCreateElement('div', {
        id: 'test-id',
        className: 'test-class',
        'data-value': '123'
      });
      
      expect(div.id).toBe('test-id');
      expect(div.className).toBe('test-class');
      expect(div.getAttribute('data-value')).toBe('123');
    });

    it('should create element with inline style', () => {
      const div = component.exposedCreateElement('div', {
        style: 'color: red; font-size: 16px;'
      });
      
      expect(div.getAttribute('style')).toContain('color: red');
    });

    it('should create element with children', () => {
      const child1 = document.createElement('span');
      const child2 = 'text content';
      
      const div = component.exposedCreateElement('div', {}, [child1, child2]);
      
      expect(div.children.length).toBe(1);
      expect(div.children[0]).toBe(child1);
      expect(div.textContent).toContain('text content');
    });

    it('should create element with mixed children', () => {
      const span = document.createElement('span');
      span.textContent = 'span';
      
      const div = component.exposedCreateElement('div', {}, [
        'before',
        span,
        'after'
      ]);
      
      expect(div.textContent).toBe('beforespanafter');
    });
  });

  describe('renderTemplate', () => {
    it('should render template with data', () => {
      const template = 'Hello {{name}}, you are {{age}} years old';
      const data = { name: 'John', age: '30' };
      
      const result = component.exposedRenderTemplate(template, data);
      
      expect(result).toBe('Hello John, you are 30 years old');
    });

    it('should handle missing template variables', () => {
      const template = 'Hello {{name}}, {{missing}}';
      const data = { name: 'John' };
      
      const result = component.exposedRenderTemplate(template, data);
      
      expect(result).toBe('Hello John, {{missing}}');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template = '{{value}} + {{value}} = {{result}}';
      const data = { value: '5', result: '10' };
      
      const result = component.exposedRenderTemplate(template, data);
      
      expect(result).toBe('5 + 5 = 10');
    });
  });

  describe('destroy', () => {
    it('should remove all event listeners', () => {
      const button = document.createElement('button');
      const handler = vi.fn();
      
      component.exposedAddEventListener(button, 'click', handler);
      component.destroy();
      button.click();
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should execute all cleanup callbacks', () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();
      
      component.exposedRegisterCleanup(cleanup1);
      component.exposedRegisterCleanup(cleanup2);
      
      component.destroy();
      
      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });

    it('should clear container innerHTML', () => {
      component['container'].innerHTML = '<div>content</div>';
      
      component.destroy();
      
      expect(component['container'].innerHTML).toBe('');
    });

    it('should be safe to call multiple times', () => {
      const cleanup = vi.fn();
      component.exposedRegisterCleanup(cleanup);
      
      component.destroy();
      component.destroy();
      
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Emitter Integration', () => {
    it('should support emitting events', () => {
      const listener = vi.fn();
      
      component.on('test-event', listener);
      component.emit('test-event', { data: 'test' });
      
      expect(listener).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support removing event listeners', () => {
      const listener = vi.fn();
      
      component.on('test-event', listener);
      component.off('test-event', listener);
      component.emit('test-event');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

