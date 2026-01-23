import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../../services/notification.service';

interface CryptoPayment {
  id: string;
  orgId: string;
  plan: string;
  cryptoType: string;
  amount: number;
  txHash?: string;
  status: string;
  walletAddress: string;
  expiresAt: number;
  createdAt: number;
}

@Component({
  selector: 'app-billing-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="billing-management">
      <h2>Billing Management</h2>
      
      <!-- Status Filter -->
      <div class="filter-bar">
        <button [class.active]="statusFilter() === 'pending'" (click)="setFilter('pending')">
          Pending <span class="count">{{ pendingCount }}</span>
        </button>
        <button [class.active]="statusFilter() === 'verified'" (click)="setFilter('verified')">
          Verified
        </button>
        <button [class.active]="statusFilter() === 'rejected'" (click)="setFilter('rejected')">
          Rejected
        </button>
        <button [class.active]="statusFilter() === 'expired'" (click)="setFilter('expired')">
          Expired
        </button>
      </div>
      
      <!-- Payments Table -->
      <div class="payments-table-container">
        <table class="payments-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Plan</th>
              <th>Crypto</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let payment of payments()">
              <td class="id-cell">{{ payment.id.slice(0, 8) }}...</td>
              <td><span class="plan-badge" [attr.data-plan]="payment.plan">{{ payment.plan }}</span></td>
              <td>{{ payment.cryptoType }}</td>
              <td class="amount">{{ payment.amount }} {{ payment.cryptoType }}</td>
              <td>
                <span class="status-badge" [attr.data-status]="payment.status">{{ payment.status }}</span>
              </td>
              <td>{{ payment.createdAt | date:'short' }}</td>
              <td class="actions">
                <button *ngIf="payment.status === 'pending'" class="btn-verify" (click)="openVerifyModal(payment)">
                  ✓ Verify
                </button>
                <button *ngIf="payment.status === 'pending'" class="btn-reject" (click)="openRejectModal(payment)">
                  ✗ Reject
                </button>
                <button class="btn-details" (click)="viewDetails(payment)">
                  Details
                </button>
              </td>
            </tr>
            <tr *ngIf="payments().length === 0">
              <td colspan="7" class="no-data">No payments found</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Verify Modal -->
      <div class="modal-overlay" *ngIf="verifyModal()" (click)="closeModals()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Verify Payment</h3>
          <p>Payment ID: {{ selectedPayment?.id }}</p>
          <p>Amount: {{ selectedPayment?.amount }} {{ selectedPayment?.cryptoType }}</p>
          <p>Wallet: <code>{{ selectedPayment?.walletAddress }}</code></p>
          
          <div class="form-group">
            <label>Transaction Hash</label>
            <input type="text" [(ngModel)]="txHash" placeholder="Enter blockchain transaction hash" />
          </div>
          
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeModals()">Cancel</button>
            <button class="btn-confirm" (click)="verifyPayment()" [disabled]="!txHash">Verify</button>
          </div>
        </div>
      </div>
      
      <!-- Reject Modal -->
      <div class="modal-overlay" *ngIf="rejectModal()" (click)="closeModals()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Reject Payment</h3>
          <p>Payment ID: {{ selectedPayment?.id }}</p>
          
          <div class="form-group">
            <label>Reason (optional)</label>
            <textarea [(ngModel)]="rejectReason" placeholder="Enter rejection reason"></textarea>
          </div>
          
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeModals()">Cancel</button>
            <button class="btn-danger" (click)="rejectPayment()">Reject</button>
          </div>
        </div>
      </div>
      
      <!-- Details Modal -->
      <div class="modal-overlay" *ngIf="detailsModal() && selectedPayment" (click)="closeModals()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Payment Details</h3>
          <div class="details-grid">
            <div><strong>ID:</strong> {{ selectedPayment.id }}</div>
            <div><strong>Plan:</strong> {{ selectedPayment.plan }}</div>
            <div><strong>Crypto:</strong> {{ selectedPayment.cryptoType }}</div>
            <div><strong>Amount:</strong> {{ selectedPayment.amount }}</div>
            <div><strong>Status:</strong> {{ selectedPayment.status }}</div>
            <div><strong>Wallet:</strong> <code>{{ selectedPayment.walletAddress }}</code></div>
            <div *ngIf="selectedPayment.txHash"><strong>TX Hash:</strong> <code>{{ selectedPayment.txHash }}</code></div>
            <div><strong>Created:</strong> {{ selectedPayment.createdAt | date:'medium' }}</div>
            <div><strong>Expires:</strong> {{ selectedPayment.expiresAt | date:'medium' }}</div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeModals()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .billing-management {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h2 { margin-bottom: 1.5rem; color: var(--text-primary, #fff); }
    
    .filter-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    
    .filter-bar button {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border, #333);
      background: var(--surface, #1e1e2e);
      color: var(--text-primary, #fff);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .filter-bar button.active {
      background: var(--primary, #3b82f6);
      border-color: var(--primary, #3b82f6);
    }
    
    .filter-bar .count {
      background: #ef4444;
      color: white;
      padding: 0.1rem 0.4rem;
      border-radius: 10px;
      font-size: 0.7rem;
      margin-left: 0.25rem;
    }
    
    .payments-table-container {
      background: var(--surface, #1e1e2e);
      border-radius: 12px;
      border: 1px solid var(--border, #333);
      overflow-x: auto;
    }
    
    .payments-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .payments-table th,
    .payments-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border, #333);
    }
    
    .payments-table th {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--text-secondary, #888);
      background: rgba(0,0,0,0.2);
    }
    
    .id-cell {
      font-family: monospace;
      font-size: 0.85rem;
    }
    
    .plan-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .plan-badge[data-plan="starter"] { background: #22c55e30; color: #22c55e; }
    .plan-badge[data-plan="pro"] { background: #3b82f630; color: #3b82f6; }
    .plan-badge[data-plan="enterprise"] { background: #8b5cf630; color: #8b5cf6; }
    
    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-badge[data-status="pending"] { background: #f59e0b30; color: #f59e0b; }
    .status-badge[data-status="verified"] { background: #22c55e30; color: #22c55e; }
    .status-badge[data-status="rejected"] { background: #ef444430; color: #ef4444; }
    .status-badge[data-status="expired"] { background: #6b728030; color: #6b7280; }
    
    .amount {
      font-weight: 600;
      font-family: monospace;
    }
    
    .actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .actions button {
      padding: 0.35rem 0.75rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .btn-verify { background: #22c55e; color: white; }
    .btn-reject { background: #ef4444; color: white; }
    .btn-details { background: var(--border, #444); color: white; }
    
    .no-data {
      text-align: center;
      color: var(--text-secondary, #666);
      font-style: italic;
      padding: 2rem !important;
    }
    
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .modal {
      background: var(--surface, #1e1e2e);
      border-radius: 12px;
      padding: 1.5rem;
      min-width: 400px;
      max-width: 90vw;
      border: 1px solid var(--border, #333);
    }
    
    .modal h3 {
      margin: 0 0 1rem;
      color: var(--text-primary, #fff);
    }
    
    .form-group {
      margin: 1rem 0;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-secondary, #aaa);
      font-size: 0.85rem;
    }
    
    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--border, #444);
      background: var(--background, #0d0d14);
      color: var(--text-primary, #fff);
      border-radius: 6px;
      font-size: 0.9rem;
    }
    
    .form-group textarea {
      min-height: 80px;
      resize: vertical;
    }
    
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }
    
    .btn-cancel { background: var(--border, #444); color: white; padding: 0.6rem 1.2rem; border: none; border-radius: 6px; cursor: pointer; }
    .btn-confirm { background: #22c55e; color: white; padding: 0.6rem 1.2rem; border: none; border-radius: 6px; cursor: pointer; }
    .btn-danger { background: #ef4444; color: white; padding: 0.6rem 1.2rem; border: none; border-radius: 6px; cursor: pointer; }
    
    .details-grid {
      display: grid;
      gap: 0.75rem;
    }
    
    .details-grid code {
      background: rgba(0,0,0,0.3);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.8rem;
      word-break: break-all;
    }
  `]
})
export class BillingManagementComponent implements OnInit {
  payments = signal<CryptoPayment[]>([]);
  statusFilter = signal('pending');

  verifyModal = signal(false);
  rejectModal = signal(false);
  detailsModal = signal(false);

  selectedPayment: CryptoPayment | null = null;
  txHash = '';
  rejectReason = '';
  pendingCount = 0;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.loadPayments();
  }

  setFilter(status: string) {
    this.statusFilter.set(status);
    this.loadPayments();
  }

  loadPayments() {
    this.http.get<CryptoPayment[]>(`/api/system/payments?status=${this.statusFilter()}`).subscribe({
      next: data => {
        this.payments.set(data);
        if (this.statusFilter() === 'pending') {
          this.pendingCount = data.length;
        }
      },
      error: err => console.error('Failed to load payments', err)
    });
  }

  openVerifyModal(payment: CryptoPayment) {
    this.selectedPayment = payment;
    this.txHash = '';
    this.verifyModal.set(true);
  }

  openRejectModal(payment: CryptoPayment) {
    this.selectedPayment = payment;
    this.rejectReason = '';
    this.rejectModal.set(true);
  }

  viewDetails(payment: CryptoPayment) {
    this.selectedPayment = payment;
    this.detailsModal.set(true);
  }

  closeModals() {
    this.verifyModal.set(false);
    this.rejectModal.set(false);
    this.detailsModal.set(false);
    this.selectedPayment = null;
  }

  verifyPayment() {
    if (!this.selectedPayment || !this.txHash) return;

    this.http.post(`/api/system/payments/${this.selectedPayment.id}/verify`, { txHash: this.txHash }).subscribe({
      next: () => {
        this.notificationService.success('Payment verified successfully');
        this.closeModals();
        this.loadPayments();
      }
    });
  }

  rejectPayment() {
    if (!this.selectedPayment) return;

    this.http.post(`/api/system/payments/${this.selectedPayment.id}/reject`, { reason: this.rejectReason }).subscribe({
      next: () => {
        this.notificationService.success('Payment rejected successfully');
        this.closeModals();
        this.loadPayments();
      }
    });
  }
}
