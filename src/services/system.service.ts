import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SystemMetrics {
    process: {
        uptime: number;
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: NodeJS.CpuUsage;
    };
    os: {
        totalMem: number;
        freeMem: number;
        loadAvg: number[];
        uptime: number;
    };
}

export interface AuditLog {
    id: number;
    timestamp: string; // ISO string
    actor: string;
    action: string;
    details: string;
}

export interface AuditLogResponse {
    logs: AuditLog[];
    total: number;
}

@Injectable({
    providedIn: 'root'
})
export class SystemService {
    private http = inject(HttpClient);
    private apiUrl = '/api/admin/system';

    getMetrics(): Observable<SystemMetrics> {
        return this.http.get<SystemMetrics>(`${this.apiUrl}/metrics`);
    }

    getAuditLogs(limit: number = 50, offset: number = 0): Observable<AuditLogResponse> {
        return this.http.get<AuditLogResponse>(`${this.apiUrl}/audit-logs`, {
            params: {
                limit: limit.toString(),
                offset: offset.toString()
            }
        });
    }

    clearCache(): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/cache/clear`, {});
    }

    triggerBackup(): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/backup`, {});
    }

    restoreBackup(backupId: string): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.apiUrl}/restore`, { backupId });
    }
}
