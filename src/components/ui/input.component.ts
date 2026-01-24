/**
 * Input Component
 * Design System UI Component - Phase 11
 * Per phase11_quality_standards.md Section 1 - Error Messages & Validation
 *
 * Features: label, placeholder, validation states (error, success), icons, password toggle
 * States: default, hover, focus, disabled, error, success
 */

import { Component, input, output, computed, signal, forwardRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date';
export type InputSize = 'sm' | 'md' | 'lg';

@Component({
    selector: 'ui-input',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => InputComponent),
            multi: true
        }
    ],
    template: `
        <div class="input-wrapper" [class.input-disabled]="disabled()">
            <!-- Label -->
            @if (label()) {
                <label [for]="inputId()" class="input-label">
                    {{ label() }}
                    @if (required()) {
                        <span class="input-required" aria-hidden="true">*</span>
                    }
                </label>
            }

            <!-- Input Container -->
            <div
                class="input-container"
                [class]="containerClasses()"
            >
                <!-- Icon Left -->
                @if (iconLeft()) {
                    <span class="input-icon input-icon-left" aria-hidden="true">
                        <ng-content select="[slot=icon-left]"/>
                    </span>
                }

                <!-- Input Field -->
                <input
                    [id]="inputId()"
                    [type]="effectiveType()"
                    [name]="name()"
                    [placeholder]="placeholder()"
                    [disabled]="disabled()"
                    [readonly]="readonly()"
                    [required]="required()"
                    [autocomplete]="autocomplete()"
                    [attr.aria-invalid]="error() ? 'true' : null"
                    [attr.aria-describedby]="error() ? inputId() + '-error' : null"
                    [ngModel]="value()"
                    (ngModelChange)="onValueChange($event)"
                    (blur)="onBlur()"
                    (focus)="onFocus()"
                    class="input-field"
                    [class.font-mono]="isCode()"
                    [class.text-center]="isCode()"
                    [class.tracking-[0.5em]]="isCode()"
                    [class.font-bold]="isCode()"
                    [class.text-lg]="isCode()"
                />

                <!-- Password Toggle -->
                @if (type() === 'password') {
                    <button
                        type="button"
                        class="input-toggle"
                        (click)="togglePassword()"
                        [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    >
                        @if (showPassword()) {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                        } @else {
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        }
                    </button>
                }

                <!-- Icon Right (not password) -->
                @if (iconRight() && type() !== 'password') {
                    <span class="input-icon input-icon-right" aria-hidden="true">
                        <ng-content select="[slot=icon-right]"/>
                    </span>
                }

                <!-- Success Indicator -->
                @if (success() && !error()) {
                    <span class="input-success-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </span>
                }
            </div>

            <!-- Error Message -->
            @if (error()) {
                <div
                    [id]="inputId() + '-error'"
                    class="input-error"
                    role="alert"
                >
                    <svg class="input-error-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
                    </svg>
                    <span>{{ error() }}</span>
                </div>
            }

            <!-- Helper Text -->
            @if (hint() && !error()) {
                <p class="input-hint">{{ hint() }}</p>
            }
        </div>
    `,
    styles: [`
        .input-wrapper {
            width: 100%;
        }

        /* Label */
        .input-label {
            display: block;
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            color: var(--text-primary, #111827);
            margin-bottom: var(--space-1, 4px);
        }

        .input-required {
            color: var(--error, #ef4444);
            margin-left: 2px;
        }

        /* Container */
        .input-container {
            position: relative;
            display: flex;
            align-items: center;
            width: 100%;
            background: var(--surface, white);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-lg, 8px);
            transition: all var(--duration-fast, 100ms) var(--ease-out);
        }

        .input-container:hover:not(.input-error-state):not(.input-disabled-state) {
            border-color: var(--border-hover, #d1d5db);
        }

        .input-container:focus-within:not(.input-error-state) {
            border-color: var(--brand-primary, #6366f1);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        /* Sizes */
        .input-sm .input-field {
            padding: 6px 10px;
            font-size: var(--text-xs, 12px);
        }

        .input-md .input-field {
            padding: 10px 14px;
            font-size: var(--text-sm, 14px);
        }

        .input-lg .input-field {
            padding: 14px 18px;
            font-size: var(--text-base, 16px);
        }

        /* Input Field */
        .input-field {
            flex: 1;
            width: 100%;
            min-width: 0;
            background: transparent;
            border: none;
            outline: none;
            color: var(--text-primary, #111827);
            font-family: var(--font-sans);
            line-height: 1.5;
        }

        .input-field::placeholder {
            color: var(--text-muted, #9ca3af);
        }

        /* Icons */
        .input-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: var(--text-muted, #9ca3af);
        }

        .input-icon svg,
        .input-icon :deep(svg) {
            width: 18px;
            height: 18px;
        }

        .input-icon-left {
            padding-left: 12px;
        }

        .input-icon-right {
            padding-right: 12px;
        }

        /* Password Toggle */
        .input-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 12px;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-muted, #9ca3af);
            transition: color var(--duration-fast, 100ms);
        }

        .input-toggle:hover {
            color: var(--text-secondary, #6b7280);
        }

        .input-toggle svg {
            width: 18px;
            height: 18px;
        }

        /* Success Icon */
        .input-success-icon {
            display: flex;
            align-items: center;
            padding-right: 12px;
            color: var(--success, #10b981);
        }

        .input-success-icon svg {
            width: 18px;
            height: 18px;
        }

        /* Error State */
        .input-error-state {
            border-color: var(--error, #ef4444);
        }

        .input-error-state:focus-within {
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        /* Success State */
        .input-success-state {
            border-color: var(--success, #10b981);
        }

        .input-success-state:focus-within {
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        /* Disabled State */
        .input-disabled {
            opacity: 0.6;
            pointer-events: none;
        }

        .input-disabled-state {
            background: var(--bg-secondary, #f9fafb);
            cursor: not-allowed;
        }

        /* Error Message */
        .input-error {
            display: flex;
            align-items: center;
            gap: var(--space-1, 4px);
            margin-top: var(--space-1, 4px);
            font-size: var(--text-sm, 14px);
            color: var(--error, #ef4444);
        }

        .input-error-icon {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        /* Hint */
        .input-hint {
            margin-top: var(--space-1, 4px);
            font-size: var(--text-sm, 14px);
            color: var(--text-tertiary, #6b7280);
        }
    `]
})
export class InputComponent implements ControlValueAccessor {
    // Inputs using Angular signals
    label = input<string>('');
    name = input<string>('');
    type = input<InputType>('text');
    size = input<InputSize>('md');
    placeholder = input<string>('');
    hint = input<string>('');
    error = input<string>('');
    success = input<boolean>(false);
    disabled = input<boolean>(false);
    readonly = input<boolean>(false);
    required = input<boolean>(false);
    autocomplete = input<string>('off');
    iconLeft = input<boolean>(false);
    iconRight = input<boolean>(false);
    isCode = input<boolean>(false); // NEW: For OTP/Pin inputs

