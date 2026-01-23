import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface AuditLog {
    id: number;
    timestamp: number;
    actor: string;
    action: string;
    details: string;
}

@Component({
    selector: 'app-audit-log-viewer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="audit-viewer">
      <h2>Audit Logs</h2>
      
      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Actor</label>
          <input type="text" [(ngModel)]="filters.actor" placeholder="Username" />
        </div>
        <div class="filter-group">
          <label>Action</label>
          <select [(ngModel)]="filters.action">
            <option value="">All Actions</option>
            <option value="Login">Login</option>
            <option value="Logout">Logout</option>
            <option value="MFA">MFA</option>
            <option value="Command">Command</option>
            <option value="CreateUser">Create User</option>
            <option value="UpdateUser">Update User</option>
            <option value="DeleteUser">Delete User</option>
            <option value="CreateLink">Create Link</option>
            <option value="PaymentVerified">Payment Verified</option>
            <option value="PaymentRejected">Payment Rejected</option>
          </select>
        </div>
        <div class="filter-group">
          <label>From</label>
          <input type="date" [(ngModel)]="filters.startDate" />
        </div>
        <div class="filter-group">
          <label>To</label>
          <input type="date" [(ngModel)]="filters.endDate" />
        </div>
        <button class="btn-filter" (click)="loadLogs()">Filter</button>
        <button class="btn-export" (click)="exportCSV()">Export CSV</button>
      </div>
      
      <!-- Table -->
      <div class="table-container">
        <table class="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of logs()">
              <td>{{ log.timestamp | date:'medium' }}</td>
              <td>{{ log.actor }}</td>
              <td><span class="action-badge" [attr.data-action]="log.action">{{ log.action }}</span></td>
              <td>{{ log.details }}</td>
            </tr>
            <tr *ngIf="logs().length === 0">
              <td colspan="4" class="no-data">No logs found</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="pagination">
        <button [disabled]="page() <= 1" (click)="prevPage()">← Previous</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button [disabled]="page() >= totalPages()" (click)="nextPage()">Next →</button>
      </div>
    </div>
  `,
    styles: [`
    .audit-viewer {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    h2 { margin-bottom: 1.5rem; color: var(--text-primary, #fff); }
    
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: var(--surface, #1e1e2e);
      border-radius: 12px;
      border: 1px solid var(--border, #333);
    }
    
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .filter-group label {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
      text-transform: uppercase;
    }
    
    .filter-group input,
    .filter-group select {
      padding: 0.6rem;
      border: 1px solid var(--border, #444);
      background: var(--background, #0d0d14);
      color: var(--text-primary, #fff);
      border-radius: 6px;
      min-width: 150px;
    }
    
    .btn-filter,
    .btn-export {
      padding: 0.6rem 1.2rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .btn-filter { background: var(--primary, #3b82f6); color: white; }
    .btn-export { background: #22c55e; color: white; }
    
    .table-container {
      background: var(--surface, #1e1e2e);
      border-radius: 12px;
      border: 1px solid var(--border, #333);
      overflow-x: auto;
    }
    
    .audit-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .audit-table th,
    .audit-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border, #333);
    }
    
    .audit-table th {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--text-secondary, #888);
      background: rgba(0,0,0,0.2);
    }
    
    .action-badge {
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      background: var(--primary, #3b82f6);
      color: white;
    }
    
    .action-badge[data-action="Login"],
    .action-badge[data-action="Logout"] { background: #22c55e; }
    .action-badge[data-action="MFA"] { background: #8b5cf6; }
    .action-badge[data-action="Command"] { background: #f59e0b; }
    .action-badge[data-action="PaymentVerified"] { background: #10b981; }
    .action-badge[data-action="PaymentRejected"] { background: #ef4444; }
    
    .no-data {
      text-align: center;
      color: var(--text-secondary, #666);
      font-style: italic;
      padding: 2rem !important;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    
    .pagination button {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border, #333);
      background: var(--surface, #1e1e2e);
      color: var(--text-primary, #fff);
      border-radius: 6px;
      cursor: pointer;
    }
    
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .pagination span {
      color: var(--text-secondary, #888);
      font-size: 0.9rem;
    }
  `]
})
export class AuditLogViewerComponent implements OnInit {
    logs = signal<AuditLog[]>([]);
    page = signal(1);
    total = signal(0);
    limit = 50;

    totalPages = signal(1);

    filters = {
        actor: '',
        action: '',
        startDate: '',
        endDate: ''
    };

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.loadLogs();
    }

    loadLogs() {
        const params = new URLSearchParams();
        params.set('page', this.page().toString());
        params.set('limit', this.limit.toString());

        if (this.filters.actor) params.set('actor', this.filters.actor);
        if (this.filters.action) params.set('action', this.filters.action);
        if (this.filters.startDate) params.set('startDate', new Date(this.filters.startDate).getTime().toString());
        if (this.filters.endDate) params.set('endDate', new Date(this.filters.endDate + 'T23:59:59').getTime().toString());

        this.http.get<{ logs: AuditLog[], total: number }>(`/api/system/audit-logs?${params}`).subscribe({
            next: data => {
                this.logs.set(data.logs || []);
                this.total.set(data.total || 0);
                this.totalPages.set(Math.ceil((data.total || 0) / this.limit) || 1);
            },
            error: err => console.error('Failed to load audit logs', err)
        });
    }

    prevPage() {
        if (this.page() > 1) {
            this.page.set(this.page() - 1);
            this.loadLogs();
        }
    }

    nextPage() {
        if (this.page() < this.totalPages()) {
            this.page.set(this.page() + 1);
            this.loadLogs();
        }
    }

    exportCSV() {
        const logs = this.logs();
        if (logs.length === 0) return;

        const headers = ['Timestamp', 'Actor', 'Action', 'Details'];
        const rows = logs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.actor,
            log.action,
            `"${log.details.replace(/"/g, '""')}"`
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
