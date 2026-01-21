import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface AdminStats {
    activeSessions: number;
    totalSessions: number;
    verifiedSessions: number;
    totalLinks: number;
    successRate: number;
}

@Injectable({
    providedIn: 'root'
})
export class StatsService {
    private auth = inject(AuthService);

    readonly stats = signal<AdminStats>({
        activeSessions: 0,
        totalSessions: 0,
        verifiedSessions: 0,
        totalLinks: 0,
        successRate: 0
    });

    readonly isLoading = signal<boolean>(false);

    async fetchStats() {
        if (!this.auth.isAuthenticated()) return;

        this.isLoading.set(true);
        try {
            const token = this.auth.token();
            const res = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                this.stats.set(data);
            } else {
                console.error('[Stats] API denied:', res.status);
            }
        } catch (e) {
            console.error('[Stats] Fetch failed:', e);
        } finally {
            this.isLoading.set(false);
        }
    }
}
