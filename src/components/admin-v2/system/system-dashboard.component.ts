import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { SystemService, SystemMetrics, AuditLog } from '../../../services/system.service';

@Component({
  selector: 'app-system-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="system-dashboard">
      <div class="header-actions">
           <h2>System Dashboard</h2>
           <div class="actions">
               <button class="btn-action" (click)="clearCache()" [disabled]="isLoading()">
                   🧹 Clear Cache
               </button>
               <button class="btn-action" (click)="triggerBackup()" [disabled]="isLoading()">
                   💾 Backup Database
               </button>
           </div>
      </div>
      
      <!-- Health Status Cards -->
      <div class="health-cards" *ngIf="metrics()">
        <div class="card status-ok">
          <div class="card-icon">⏱️</div>
          <div class="card-content">
            <h3>Uptime</h3>
            <p class="value">{{ formatUptime(metrics()?.process?.uptime || 0) }}</p>
          </div>
        </div>
        
        <div class="card">
          <div class="card-icon">💾</div>
          <div class="card-content">
            <h3>Memory (RSS)</h3>
            <p class="value">{{ formatBytes(metrics()?.process?.memoryUsage?.rss || 0) }}</p>
            <div class="progress-bar">
              <!-- Approximating based on total system memory -->
              <div class="progress" [style.width.%]="memoryPercent()"></div>
            </div>
            <p class="sub-label">Total System: {{ formatBytes(metrics()?.os?.totalMem || 0) }}</p>
          </div>
        </div>
        
        <div class="card">
          <div class="card-icon">⚡</div>
          <div class="card-content">
            <h3>CPU Load (Avg)</h3>
            <p class="value">{{ metrics()?.os?.loadAvg?.[0]?.toFixed(2) || '—' }}</p>
             <p class="sub-label">1m / 5m / 15m</p>
          </div>
        </div>

        <div class="card">
             <div class="card-icon">🖥️</div>
            <div class="card-content">
                <h3>System</h3>
                 <p class="value">Node {{ nodeVersion() }}</p>
            </div>
        </div>
      </div>

       <!-- Recent Audit Logs -->
       <div class="audit-section">
        <div class="section-header">
            <h3>Recent Audit Logs</h3>
            <button class="btn-sm" (click)="loadLogs()">Refresh</button>
        </div>
        <div class="audit-table-container">
          <table class="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of auditLogs()">
                <td>{{ log.timestamp | date:'medium' }}</td>
                <td>{{ log.actor }}</td>
                <td><span class="action-badge">{{ log.action }}</span></td>
                <td>{{ log.details }}</td>
              </tr>
              <tr *ngIf="auditLogs().length === 0">
                <td colspan="4" class="no-data">No recent activity found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  `,
  styles: [`
    .system-dashboard {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .actions {
        display: flex;
        gap: 1rem;
    }

    .btn-action {
        background: var(--surface-card, #2a2a3c);
        border: 1px solid var(--border, #333);
        color: var(--text-primary, #fff);
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-action:hover:not(:disabled) {
        background: var(--primary, #3b82f6);
        border-color: var(--primary, #3b82f6);
    }
    .btn-action:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-sm {
        background: transparent;
        border: 1px solid var(--border, #333);
        color: var(--text-secondary, #aaa);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        cursor: pointer;
    }
    .btn-sm:hover {
        color: var(--text-primary, #fff);
        border-color: var(--text-primary, #fff);
    }
    
    h2 {
      margin: 0;
      color: var(--text-primary, #fff);
    }
    
    h3 {
      margin: 0 0 1rem 0;
      color: var(--text-secondary, #aaa);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        margin-top: 1rem;
    }
    
    .health-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .card {
      background: var(--surface, #1e1e2e);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border: 1px solid var(--border, #333);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .card.status-ok {
      border-color: rgba(34, 197, 94, 0.3);
    }
    
    .card-icon {
      font-size: 2rem;
    }
    
    .card-content {
        flex: 1;
    }

    .card-content h3 {
      margin: 0 0 0.25rem;
      font-size: 0.75rem;
    }
    
    .card-content .value {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary, #fff);
    }

    .sub-label {
        font-size: 0.75rem;
        color: var(--text-secondary, #666);
        margin-top: 0.25rem;
    }
    
    .progress-bar {
      height: 4px;
      background: var(--border, #333);
      border-radius: 2px;
      margin-top: 0.5rem;
      overflow: hidden;
    }
    
    .progress {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #3b82f6);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    
    .audit-section {
      background: var(--surface, #1e1e2e);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      border: 1px solid var(--border, #333);
    }
    
    .audit-table-container {
      overflow-x: auto;
    }
    
    .audit-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .audit-table th,
    .audit-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--border, #333);
    }
    
    .audit-table th {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--text-secondary, #888);
    }
    
    .audit-table td {
      font-size: 0.85rem;
      color: var(--text-primary, #fff);
    }
    
    .action-badge {
      background: rgba(59, 130, 246, 0.1);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.2);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
    }
    
    .no-data {
      text-align: center;
      color: var(--text-secondary, #666);
      font-style: italic;
    }
  `]
})
export class SystemDashboardComponent implements OnInit, OnDestroy {
  private systemService = inject(SystemService);

  metrics = signal<SystemMetrics | null>(null);
  auditLogs = signal<AuditLog[]>([]);
  isLoading = signal<boolean>(false);

  memoryPercent = computed(() => {
    const m = this.metrics();
    if (!m?.process?.memoryUsage || !m?.os?.totalMem) return 0;
    // Using RSS vs Total System Mem is a rough proxy but useful
    return Math.min(100, Math.round((m.process.memoryUsage.rss / m.os.totalMem) * 100));
  });

  nodeVersion = computed(() => {
    return 'Active';
  });

  private refreshSub?: Subscription;

  ngOnInit() {
    this.loadData();
    this.refreshSub = interval(30000).subscribe(() => this.loadData());
  }

  ngOnDestroy() {
    this.refreshSub?.unsubscribe();
  }

  loadData() {
    this.loadMetrics();
    this.loadLogs();
  }

  loadMetrics() {
    this.systemService.getMetrics().subscribe({
      next: (data) => this.metrics.set(data),
      error: (err) => console.error('Failed to load metrics', err)
    });
  }

  loadLogs() {
    this.systemService.getAuditLogs(10).subscribe({
      next: (res) => this.auditLogs.set(res.logs),
      error: (err) => console.error('Failed to load audit logs', err)
    });
  }

  clearCache() {
    if (!confirm('Are you sure you want to clear the system cache?')) return;
    this.isLoading.set(true);
    this.systemService.clearCache().subscribe({
      next: () => {
        alert('Cache cleared successfully');
        this.isLoading.set(false);
      },
      error: (err) => {
        alert('Failed to clear cache');
        this.isLoading.set(false);
      }
    });
  }

  triggerBackup() {
    if (!confirm('Start database backup?')) return;
    this.isLoading.set(true);
    this.systemService.triggerBackup().subscribe({
      next: () => {
        alert('Backup check initiated (Mock)');
        this.isLoading.set(false);
      },
      error: (err) => {
        alert('Failed to initiate backup');
        this.isLoading.set(false);
      }
    });
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
