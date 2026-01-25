import { Injectable } from '@angular/core'; // Not strictly Angular, but following pattern
// This is a server-side service, usually. Ideally distinct from Angular services.
// Since we are in a monorepo structure, server services go in server/services.

export class ProxyService {
    // Mock proxy list
    private static proxies = [
        'http://user:pass@1.2.3.4:8080',
        'http://user:pass@5.6.7.8:8080',
        'http://user:pass@9.10.11.12:8080'
    ];

    private static sessionProxies: Map<string, string> = new Map();

    /**
     * Get a proxy for a specific session (Sticky)
     */
    static getProxyForSession(sessionId: string, countryCode?: string): string {
        if (this.sessionProxies.has(sessionId)) {
            return this.sessionProxies.get(sessionId)!;
        }

        // In real impl, select based on countryCode from a detailed pool
        const randomProxy = this.proxies[Math.floor(Math.random() * this.proxies.length)];
        this.sessionProxies.set(sessionId, randomProxy);
        return randomProxy;
    }

    /**
     * Rotate proxy for a session (Force change)
     */
    static rotateProxy(sessionId: string): string {
        const current = this.sessionProxies.get(sessionId);
        let newProxy = current;
        while (newProxy === current && this.proxies.length > 1) {
            newProxy = this.proxies[Math.floor(Math.random() * this.proxies.length)];
        }
        this.sessionProxies.set(sessionId, newProxy!);
        return newProxy!;
    }
}
