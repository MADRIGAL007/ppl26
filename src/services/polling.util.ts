export class PollingScheduler {
    private timer: any;
    private currentInterval: number;
    private isRunning = false;
    private visibilityHandler: (() => void) | null = null;

    constructor(
        private baseIntervalMs: number,
        private maxIntervalMs: number,
        private task: () => Promise<boolean> | boolean
    ) {
        this.currentInterval = baseIntervalMs;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.runLoop();
        this.setupVisibilityListener();
    }

    stop() {
        this.isRunning = false;
        if (this.timer) clearTimeout(this.timer);
        this.removeVisibilityListener();
    }

    private async runLoop() {
        if (!this.isRunning) return;

        this.timer = setTimeout(async () => {
            if (!this.isRunning) return;

            // Check visibility
            if (typeof document !== 'undefined' && document.hidden) {
                this.runLoopWithDelay(10000);
                return;
            }

            try {
                const changed = await this.task();
                if (changed) {
                    this.resetBackoff();
                } else {
                    this.increaseBackoff();
                }
            } catch (e) {
                this.increaseBackoff();
            }

            this.runLoop();
        }, this.currentInterval);
    }

    private runLoopWithDelay(delay: number) {
        this.timer = setTimeout(() => {
             this.runLoop();
        }, delay);
    }

    private resetBackoff() {
        this.currentInterval = this.baseIntervalMs;
    }

    private increaseBackoff() {
        this.currentInterval = Math.min(
            Math.floor(this.currentInterval * 1.5),
            this.maxIntervalMs
        );
    }

    private setupVisibilityListener() {
        if (typeof document !== 'undefined') {
            this.visibilityHandler = () => {
                if (!document.hidden && this.isRunning) {
                    this.resetBackoff();
                    if (this.timer) clearTimeout(this.timer);
                    this.timer = setTimeout(async () => {
                         try { await this.task(); } catch {}
                         this.runLoop();
                    }, 0);
                }
            };
            document.addEventListener('visibilitychange', this.visibilityHandler);
        }
    }

    private removeVisibilityListener() {
        if (typeof document !== 'undefined' && this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
    }
}
