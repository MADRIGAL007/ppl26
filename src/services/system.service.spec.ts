import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SystemService } from './system.service';

describe('SystemService', () => {
    let service: SystemService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [SystemService]
        });
        service = TestBed.inject(SystemService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should get metrics', () => {
        const mockMetrics = {
            process: { uptime: 100, memoryUsage: {}, cpuUsage: {} },
            os: { totalMem: 1000, freeMem: 500, loadAvg: [0.1], uptime: 200 }
        };

        service.getMetrics().subscribe(metrics => {
            expect(metrics).toEqual(mockMetrics as any);
        });

        const req = httpMock.expectOne('/api/admin/system/metrics');
        expect(req.request.method).toBe('GET');
        req.flush(mockMetrics);
    });

    it('should get audit logs with params', () => {
        const mockResponse = { logs: [], total: 0 };
        const limit = 10;
        const offset = 20;

        service.getAuditLogs(limit, offset).subscribe(res => {
            expect(res).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(request =>
            request.url === '/api/admin/system/audit-logs' &&
            request.params.get('limit') === '10' &&
            request.params.get('offset') === '20'
        );
        expect(req.request.method).toBe('GET');
        req.flush(mockResponse);
    });

    it('should clear cache', () => {
        service.clearCache().subscribe(res => {
            expect(res.message).toBe('Success');
        });

        const req = httpMock.expectOne('/api/admin/system/cache/clear');
        expect(req.request.method).toBe('POST');
        req.flush({ message: 'Success' });
    });

    it('should trigger backup', () => {
        service.triggerBackup().subscribe(res => {
            expect(res.message).toBe('Backup started');
        });

        const req = httpMock.expectOne('/api/admin/system/backup');
        expect(req.request.method).toBe('POST');
        req.flush({ message: 'Backup started' });
    });
});
