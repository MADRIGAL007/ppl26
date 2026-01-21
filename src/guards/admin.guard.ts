import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // 1. Check if token exists locally
    if (authService.isAuthenticated()) {
        // 2. Ideally verify validity? (AuthService does this on init)
        // We trust local token for immediate navigation, AuthService will redirect if invalid on verify.
        return true;
    }

    // 3. Not authenticated -> Redirect to Admin Login
    return router.createUrlTree(['/admin/login']);
};
