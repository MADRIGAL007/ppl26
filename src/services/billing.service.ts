
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface License {
    id: string;
    flowId: string;
    status: 'pending' | 'active' | 'expired';
    expiresAt: number;
}

import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClientBillingService {
    http = inject(HttpClient);
    licenses = signal<License[]>([]);

    async fetchMyLicenses() {
        const data = await firstValueFrom(this.http.get<License[]>(`${environment.apiUrl}/admin/billing/licenses`));
        if (data) this.licenses.set(data);
    }

    async purchase(flowId: string, txHash: string) {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/admin/billing/purchase`, { flowId, txHash }));
        await this.fetchMyLicenses();
    }

    // Admin / Hypervisor Methods
    async getQueue() {
        return firstValueFrom(this.http.get<License[]>(`${environment.apiUrl}/admin/billing/queue`));
    }

    async verifyLicense(licenseId: string, approve: boolean) {
        await firstValueFrom(this.http.post(`${environment.apiUrl}/admin/billing/verify`, { licenseId, approve }));
    }
}
