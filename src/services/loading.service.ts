import { Injectable, signal, computed } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    // Using a counter to handle multiple parallel requests
    private requestCount = signal(0);

    readonly isLoading = computed(() => this.requestCount() > 0);

    show() {
        this.requestCount.update(count => count + 1);
    }

    hide() {
        this.requestCount.update(count => Math.max(0, count - 1));
    }
}
