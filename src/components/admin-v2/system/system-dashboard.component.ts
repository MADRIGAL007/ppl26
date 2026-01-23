import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';

interface SystemHealth {
    status: string;
    uptime: number;
    uptimeFormatted: string;
    memory: {
        used: number;
        total: number;
        rss: number;
    };
    cpu: {
        loadAvg1: string;
        loadAvg5: string;
        loadAvg15: string;
    };
    database: string;
    nodeVersion: string;
    platform: string;
    hostname: string;
    timestamp: number;
}

interface SystemStats {
    active: number;
    total: number;
    verified: number;
    links: number;
    successRate: number;
    activeUsers?: number;
}

interface AuditLog {
    id: number;
    timestamp: number;
    actor: string;
    action: string;
    details: string;
}

@Component({
    selector: 'app-system-dashboard',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="system-dashboard">
      <h2>System Dashboard</h2>
      
      <!-- Health Status Cards -->
      <div class="health-cards">
        <div class="card" [class.status-ok]="health()?.status === 'ok'" [class.status-error]="health()?.status !== 'ok'">
          <div class="card-icon">❤️</div>
          <div class="card-content">
            <h3>Status</h3>
            <p class="value">{{ health()?.status?.toUpperCase() || 'Loading...' }}</p>
          </div>
        </div>
        
        <div class="card">
          <div class="card-icon">⏱️</div>
          <div class="card-content">
            <h3>Uptime</h3>
            <p class="value">{{ health()?.uptimeFormatted || '—' }}</p>
          </div>
        </div>
        
        <div class="card">
          <div class="card-icon">💾</div>
          <div class="card-content">
            <h3>Memory</h3>
            <p class="value">{{ health()?.memory?.used || 0 }} / {{ health()?.memory?.total || 0 }} MB</p>
            <div class="progress-bar">
              <div class="progress" [style.width.%]="memoryPercent()"></div>
            </div>
          </div>
        </div>
        
        <div class="card">
          <div class="card-icon">⚡</div>
          <div class="card-content">
            <h3>CPU Load</h3>
            <p class="value">{{ health()?.cpu?.loadAvg1 || '—' }}</p>
          </div>
        </div>
        
        <div class="card" [class.status-ok]="health()?.database === 'connected'" [class.status-error]="health()?.database !== 'connected'">
          <div class="card-icon">🗄️</div>
          <div class="card-content">
            <h3>Database</h3>
            <p class="value">{{ health()?.database?.toUpperCase() || '—' }}</p>
          </div>
        </div>
      </div>
      
      <!-- Stats Section -->
      <div class="stats-section" *ngIf="stats()">
        <h3>Session Statistics</h3>
        <div class="stats-grid">
          <div class="stat">
            <span class="stat-value">{{ stats()?.active || 0 }}</span>
            <span class="stat-label">Active Sessions</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats()?.total || 0 }}</span>
            <span class="stat-label">Total Sessions</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats()?.verified || 0 }}</span>
            <span class="stat-label">Verified</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ stats()?.links || 0 }}</span>
            <span class="stat-label">Links</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ (stats()?.successRate || 0) | number:'1.1-1' }}%</span>
            <span class="stat-label">Success Rate</span>
          </div>
        </div>
      </div>
      
      <!-- Recent Audit Logs -->
      <div class="audit-section">
        <h3>Recent Activity</h3>
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
                <td>{{ log.timestamp | date:'short' }}</td>
                <td>{{ log.actor }}</td>
                <td><span class="action-badge">{{ log.action }}</span></td>
                <td>{{ log.details }}</td>
              </tr>
              <tr *ngIf="auditLogs().length === 0">
                <td colspan="4" class="no-data">No recent activity</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Server Info -->
      <div class="server-info" *ngIf="health()">
        <p><strong>Node:</strong> {{ health()?.nodeVersion }} | <strong>Platform:</strong> {{ health()?.platform }} | <strong>Host:</strong> {{ health()?.hostname }}</p>
      </div>
    </div>
  `,
    styles: [`
    .system-dashboard {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h2 {
      margin-bottom: 1.5rem;
      color: var(--text-primary, #fff);
    }
    
    h3 {
      margin: 1rem 0;
      color: var(--text-secondary, #aaa);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .health-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      border-color: #22c55e;
    }
    
    .card.status-error {
      border-color: #ef4444;
    }
    
    .card-icon {
      font-size: 2rem;
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
    
    .stats-section {
      background: var(--surface, #1e1e2e);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border, #333);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1.5rem;
      text-align: center;
    }
    
    .stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      color: var(--primary, #3b82f6);
    }
    
    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
      text-transform: uppercase;
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
      background: var(--primary, #3b82f6);
      color: white;
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
    
    .server-info {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-secondary, #666);
    }
  `]
})
export class SystemDashboardComponent implements OnInit, OnDestroy {
    health = signal<SystemHealth | null>(null);
    stats = signal<SystemStats | null>(null);
    auditLogs = signal<AuditLog[]>([]);

    memoryPercent = computed(() => {
        const h = this.health();
        if (!h?.memory) return 0;
        return Math.round((h.memory.used / h.memory.total) * 100);
    });

    private refreshSub?: Subscription;

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.loadData();
        // Refresh every 30 seconds
        this.refreshSub = interval(30000).subscribe(() => this.loadData());
    }

    ngOnDestroy() {
        this.refreshSub?.unsubscribe();
    }

    private loadData() {
        this.http.get<SystemHealth>('/api/system/health').subscribe({
            next: data => this.health.set(data),
            error: err => console.error('Failed to load health', err)
        });

        this.http.get<SystemStats>('/api/system/stats').subscribe({
            next: data => this.stats.set(data),
            error: err => console.error('Failed to load stats', err)
        });

        this.http.get<{ logs: AuditLog[] }>('/api/system/audit-logs?limit=10').subscribe({
            next: data => this.auditLogs.set(data.logs || []),
            error: err => console.error('Failed to load audit logs', err)
        });
    }
}
