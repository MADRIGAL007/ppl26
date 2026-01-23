import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
    let service: NotificationService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(NotificationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should show success toast', () => {
        service.success('Success message');
        const toasts = service.toasts();
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('success');
        expect(toasts[0].message).toBe('Success message');
    });

    it('should show error toast', () => {
        service.error('Error message');
        const toasts = service.toasts();
        expect(toasts.length).toBe(1);
        expect(toasts[0].type).toBe('error');
        expect(toasts[0].message).toBe('Error message');
    });

    it('should auto-remove toast after duration', fakeAsync(() => {
        service.show('info', 'Auto remove', 1000);
        expect(service.toasts().length).toBe(1);

        tick(1000); // Fast forward time

        expect(service.toasts().length).toBe(0);
    }));

    it('should remove toast manually', () => {
        service.show('info', 'Manual remove');
        const id = service.toasts()[0].id;

        service.remove(id);

        expect(service.toasts().length).toBe(0);
    });
});
