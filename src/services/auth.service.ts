
import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { StateService } from './state.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private router = inject(Router);
  private state = inject(StateService);

  readonly currentUser = signal<any>(null);
  readonly token = signal<string | null>(null);

  constructor() {
      // Hydrate
      if (typeof localStorage !== 'undefined') {
          const t = localStorage.getItem('admin_token_v1');
          if (t) this.verifyToken(t);
      }
  }

  async login(username: string, password: string): Promise<boolean> {
      try {
          const res = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
          });

          if (res.ok) {
              const data = await res.json();
              this.setSession(data.token, data.user);
              return true;
          }
      } catch (e) {}
      return false;
  }

  async verifyToken(t: string) {
      try {
          const res = await fetch('/api/admin/me', {
              headers: { 'Authorization': `Bearer ${t}` }
          });
          if (res.ok) {
              const user = await res.json();
              this.setSession(t, user);
              this.state.setAdminAuthenticated(true);
          } else {
              this.logout();
          }
      } catch(e) {
          this.logout();
      }
  }

  setSession(t: string, user: any) {
      this.token.set(t);
      this.currentUser.set(user);
      localStorage.setItem('admin_token_v1', t);
  }

  logout() {
      const isImpersonating = !!sessionStorage.getItem('hv_parent_token');

      // Check if we are impersonating
      const parentToken = sessionStorage.getItem('hv_parent_token');
      if (parentToken) {
          // Restore Hypervisor
          sessionStorage.removeItem('hv_parent_token');
          // Set flag to return to users tab
          sessionStorage.setItem('hv_return_tab', 'users');
          this.verifyToken(parentToken);
          window.location.reload(); // Clean state
      } else {
          // Full Logout
          this.token.set(null);
          this.currentUser.set(null);
          localStorage.removeItem('admin_token_v1');
          this.state.setAdminAuthenticated(false);

          // Logic: If on admin page, stay there (show Gate). If elsewhere, go to login.
          if (this.router.url.includes('/admin')) {
              this.router.navigate(['/admin']);
          } else {
              this.router.navigate(['login']);
          }
      }
  }

  async impersonate(userId: string): Promise<boolean> {
      try {
          const res = await fetch(`/api/admin/impersonate/${userId}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${this.token()}` }
          });

          if (res.ok) {
              const data = await res.json();
              // Save parent token
              sessionStorage.setItem('hv_parent_token', this.token()!);

              // Set return tab flag just in case
              sessionStorage.setItem('hv_return_tab', 'users');

              // Set new session
              this.setSession(data.token, { ...this.currentUser(), isImpersonated: true });

              return true;
          }
      } catch (e) {}
      return false;
  }

  isAuthenticated() {
      return !!this.token();
  }

  getToken() {
      return this.token();
  }
}
