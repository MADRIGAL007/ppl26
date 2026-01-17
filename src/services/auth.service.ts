import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
    id: string;
    username: string;
    role: 'hypervisor' | 'admin';
    uniqueCode?: string;
    settings?: any;
    telegramConfig?: any;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    readonly currentUser = signal<User | null>(null);
    readonly isAuthenticated = signal<boolean>(false);

    private readonly TOKEN_KEY = 'admin_token_v1';

    constructor(private router: Router) {
        // Hydrate from storage
        this.loadToken();
    }

    private loadToken() {
        if (typeof localStorage === 'undefined') return;

        const token = localStorage.getItem(this.TOKEN_KEY);
        if (token) {
            this.fetchMe(token).then(success => {
                if (!success) this.logout();
            });
        }
    }

    async login(username: string, password: string): Promise<boolean> {
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                this.setSession(data.token, data.user);
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    }

    async impersonate(userId: string): Promise<boolean> {
        try {
            const token = this.getToken();
            const res = await fetch(`/api/admin/impersonate/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                // We overwrite the token, effectively logging in as that user
                // To support "Back to Hypervisor", we might want to store the old token?
                // For simplicity now, we just swap. Hypervisor can just re-login or use incognito.
                // Or better: The prompt said "Impersonate", implying temporary access.
                // If I swap token, I lose Hypervisor privilege unless I stored it.
                // Let's swap for now to meet the "Login as that admin" requirement fully.

                // We need to fetch the user details for this new token
                await this.fetchMe(data.token);
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    }

    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.router.navigate(['/admin/login']);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    private setSession(token: string, user: User) {
        localStorage.setItem(this.TOKEN_KEY, token);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
    }

    private async fetchMe(token: string): Promise<boolean> {
        try {
            const res = await fetch('/api/admin/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                this.currentUser.set(user);
                this.isAuthenticated.set(true);
                // Also update localStorage if we are just verifying
                localStorage.setItem(this.TOKEN_KEY, token);
                return true;
            }
        } catch (e) { }
        return false;
    }
}