    // Internal state
    value = signal<string>('');
    showPassword = signal<boolean>(false);
    focused = signal<boolean>(false);

    // Unique ID
    inputId = computed(() => `input-${Math.random().toString(36).substring(2, 9)}`);

    // Effective type (for password toggle)
    effectiveType = computed(() => {
        if (this.type() === 'password' && this.showPassword()) {
            return 'text';
        }
        return this.type();
    });

    // Container classes
    containerClasses = computed(() => {
        const classes: string[] = [];

        classes.push(`input-${this.size()}`);

        if (this.error()) {
            classes.push('input-error-state');
        } else if (this.success()) {
            classes.push('input-success-state');
        }

        if (this.disabled()) {
            classes.push('input-disabled-state');
        }

        return classes.join(' ');
    });

    // ControlValueAccessor
    private onChange: (value: string) => void = () => { };
    private onTouched: () => void = () => { };

    writeValue(value: string): void {
        this.value.set(value || '');
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        // Handled via input
    }

    onValueChange(value: string): void {
        this.value.set(value);
        this.onChange(value);
    }

    onBlur(): void {
        this.focused.set(false);
        this.onTouched();
    }

    onFocus(): void {
        this.focused.set(true);
    }

    togglePassword(): void {
        this.showPassword.update(v => !v);
    }
}
