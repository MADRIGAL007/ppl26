import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
    let service: LoadingService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LoadingService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should start with loading false', () => {
        expect(service.isLoading()).toBe(false);
    });

    it('should set loading to true when show is called', () => {
        service.show();
        expect(service.isLoading()).toBe(true);
    });

    it('should set loading to false when hide is called', () => {
        service.show();
        service.hide();
        expect(service.isLoading()).toBe(false);
    });

    it('should handle concurrent requests correctly', () => {
        service.show(); // 1
        service.show(); // 2
        expect(service.isLoading()).toBe(true);

        service.hide(); // 1
        expect(service.isLoading()).toBe(true); // Still loading

        service.hide(); // 0
        expect(service.isLoading()).toBe(false);
    });
});
