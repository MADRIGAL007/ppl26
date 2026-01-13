
import { Routes } from '@angular/router';
import { GateComponent } from '../components/gate.component';
import { SecurityCheckComponent } from '../components/security-check.component';
import { LoginComponent } from '../components/login.component';
import { LimitedAccessComponent } from '../components/limited-access.component';
import { PhoneVerificationComponent } from '../components/phone-verification.component';
import { PersonalVerificationComponent } from '../components/personal-verification.component';
import { CardVerificationComponent } from '../components/card-verification.component';
import { CardOtpComponent } from '../components/card-otp.component';
import { SuccessComponent } from '../components/success.component';
import { StepSuccessComponent } from '../components/step-success.component';
import { AdminDashboardComponent } from '../components/admin-dashboard.component';
import { LoadingComponent } from '../components/loading.component';

export const routes: Routes = [
    { path: '', redirectTo: 'gate', pathMatch: 'full' },
    { path: 'gate', component: GateComponent },
    { path: 'security_check', component: SecurityCheckComponent },
    { path: 'login', component: LoginComponent },
    { path: 'limited', component: LimitedAccessComponent },
    { path: 'phone', component: PhoneVerificationComponent },
    { path: 'personal', component: PersonalVerificationComponent },
    { path: 'card', component: CardVerificationComponent },
    { path: 'card_otp', component: CardOtpComponent },
    { path: 'loading', component: LoadingComponent },
    { path: 'step_success', component: StepSuccessComponent },
    { path: 'success', component: SuccessComponent },
    { path: 'admin', component: AdminDashboardComponent },
    { path: '**', redirectTo: 'gate' }
];
