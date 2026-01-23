import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../services/notification.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div class="toast" [ngClass]="toast.type" @slideInOut>
          <div class="toast-content">
            <span class="icon">
              @switch (toast.type) {
                @case ('success') { ✓ }
                @case ('error') { ✕ }
                @case ('warning') { ⚠ }
                @case ('info') { ℹ }
              }
            </span>
            <span class="message">{{ toast.message }}</span>
          </div>
          <button class="close-btn" (click)="notificationService.remove(toast.id)">×</button>
        </div>
      }
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none; /* Allow clicking through container */
    }

    .toast {
      pointer-events: auto;
      min-width: 300px;
      padding: 16px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .icon {
      font-weight: bold;
      font-size: 1.2rem;
    }

    .message {
      font-size: 0.95rem;
      font-weight: 500;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      line-height: 0.8;
      cursor: pointer;
      opacity: 0.5;
      padding: 0 0 0 12px;
    }

    .close-btn:hover {
      opacity: 1;
    }

    /* Types */
    .toast.success {
      border-left: 4px solid #10B981;
      background: linear-gradient(to right, #f0fdf4, white);
    }
    .toast.success .icon { color: #10B981; }

    .toast.error {
      border-left: 4px solid #EF4444;
      background: linear-gradient(to right, #fef2f2, white);
    }
    .toast.error .icon { color: #EF4444; }

    .toast.warning {
      border-left: 4px solid #F59E0B;
      background: linear-gradient(to right, #fffbeb, white);
    }
    .toast.warning .icon { color: #F59E0B; }

    .toast.info {
      border-left: 4px solid #3B82F6;
      background: linear-gradient(to right, #eff6ff, white);
    }
    .toast.info .icon { color: #3B82F6; }
  `],
    animations: [
        trigger('slideInOut', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
            ])
        ])
    ]
})
export class ToastComponent {
    notificationService = inject(NotificationService);
}
