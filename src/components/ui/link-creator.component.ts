/**
 * Link Creator Component
 * Create links with flow selection for multi-brand support
 */

import { Component, signal, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AVAILABLE_FLOWS, FlowConfig } from '../../services/flows.service';

interface LinkSettings {
    flow: string;
    name: string;
    expiresIn: string;
    maxSessions: number;
    redirectUrl: string;
    steps: string[];
}

@Component({
    selector: 'app-link-creator',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="link-creator">
            <div class="creator-header">
                <h3>Create New Link</h3>
                <button class="close-btn" (click)="onClose()">×</button>
            </div>

            <div class="creator-body">
                <!-- Flow Selection -->
                <div class="form-section">
                    <label class="form-label">Select Flow</label>
                    <div class="flow-picker">
                        @for (flow of enabledFlows(); track flow.id) {
                            <button 
                                class="flow-option"
                                [class.selected]="settings.flow === flow.id"
                                [style.--brand-color]="flow.color"
                                (click)="selectFlow(flow)"
                            >
                                <span class="flow-icon">{{ flow.icon }}</span>
                                <span class="flow-name">{{ flow.name }}</span>
                            </button>
                        }
                    </div>
                </div>

                <!-- Link Name -->
                <div class="form-group">
                    <label class="form-label">Link Name</label>
                    <input 
                        type="text" 
                        class="form-input"
                        placeholder="e.g., Campaign Jan 2026"
                        [(ngModel)]="settings.name"
                    />
                </div>

                <!-- Expiration -->
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Expires In</label>
                        <select class="form-select" [(ngModel)]="settings.expiresIn">
                            <option value="1h">1 Hour</option>
                            <option value="24h">24 Hours</option>
                            <option value="7d">7 Days</option>
                            <option value="30d">30 Days</option>
                            <option value="never">Never</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Max Sessions</label>
                        <input 
                            type="number" 
                            class="form-input"
                            placeholder="Unlimited"
                            [(ngModel)]="settings.maxSessions"
                        />
                    </div>
                </div>

                <!-- Steps Selection -->
                <div class="form-section" *ngIf="selectedFlow()">
                    <label class="form-label">Include Steps</label>
                    <div class="steps-list">
                        @for (step of selectedFlow()?.steps; track step.id) {
                            <label class="step-checkbox">
                                <input 
                                    type="checkbox"
                                    [checked]="settings.steps.includes(step.id)"
                                    [disabled]="step.required"
                                    (change)="toggleStep(step.id)"
                                />
                                <span class="checkbox-custom"></span>
                                <span class="step-name">{{ step.name }}</span>
                                <span class="step-required" *ngIf="step.required">Required</span>
                            </label>
                        }
                    </div>
                </div>

                <!-- Redirect URL -->
                <div class="form-group">
                    <label class="form-label">Redirect URL (Optional)</label>
                    <input 
                        type="url" 
                        class="form-input"
                        placeholder="https://..."
                        [(ngModel)]="settings.redirectUrl"
                    />
                </div>
            </div>

            <div class="creator-footer">
                <button class="btn-secondary" (click)="onClose()">Cancel</button>
                <button 
                    class="btn-primary" 
                    [disabled]="!isValid()"
                    (click)="createLink()"
                >
                    <span>⚡</span> Create Link
                </button>
            </div>
        </div>
    `,
    styles: [`
        .link-creator {
            background: var(--bg-secondary, #12121a);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: var(--radius-xl, 16px);
            width: 100%;
            max-width: 520px;
            overflow: hidden;
        }

        .creator-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-default, #2e2e3a);
        }

        .creator-header h3 {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary, #f8fafc);
            margin: 0;
        }

        .close-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-tertiary, #1a1a24);
            border: none;
            border-radius: 6px;
            color: var(--text-muted, #64748b);
            font-size: 1.25rem;
            cursor: pointer;
        }

        .close-btn:hover {
            background: var(--bg-hover, #2a2a38);
            color: var(--text-primary, #f8fafc);
        }

        .creator-body {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .form-section {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }

        .form-label {
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--text-secondary, #cbd5e1);
        }

        .form-input, .form-select {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            color: var(--text-primary, #f8fafc);
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 8px;
        }

        .form-input::placeholder {
            color: var(--text-dimmed, #475569);
        }

        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: var(--accent-primary, #6366f1);
        }

        .flow-picker {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 0.5rem;
        }

        .flow-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 0.5rem;
            background: var(--bg-tertiary, #1a1a24);
            border: 2px solid var(--border-default, #2e2e3a);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .flow-option:hover {
            border-color: var(--border-hover, #3e3e4a);
        }

        .flow-option.selected {
            border-color: var(--brand-color, var(--accent-primary));
            background: rgba(99, 102, 241, 0.1);
        }

        .flow-icon {
            font-size: 1.5rem;
        }

        .flow-name {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-secondary, #cbd5e1);
        }

        .steps-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .step-checkbox {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            background: var(--bg-tertiary, #1a1a24);
            border-radius: 8px;
            cursor: pointer;
        }

        .step-checkbox input {
            display: none;
        }

        .checkbox-custom {
            width: 18px;
            height: 18px;
            border: 2px solid var(--border-default, #2e2e3a);
            border-radius: 4px;
            transition: all 0.15s ease;
        }

        .step-checkbox input:checked + .checkbox-custom {
            background: var(--accent-primary, #6366f1);
            border-color: var(--accent-primary, #6366f1);
        }

        .step-checkbox input:checked + .checkbox-custom::after {
            content: '✓';
            display: block;
            color: white;
            font-size: 0.75rem;
            text-align: center;
        }

        .step-name {
            flex: 1;
            font-size: 0.875rem;
            color: var(--text-secondary, #cbd5e1);
        }

        .step-required {
            font-size: 0.7rem;
            padding: 0.125rem 0.5rem;
            background: rgba(99, 102, 241, 0.15);
            color: var(--accent-primary, #6366f1);
            border-radius: 4px;
        }

        .creator-footer {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            padding: 1.25rem 1.5rem;
            border-top: 1px solid var(--border-default, #2e2e3a);
        }

        .btn-secondary, .btn-primary {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-secondary {
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            color: var(--text-secondary, #cbd5e1);
        }

        .btn-secondary:hover {
            background: var(--bg-hover, #2a2a38);
        }

        .btn-primary {
            background: var(--accent-primary, #6366f1);
            border: none;
            color: white;
        }

        .btn-primary:hover {
            background: var(--accent-primary-hover, #818cf8);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `]
})
export class LinkCreatorComponent {
    @Output() created = new EventEmitter<LinkSettings>();
    @Output() closed = new EventEmitter<void>();

    settings: LinkSettings = {
        flow: '',
        name: '',
        expiresIn: '24h',
        maxSessions: 0,
        redirectUrl: '',
        steps: []
    };

    selectedFlow = signal<FlowConfig | null>(null);

    enabledFlows = signal<FlowConfig[]>(() => {
        const savedIds = localStorage.getItem('enabledFlows');
        const enabledIds = savedIds ? JSON.parse(savedIds) : ['paypal'];
        return AVAILABLE_FLOWS.filter(f => enabledIds.includes(f.id));
    });

    selectFlow(flow: FlowConfig) {
        this.settings.flow = flow.id;
        this.selectedFlow.set(flow);

        // Auto-include required steps
        this.settings.steps = flow.steps
            .filter(s => s.required)
            .map(s => s.id);
    }

    toggleStep(stepId: string) {
        const flow = this.selectedFlow();
        if (!flow) return;

        const step = flow.steps.find(s => s.id === stepId);
        if (step?.required) return; // Can't toggle required steps

        const idx = this.settings.steps.indexOf(stepId);
        if (idx === -1) {
            this.settings.steps.push(stepId);
        } else {
            this.settings.steps.splice(idx, 1);
        }
    }

    isValid(): boolean {
        return !!this.settings.flow && this.settings.steps.length > 0;
    }

    createLink() {
        if (this.isValid()) {
            this.created.emit(this.settings);
        }
    }

    onClose() {
        this.closed.emit();
    }
}
