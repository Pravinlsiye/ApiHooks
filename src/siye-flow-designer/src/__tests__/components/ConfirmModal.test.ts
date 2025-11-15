import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfirmModal } from '../../components/ConfirmModal';

describe('ConfirmModal', () => {
    let modal: ConfirmModal;

    beforeEach(() => {
        modal = new ConfirmModal();
    });

    afterEach(() => {
        if (modal) {
            modal.destroy();
        }
    });

    describe('Initialization', () => {
        it('should create modal element', () => {
            const overlay = document.querySelector('.confirm-modal-overlay');
            expect(overlay).toBeTruthy();
        });

        it('should have modal structure', () => {
            const modalEl = document.querySelector('.confirm-modal');
            expect(modalEl).toBeTruthy();
            
            const header = modalEl!.querySelector('.confirm-modal-header');
            const body = modalEl!.querySelector('.confirm-modal-body');
            const footer = modalEl!.querySelector('.confirm-modal-footer');
            
            expect(header).toBeTruthy();
            expect(body).toBeTruthy();
            expect(footer).toBeTruthy();
        });

        it('should have cancel button', () => {
            const cancelBtn = document.querySelector('[data-testid="confirm-modal-cancel"]');
            expect(cancelBtn).toBeTruthy();
        });

        it('should have confirm button', () => {
            const confirmBtn = document.querySelector('[data-testid="confirm-modal-confirm"]');
            expect(confirmBtn).toBeTruthy();
        });
    });

    describe('Show/Hide', () => {
        it('should show modal with message', () => {
            modal.show('Are you sure?');
            
            const overlay = document.querySelector('.confirm-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('flex');
            
            const messageEl = document.querySelector('.confirm-modal-message');
            expect(messageEl?.textContent).toBe('Are you sure?');
        });

        it('should show modal with custom title', () => {
            modal.show('Are you sure?', 'Warning');
            
            const titleEl = document.querySelector('.confirm-modal-title');
            expect(titleEl?.textContent).toBe('Warning');
        });

        it('should show modal with custom button text', () => {
            modal.show('Delete item?', 'Confirm', 'Delete', 'Keep');
            
            const confirmBtn = document.querySelector('[data-testid="confirm-modal-confirm"]');
            const cancelBtn = document.querySelector('[data-testid="confirm-modal-cancel"]');
            
            expect(confirmBtn?.textContent).toBe('Delete');
            expect(cancelBtn?.textContent).toBe('Keep');
        });

        it('should hide modal', () => {
            modal.show('Are you sure?');
            modal.hide();
            
            const overlay = document.querySelector('.confirm-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });
    });

    describe('Event Handling', () => {
        it('should call onConfirm callback', () => {
            const onConfirm = vi.fn();
            modal.show('Are you sure?', 'Confirm', 'Confirm', 'Cancel', onConfirm);
            
            const confirmBtn = document.querySelector('[data-testid="confirm-modal-confirm"]') as HTMLElement;
            confirmBtn.click();
            
            expect(onConfirm).toHaveBeenCalledTimes(1);
        });

        it('should call onCancel callback', () => {
            const onCancel = vi.fn();
            modal.show('Are you sure?', 'Confirm', 'Confirm', 'Cancel', undefined, onCancel);
            
            const cancelBtn = document.querySelector('[data-testid="confirm-modal-cancel"]') as HTMLElement;
            cancelBtn.click();
            
            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        it('should close on cancel button click', () => {
            modal.show('Are you sure?');
            
            const cancelBtn = document.querySelector('[data-testid="confirm-modal-cancel"]') as HTMLElement;
            cancelBtn.click();
            
            const overlay = document.querySelector('.confirm-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });

        it('should close on confirm button click', () => {
            modal.show('Are you sure?');
            
            const confirmBtn = document.querySelector('[data-testid="confirm-modal-confirm"]') as HTMLElement;
            confirmBtn.click();
            
            const overlay = document.querySelector('.confirm-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });

        it('should close on overlay click', () => {
            modal.show('Are you sure?');
            
            const overlay = document.querySelector('.confirm-modal-overlay') as HTMLElement;
            overlay.click();
            
            expect(overlay.style.display).toBe('none');
        });

        it('should not close when clicking modal content', () => {
            modal.show('Are you sure?');
            
            const modalEl = document.querySelector('.confirm-modal') as HTMLElement;
            modalEl.click();
            
            const overlay = document.querySelector('.confirm-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('flex');
        });

        it('should close on Escape key', () => {
            modal.show('Are you sure?');
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            
            const overlay = document.querySelector('.confirm-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });

        it('should call onCancel when closing via Escape', () => {
            const onCancel = vi.fn();
            modal.show('Are you sure?', 'Confirm', 'Confirm', 'Cancel', undefined, onCancel);
            
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);
            
            expect(onCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cleanup', () => {
        it('should cleanup on destroy', () => {
            modal.show('Are you sure?');
            modal.destroy();
            
            const overlay = document.querySelector('.confirm-modal-overlay');
            expect(overlay).toBeNull();
        });

        it('should handle multiple show/hide cycles', () => {
            modal.show('Question 1?');
            modal.hide();
            modal.show('Question 2?');
            modal.hide();
            
            const overlay = document.querySelector('.confirm-modal-overlay') as HTMLElement;
            expect(overlay.style.display).toBe('none');
        });
    });
});

