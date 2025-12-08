import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlertModal } from '../../components/AlertModal';

describe('AlertModal', () => {
    let modal: AlertModal;

    beforeEach(() => {
        modal = new AlertModal();
    });

    afterEach(() => {
        if (modal) {
            modal.destroy();
        }
    });

    describe('Initialization', () => {
        it('should create modal element', () => {
            const overlay = document.querySelector('.alert-modal-overlay');
            expect(overlay).toBeTruthy();
        });

        it('should have modal structure', () => {
            const modalEl = document.querySelector('.alert-modal');
            expect(modalEl).toBeTruthy();
            
            const header = modalEl!.querySelector('.alert-modal-header');
            const body = modalEl!.querySelector('.alert-modal-body');
            const footer = modalEl!.querySelector('.alert-modal-footer');
            
            expect(header).toBeTruthy();
            expect(body).toBeTruthy();
            expect(footer).toBeTruthy();
        });

        it('should have close button', () => {
            const closeBtn = document.querySelector('[data-testid="alert-modal-close"]');
            expect(closeBtn).toBeTruthy();
        });

        it('should have OK button', () => {
            const okBtn = document.querySelector('[data-testid="alert-modal-ok"]');
            expect(okBtn).toBeTruthy();
        });
    });

    describe('Show/Hide', () => {
        it('should show modal with message', () => {
            modal.show('Test message');
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('flex');
            
            const messageEl = document.querySelector('.alert-modal-message');
            expect(messageEl?.textContent).toBe('Test message');
        });

        it('should show modal with custom title', () => {
            modal.show('Test message', 'Custom Title');
            
            const titleEl = document.querySelector('.alert-modal-title');
            expect(titleEl?.textContent).toBe('Custom Title');
        });

        it('should hide modal', () => {
            modal.show('Test message');
            modal.hide();
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });

        it('should apply correct type class', () => {
            modal.show('Error message', 'Error', 'error');
            
            const modalEl = document.querySelector('.alert-modal');
            expect(modalEl?.classList.contains('alert-modal-error')).toBe(true);
        });

        it('should support info type', () => {
            modal.show('Info message', 'Info', 'info');
            const modalEl = document.querySelector('.alert-modal');
            expect(modalEl?.classList.contains('alert-modal-info')).toBe(true);
        });

        it('should support success type', () => {
            modal.show('Success message', 'Success', 'success');
            const modalEl = document.querySelector('.alert-modal');
            expect(modalEl?.classList.contains('alert-modal-success')).toBe(true);
        });

        it('should support warning type', () => {
            modal.show('Warning message', 'Warning', 'warning');
            const modalEl = document.querySelector('.alert-modal');
            expect(modalEl?.classList.contains('alert-modal-warning')).toBe(true);
        });
    });

    describe('Event Handling', () => {
        it('should close on OK button click', () => {
            modal.show('Test message');
            
            const okBtn = document.querySelector('[data-testid="alert-modal-ok"]') as HTMLElement;
            okBtn.click();
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });

        it('should close on close button click', () => {
            modal.show('Test message');
            
            const closeBtn = document.querySelector('[data-testid="alert-modal-close"]') as HTMLElement;
            closeBtn.click();
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });

        it('should close on overlay click', () => {
            modal.show('Test message');
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            overlay.click();
            
            expect(overlay.style.display).toBe('none');
        });

        it('should not close when clicking modal content', () => {
            modal.show('Test message');
            
            const modalEl = document.querySelector('.alert-modal') as HTMLElement;
            modalEl.click();
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('flex');
        });

        it('should close on Escape key', () => {
            modal.show('Test message');
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });

        it('should not close on other keys', () => {
            modal.show('Test message');
            
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            document.dispatchEvent(enterEvent);
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('flex');
        });

        it('should call onClose callback', () => {
            const onClose = vi.fn();
            modal.show('Test message', 'Title', 'info', onClose);
            
            const okBtn = document.querySelector('[data-testid="alert-modal-ok"]') as HTMLElement;
            okBtn.click();
            
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should only call onClose once', () => {
            const onClose = vi.fn();
            modal.show('Test message', 'Title', 'info', onClose);
            
            const okBtn = document.querySelector('[data-testid="alert-modal-ok"]') as HTMLElement;
            okBtn.click();
            okBtn.click(); // Second click should not trigger callback again
            
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cleanup', () => {
        it('should cleanup on destroy', () => {
            modal.show('Test message');
            modal.destroy();
            
            const overlay = document.querySelector('.alert-modal-overlay');
            expect(overlay).toBeNull();
        });

        it('should handle multiple show/hide cycles', () => {
            modal.show('Message 1');
            modal.hide();
            modal.show('Message 2');
            modal.hide();
            
            const overlay = document.querySelector('.alert-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });
    });
});

