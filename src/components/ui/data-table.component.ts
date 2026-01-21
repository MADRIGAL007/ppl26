/**
 * Data Table Component
 * Sortable, filterable table with pagination
 */

import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TableColumn<T = any> {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    render?: (row: T) => string;
}

export interface SortState {
    key: string;
    direction: 'asc' | 'desc';
}

@Component({
    selector: 'app-data-table',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="table-wrapper">
            <!-- Toolbar -->
            <div class="table-toolbar" *ngIf="showToolbar">
                <div class="table-search" *ngIf="showSearch">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input 
                        type="text" 
                        class="input"
                        placeholder="Search..."
                        [(ngModel)]="searchQuery"
                        (input)="onSearch()"
                    />
                </div>
                <div class="table-actions">
                    <ng-content select="[table-actions]"></ng-content>
                </div>
            </div>

            <!-- Table -->
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th *ngIf="selectable" class="table-checkbox-col">
                                <input 
                                    type="checkbox" 
                                    [checked]="allSelected()"
                                    [indeterminate]="someSelected() && !allSelected()"
                                    (change)="toggleAll()"
                                />
                            </th>
                            @for (col of columns; track col.key) {
                                <th 
                                    [style.width]="col.width"
                                    [style.textAlign]="col.align || 'left'"
                                    [class.sortable]="col.sortable"
                                    (click)="col.sortable && toggleSort(col.key)"
                                >
                                    <div class="th-content">
                                        {{ col.label }}
                                        <span class="sort-icon" *ngIf="col.sortable && sortState()?.key === col.key">
                                            {{ sortState()?.direction === 'asc' ? '↑' : '↓' }}
                                        </span>
                                    </div>
                                </th>
                            }
                        </tr>
                    </thead>
                    <tbody>
                        @if (loading()) {
                            @for (i of [1,2,3,4,5]; track i) {
                                <tr class="table-row-loading">
                                    <td [attr.colspan]="columns.length + (selectable ? 1 : 0)">
                                        <div class="skeleton" style="height: 20px;"></div>
                                    </td>
                                </tr>
                            }
                        } @else if (paginatedData().length === 0) {
                            <tr>
                                <td [attr.colspan]="columns.length + (selectable ? 1 : 0)" class="table-empty">
                                    <div class="empty-state">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                            <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                                        </svg>
                                        <span>{{ emptyMessage }}</span>
                                    </div>
                                </td>
                            </tr>
                        } @else {
                            @for (row of paginatedData(); track trackBy(row)) {
                                <tr 
                                    class="table-row"
                                    [class.selected]="isSelected(row)"
                                    (click)="onRowClick(row)"
                                >
                                    <td *ngIf="selectable" class="table-checkbox-col" (click)="$event.stopPropagation()">
                                        <input 
                                            type="checkbox" 
                                            [checked]="isSelected(row)"
                                            (change)="toggleSelect(row)"
                                        />
                                    </td>
                                    @for (col of columns; track col.key) {
                                        <td [style.textAlign]="col.align || 'left'">
                                            {{ getCellValue(row, col) }}
                                        </td>
                                    }
                                </tr>
                            }
                        }
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="table-pagination" *ngIf="showPagination && totalPages() > 1">
                <div class="pagination-info">
                    Showing {{ paginationStart() + 1 }} - {{ paginationEnd() }} of {{ filteredData().length }}
                </div>
                <div class="pagination-controls">
                    <button 
                        class="btn btn-ghost btn-sm"
                        [disabled]="currentPage() === 1"
                        (click)="goToPage(1)"
                    >
                        ⟪
                    </button>
                    <button 
                        class="btn btn-ghost btn-sm"
                        [disabled]="currentPage() === 1"
                        (click)="goToPage(currentPage() - 1)"
                    >
                        ←
                    </button>
                    
                    @for (page of visiblePages(); track page) {
                        <button 
                            class="btn btn-sm"
                            [class.btn-primary]="page === currentPage()"
                            [class.btn-ghost]="page !== currentPage()"
                            (click)="goToPage(page)"
                        >
                            {{ page }}
                        </button>
                    }
                    
                    <button 
                        class="btn btn-ghost btn-sm"
                        [disabled]="currentPage() === totalPages()"
                        (click)="goToPage(currentPage() + 1)"
                    >
                        →
                    </button>
                    <button 
                        class="btn btn-ghost btn-sm"
                        [disabled]="currentPage() === totalPages()"
                        (click)="goToPage(totalPages())"
                    >
                        ⟫
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .table-wrapper {
            background: var(--surface, white);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-xl, 12px);
            overflow: hidden;
        }

        .table-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-4, 16px);
            padding: var(--space-4, 16px);
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        .table-search {
            position: relative;
            flex: 1;
            max-width: 300px;
        }

        .search-icon {
            position: absolute;
            left: var(--space-3, 12px);
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            color: var(--text-muted, #9ca3af);
        }

        .table-search .input {
            padding-left: var(--space-10, 40px);
        }

        .table-actions {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
        }

        .table-container {
            overflow-x: auto;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
        }

        .table th,
        .table td {
            padding: var(--space-3, 12px) var(--space-4, 16px);
            text-align: left;
        }

        .table th {
            font-size: var(--text-xs, 12px);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary, #6b7280);
            background: var(--bg-secondary, #f9fafb);
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        .table th.sortable {
            cursor: pointer;
            user-select: none;
        }

        .table th.sortable:hover {
            color: var(--text-primary, #111827);
        }

        .th-content {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
        }

        .sort-icon {
            font-size: 12px;
            color: var(--brand-primary, #6366f1);
        }

        .table td {
            font-size: var(--text-sm, 14px);
            color: var(--text-primary, #111827);
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        .table-row {
            transition: background var(--duration-fast, 100ms);
        }

        .table-row:hover {
            background: var(--bg-secondary, #f9fafb);
        }

        .table-row.selected {
            background: rgba(99, 102, 241, 0.05);
        }

        .table-checkbox-col {
            width: 40px;
        }

        .table-empty {
            padding: var(--space-12, 48px) !important;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-3, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .empty-state svg {
            width: 48px;
            height: 48px;
        }

        .table-pagination {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-3, 12px) var(--space-4, 16px);
            border-top: 1px solid var(--border-default, #e5e7eb);
        }

        .pagination-info {
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
        }

        .pagination-controls {
            display: flex;
            align-items: center;
            gap: var(--space-1, 4px);
        }

        .table-row-loading td {
            padding: var(--space-4, 16px);
        }

        :host-context(.dark) .table th {
            background: var(--gray-800);
        }

        :host-context(.dark) .table-row:hover {
            background: var(--gray-800);
        }
    `]
})
export class DataTableComponent<T = any> {
    @Input() columns: TableColumn<T>[] = [];
    @Input() data: T[] = [];
    @Input() pageSize: number = 10;
    @Input() selectable: boolean = false;
    @Input() showToolbar: boolean = true;
    @Input() showSearch: boolean = true;
    @Input() showPagination: boolean = true;
    @Input() emptyMessage: string = 'No data available';
    @Input() loading = signal(false);
    @Input() trackBy: (row: T) => any = (row) => row;

    @Output() rowClick = new EventEmitter<T>();
    @Output() selectionChange = new EventEmitter<T[]>();
    @Output() sortChange = new EventEmitter<SortState | null>();

    searchQuery = '';
    currentPage = signal(1);
    sortState = signal<SortState | null>(null);
    selectedRows = signal<Set<any>>(new Set());

    filteredData = computed(() => {
        let result = [...this.data];

        // Search filter
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            result = result.filter(row =>
                this.columns.some(col => {
                    const value = this.getCellValue(row, col);
                    return value.toLowerCase().includes(query);
                })
            );
        }

        // Sort
        const sort = this.sortState();
        if (sort) {
            result.sort((a, b) => {
                const aVal = (a as any)[sort.key];
                const bVal = (b as any)[sort.key];
                const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return sort.direction === 'asc' ? cmp : -cmp;
            });
        }

        return result;
    });

    totalPages = computed(() => Math.ceil(this.filteredData().length / this.pageSize));

    paginationStart = computed(() => (this.currentPage() - 1) * this.pageSize);
    paginationEnd = computed(() => Math.min(this.paginationStart() + this.pageSize, this.filteredData().length));

    paginatedData = computed(() => {
        const start = this.paginationStart();
        return this.filteredData().slice(start, start + this.pageSize);
    });

    visiblePages = computed(() => {
        const total = this.totalPages();
        const current = this.currentPage();
        const pages: number[] = [];

        let start = Math.max(1, current - 2);
        let end = Math.min(total, current + 2);

        if (end - start < 4) {
            if (start === 1) end = Math.min(total, 5);
            else start = Math.max(1, total - 4);
        }

        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    });

    allSelected = computed(() => {
        const data = this.paginatedData();
        return data.length > 0 && data.every(row => this.selectedRows().has(this.trackBy(row)));
    });

    someSelected = computed(() => {
        return this.paginatedData().some(row => this.selectedRows().has(this.trackBy(row)));
    });

    getCellValue(row: T, col: TableColumn<T>): string {
        if (col.render) return col.render(row);
        const value = (row as any)[col.key];
        return value != null ? String(value) : '';
    }

    onSearch() {
        this.currentPage.set(1);
    }

    toggleSort(key: string) {
        const current = this.sortState();
        let newState: SortState | null = null;

        if (current?.key !== key) {
            newState = { key, direction: 'asc' };
        } else if (current.direction === 'asc') {
            newState = { key, direction: 'desc' };
        }

        this.sortState.set(newState);
        this.sortChange.emit(newState);
    }

    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages()) {
            this.currentPage.set(page);
        }
    }

    isSelected(row: T): boolean {
        return this.selectedRows().has(this.trackBy(row));
    }

    toggleSelect(row: T) {
        const key = this.trackBy(row);
        const selected = new Set(this.selectedRows());

        if (selected.has(key)) {
            selected.delete(key);
        } else {
            selected.add(key);
        }

        this.selectedRows.set(selected);
        this.emitSelection();
    }

    toggleAll() {
        const selected = new Set(this.selectedRows());
        const allCurrentSelected = this.allSelected();

        this.paginatedData().forEach(row => {
            const key = this.trackBy(row);
            if (allCurrentSelected) {
                selected.delete(key);
            } else {
                selected.add(key);
            }
        });

        this.selectedRows.set(selected);
        this.emitSelection();
    }

    onRowClick(row: T) {
        this.rowClick.emit(row);
    }

    private emitSelection() {
        const selectedKeys = this.selectedRows();
        const selectedItems = this.data.filter(row => selectedKeys.has(this.trackBy(row)));
        this.selectionChange.emit(selectedItems);
    }
}
