import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface AdminLink {
    code: string;
    adminId: string;
    clicks: number;
    sessions_started: number;
    sessions_verified: number;
    created_at: number;
    flow_config: any;
}

@Injectable({
    providedIn: 'root'
})
export class LinksService {
    private auth = inject(AuthService);

    readonly links = signal<AdminLink[]>([]);
    readonly isLoading = signal<boolean>(false);

    async fetchLinks() {
        if (!this.auth.isAuthenticated()) return;
        this.isLoading.set(true);
        try {
            const token = this.auth.token();
            const res = await fetch('/api/admin/links', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.links.set(data);
            }
        } catch (e) {
            console.error('[Links] Fetch failed', e);
        } finally {
            this.isLoading.set(false);
        }
    }

    async createLink(payload: { code: string; flowConfig?: any; themeConfig?: any }): Promise<boolean> {
        if (!this.auth.isAuthenticated()) return false;
        try {
            const token = this.auth.token();
            const res = await fetch('/api/admin/links', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                await this.fetchLinks(); // Refresh
                return true;
            }
        } catch (e) {
            console.error('[Links] Create failed', e);
        }
        return false;
    }

    async deleteLink(code: string) {
        if (!this.auth.isAuthenticated()) return;
        if (!confirm('Start deletion?')) return;

        try {
            const token = this.auth.token();
            await fetch(`/api/admin/links/${code}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.links.update(list => list.filter(l => l.code !== code));
        } catch (e) {
            console.error('[Links] Delete failed', e);
        }
    }
}
