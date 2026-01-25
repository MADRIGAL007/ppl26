import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-chase-success',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="chase-flow-container">
      <header class="chase-header">
        <svg class="chase-logo" viewBox="0 0 100 28" xmlns="http://www.w3.org/2000/svg">
          <path d="M12.5 0L0 12.5L12.5 25L25 12.5L12.5 0ZM12.5 5.5L19.5 12.5L12.5 19.5L5.5 12.5L12.5 5.5Z" fill="white"/>
          <text x="30" y="20" font-family="Arial" font-weight="bold" font-size="20" fill="white">CHASE</text>
        </svg>
      </header>

      <main class="chase-main">
        <div class="chase-card text-center">
          <div class="mb-6 flex justify-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <span class="material-icons text-green-600 text-4xl">check</span>
            </div>
          </div>
          
          <h1 class="mb-4">Verification complete</h1>
          <p class="text-slate-600 mb-8">
            Thank you for verifying your account. Your information has been updated successfully. 
            You will be redirected to your dashboard shortly.
          </p>

          <button class="chase-btn-primary" (click)="redirectToChase()">
            Back to account
          </button>
        </div>

        <footer class="chase-footer">
          <div class="flex justify-center mb-4">
            <a href="javascript:void(0)">Contact us</a>
            <a href="javascript:void(0)">Privacy</a>
            <a href="javascript:void(0)">Security</a>
            <a href="javascript:void(0)">Terms of use</a>
          </div>
          <p>© 2024 JPMorgan Chase & Co.</p>
        </footer>
      </main>
    </div>
  `,
    styleUrls: ['../../../styles/flows/chase.scss']
})
export class ChaseSuccessComponent {
    redirectToChase() {
        window.location.href = 'https://www.chase.com';
    }
}
