import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface User {
    id: string;
    username: string;
    role: 'admin' | 'hypervisor';
    uniqueCode: string;
    maxLinks: number;
    maxSessions?: number;
    allowedFlows?: string; // JSON string
    credits?: number;
    subscriptionTier?: 'free' | 'pro' | 'enterprise';
    isSuspended: boolean;
    settings?: any;
    password?: string; // For creation/update
}

@Injectable({
    providedIn: 'root'
})
export class UsersService {
    private auth = inject(AuthService);

    readonly users = signal<User[]>([]);
    readonly isLoading = signal<boolean>(false);

    async fetchUsers() {
        if (!this.auth.isAuthenticated()) return;
        this.isLoading.set(true);

        try {
            const token = this.auth.token();
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.users.set(data);
            }
        } catch (e) {
            console.error('[Users] Fetch failed', e);
        } finally {
            this.isLoading.set(false);
        }
    }

    async createUser(user: Partial<User>) {
        return this.request('/api/admin/users', 'POST', user);
    }

    async updateUser(id: string, updates: Partial<User>) {
        return this.request(`/api/admin/users/${id}`, 'PUT', updates);
    }

    async deleteUser(id: string) {
        return this.request(`/api/admin/users/${id}`, 'DELETE', {});
    }

    private async request(url: string, method: string, body: any) {
        try {
            const token = this.auth.token();
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(body) : undefined
            });

            if (res.ok) {
                await this.fetchUsers(); // Refresh list
                return true;
            }
        } catch (e) {
            console.error(`[Users] ${method} failed`, e);
        }
        return false;
    }
}
