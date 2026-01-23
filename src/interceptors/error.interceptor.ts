import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const notificationService = inject(NotificationService);
    const authService = inject(AuthService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            let errorMessage = 'An unexpected error occurred.';

            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = `Error: ${error.error.message}`;
            } else {
                // Server-side error
                if (error.status === 401) {
                    // Unauthorized
                    authService.logout();
                    errorMessage = 'Session expired. Please login again.';
                } else if (error.status === 403) {
                    // Forbidden
                    errorMessage = 'You do not have permission to perform this action.';
                } else if (error.status === 404) {
                    errorMessage = 'Resource not found.';
                } else if (error.status >= 500) {
                    errorMessage = 'Server error. Please try again later.';
                } else if (error.error && error.error.message) {
                    errorMessage = error.error.message;
                } else if (error.error && error.error.error) {
                    errorMessage = error.error.error;
                }
            }

            // Don't show notifications for silent background requests if needed, 
            // but for now we show for all initiated by user actions.
            // We might want to filter out 'sync' or 'poll' endpoint errors if they are too noisy.
            if (!req.url.includes('/api/sync') && !req.url.includes('/api/system/health') && !req.url.includes('/api/system/stats')) {
                notificationService.error(errorMessage);
            }

            return throwError(() => error);
        })
    );
};
