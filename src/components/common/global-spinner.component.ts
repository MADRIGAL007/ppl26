import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../services/loading.service';

@Component({
    selector: 'app-global-spinner',
    standalone: true,
    imports: [CommonModule],
    template: `
    @if (loadingService.isLoading()) {
      <div class="spinner-overlay">
        <div class="spinner"></div>
      </div>
    }
  `,
    styles: [`
    .spinner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(2px);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-left-color: #3B82F6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class GlobalSpinnerComponent {
    loadingService = inject(LoadingService);
}
