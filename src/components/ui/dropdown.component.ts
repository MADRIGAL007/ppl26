/**
 * Dropdown Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md - Searchable, multi-select dropdown
 *
 * Features: single/multi-select, search, keyboard navigation, custom options
 */

import {
    Component, input, output, signal, computed, forwardRef,
    ChangeDetectionStrategy, ElementRef, inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface DropdownOption {
    value: string | number;
    label: string;
    disabled?: boolean;
    icon?: string;
    group?: string;
}

@Component({
    selector: 'ui-dropdown',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => DropdownComponent),
            multi: true
        }
    ],
    template: `
        <div class="dropdown" [class.dropdown-open]="isOpen()">
            <!-- Label -->
            @if (label()) {
                <label class="dropdown-label">
                    {{ label() }}
                    @if (required()) {
                        <span class="dropdown-required">*</span>
                    }
                </label>
            }

            <!-- Trigger -->
            <button
                type="button"
                class="dropdown-trigger"
                [class]="triggerClasses()"
                [disabled]="disabled()"
                [attr.aria-expanded]="isOpen()"
                [attr.aria-haspopup]="'listbox'"
                (click)="toggle()"
                (keydown)="handleTriggerKeydown($event)"
            >
                <span class="dropdown-value">
                    @if (selectedLabel()) {
                        {{ selectedLabel() }}
                    } @else {
                        <span class="dropdown-placeholder">{{ placeholder() }}</span>
                    }
                </span>
                <svg class="dropdown-arrow" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </button>

            <!-- Dropdown Panel -->
            @if (isOpen()) {
                <div class="dropdown-panel animate-fade-in">
                    <!-- Search -->
                    @if (searchable()) {
                        <div class="dropdown-search">
                            <input
                                type="text"
                                class="dropdown-search-input"
                                [placeholder]="searchPlaceholder()"
                                [ngModel]="searchQuery()"
                                (ngModelChange)="onSearchChange($event)"
                                (keydown)="handleSearchKeydown($event)"
                            />
                        </div>
                    }

                    <!-- Options List -->
                    <ul
                        class="dropdown-list"
                        role="listbox"
                        [attr.aria-multiselectable]="multiple()"
                    >
                        @for (option of filteredOptions(); track option.value) {
                            <li
                                class="dropdown-option"
                                [class.dropdown-option-selected]="isSelected(option.value)"
                                [class.dropdown-option-focused]="focusedIndex() === $index"
                                [class.dropdown-option-disabled]="option.disabled"
                                role="option"
                                [attr.aria-selected]="isSelected(option.value)"
                                (click)="selectOption(option)"
                                (mouseenter)="focusedIndex.set($index)"
                            >
                                @if (multiple()) {
                                    <span class="dropdown-checkbox">
                                        @if (isSelected(option.value)) {
                                            <svg viewBox="0 0 20 20" fill="currentColor">
                                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                                            </svg>
                                        }
                                    </span>
                                }
                                @if (option.icon) {
                                    <span class="dropdown-option-icon" [innerHTML]="option.icon"></span>
                                }
                                <span class="dropdown-option-label">{{ option.label }}</span>
                            </li>
                        } @empty {
                            <li class="dropdown-empty">No options found</li>
                        }
                    </ul>
                </div>
            }

            <!-- Error Message -->
            @if (error()) {
                <div class="dropdown-error">{{ error() }}</div>
            }
        </div>
    `,
    styles: [`
        .dropdown {
            position: relative;
            width: 100%;
        }

        /* Label */
        .dropdown-label {
            display: block;
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            color: var(--text-primary, #111827);
            margin-bottom: var(--space-1, 4px);
        }

        .dropdown-required {
            color: var(--error, #ef4444);
        }

        /* Trigger */
        .dropdown-trigger {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 10px 14px;
            background: var(--surface, white);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-lg, 8px);
            font-size: var(--text-sm, 14px);
            color: var(--text-primary, #111827);
            cursor: pointer;
            transition: all var(--duration-fast, 100ms) var(--ease-out);
        }

        .dropdown-trigger:hover:not(:disabled) {
            border-color: var(--border-hover, #d1d5db);
        }

        .dropdown-trigger:focus {
            outline: none;
            border-color: var(--brand-primary, #6366f1);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .dropdown-trigger:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            background: var(--bg-secondary, #f9fafb);
        }

        .dropdown-trigger-error {
            border-color: var(--error, #ef4444);
        }

        .dropdown-value {
            flex: 1;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .dropdown-placeholder {
            color: var(--text-muted, #9ca3af);
        }

        .dropdown-arrow {
            width: 20px;
            height: 20px;
            color: var(--text-muted, #9ca3af);
            transition: transform var(--duration-fast, 100ms);
        }

        .dropdown-open .dropdown-arrow {
            transform: rotate(180deg);
        }

        /* Panel */
        .dropdown-panel {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: var(--space-1, 4px);
            background: var(--surface, white);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-lg, 8px);
            box-shadow: var(--shadow-lg);
            z-index: var(--z-dropdown, 1000);
            max-height: 280px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* Search */
        .dropdown-search {
            padding: var(--space-2, 8px);
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        .dropdown-search-input {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-md, 6px);
            font-size: var(--text-sm, 14px);
            outline: none;
        }

        .dropdown-search-input:focus {
            border-color: var(--brand-primary, #6366f1);
        }

        /* List */
        .dropdown-list {
            list-style: none;
            margin: 0;
            padding: var(--space-1, 4px);
            overflow-y: auto;
            flex: 1;
        }

        /* Option */
        .dropdown-option {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
            padding: 8px 10px;
            font-size: var(--text-sm, 14px);
            color: var(--text-primary, #111827);
            border-radius: var(--radius-md, 6px);
            cursor: pointer;
            transition: background var(--duration-fast, 100ms);
        }

        .dropdown-option:hover:not(.dropdown-option-disabled),
        .dropdown-option-focused:not(.dropdown-option-disabled) {
            background: var(--bg-secondary, #f9fafb);
        }

        .dropdown-option-selected {
            background: rgba(99, 102, 241, 0.1);
            color: var(--brand-primary, #6366f1);
        }

        .dropdown-option-disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Checkbox for multi-select */
        .dropdown-checkbox {
            width: 16px;
            height: 16px;
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-sm, 4px);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .dropdown-option-selected .dropdown-checkbox {
            background: var(--brand-primary, #6366f1);
            border-color: var(--brand-primary, #6366f1);
        }

        .dropdown-checkbox svg {
            width: 12px;
            height: 12px;
            color: white;
        }

        .dropdown-option-icon {
            display: flex;
            align-items: center;
        }

        .dropdown-option-icon :deep(svg) {
            width: 16px;
            height: 16px;
        }

        /* Empty state */
        .dropdown-empty {
            padding: var(--space-4, 16px);
            text-align: center;
            color: var(--text-muted, #9ca3af);
            font-size: var(--text-sm, 14px);
        }

        /* Error */
        .dropdown-error {
            margin-top: var(--space-1, 4px);
            font-size: var(--text-sm, 14px);
            color: var(--error, #ef4444);
        }

        /* Animation */
        .animate-fade-in {
            animation: fadeIn 0.15s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class DropdownComponent implements ControlValueAccessor {
    private elementRef = inject(ElementRef);

    // Inputs
    options = input.required<DropdownOption[]>();
    label = input<string>('');
    placeholder = input<string>('Select an option');
    searchPlaceholder = input<string>('Search...');
    multiple = input<boolean>(false);
    searchable = input<boolean>(false);
    disabled = input<boolean>(false);
    required = input<boolean>(false);
    error = input<string>('');

    // State
    isOpen = signal<boolean>(false);
    searchQuery = signal<string>('');
    focusedIndex = signal<number>(-1);
    selectedValues = signal<(string | number)[]>([]);

    // Output
    selectionChange = output<(string | number) | (string | number)[]>();

    // ControlValueAccessor
    private onChange: (value: unknown) => void = () => { };
    private onTouched: () => void = () => { };

    // Computed
    filteredOptions = computed(() => {
        const query = this.searchQuery().toLowerCase();
        if (!query) return this.options();

        return this.options().filter(opt =>
            opt.label.toLowerCase().includes(query)
        );
    });

    selectedLabel = computed(() => {
        const selected = this.selectedValues();
        if (selected.length === 0) return '';

        if (this.multiple()) {
            return selected.length === 1
                ? this.options().find(o => o.value === selected[0])?.label || ''
                : `${selected.length} selected`;
        }

        return this.options().find(o => o.value === selected[0])?.label || '';
    });

    triggerClasses = computed(() => {
        const classes: string[] = [];
        if (this.error()) classes.push('dropdown-trigger-error');
        return classes.join(' ');
    });

    // Methods
    toggle(): void {
        if (this.disabled()) return;
        this.isOpen.update(v => !v);
        if (this.isOpen()) {
            this.focusedIndex.set(0);
        }
    }

    selectOption(option: DropdownOption): void {
        if (option.disabled) return;

        if (this.multiple()) {
            this.selectedValues.update(values => {
                if (values.includes(option.value)) {
                    return values.filter(v => v !== option.value);
                }
                return [...values, option.value];
            });
        } else {
            this.selectedValues.set([option.value]);
            this.isOpen.set(false);
        }

        const value = this.multiple()
            ? this.selectedValues()
            : this.selectedValues()[0];

        this.onChange(value);
        this.selectionChange.emit(value);
    }

    isSelected(value: string | number): boolean {
        return this.selectedValues().includes(value);
    }

    onSearchChange(query: string): void {
        this.searchQuery.set(query);
        this.focusedIndex.set(0);
    }

    handleTriggerKeydown(event: KeyboardEvent): void {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.toggle();
                break;
            case 'Escape':
                this.isOpen.set(false);
                break;
        }
    }

    handleSearchKeydown(event: KeyboardEvent): void {
        const options = this.filteredOptions();

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.focusedIndex.update(i => Math.min(i + 1, options.length - 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.focusedIndex.update(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                event.preventDefault();
                const focused = options[this.focusedIndex()];
                if (focused) this.selectOption(focused);
                break;
            case 'Escape':
                this.isOpen.set(false);
                break;
        }
    }

    @HostListener('document:click', ['$event'])
    onClickOutside(event: MouseEvent): void {
        if (!this.elementRef.nativeElement.contains(event.target)) {
            this.isOpen.set(false);
        }
    }

    // ControlValueAccessor
    writeValue(value: unknown): void {
        if (Array.isArray(value)) {
            this.selectedValues.set(value);
        } else if (value !== null && value !== undefined) {
            this.selectedValues.set([value as string | number]);
        } else {
            this.selectedValues.set([]);
        }
    }

    registerOnChange(fn: (value: unknown) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        // Handled via input
    }
}
