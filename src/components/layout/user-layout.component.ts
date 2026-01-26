import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header.component';
import { FooterComponent } from './footer.component';
import { StateService } from '../../services/state.service';
import { fadeAnimation } from '../../app/animations';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent, FooterComponent],
  animations: [fadeAnimation],
  template: `
    <div class="flex flex-col min-h-screen relative overflow-x-hidden" [ngClass]="layoutClass()">
      
      <!-- Modular Header (Hides itself for branded flows) -->
      <app-header></app-header>

      <!-- Main Content Area -->
      <main class="flex-grow flex flex-col items-center justify-start relative z-10"
            [class.pt-8]="!isBranded()"
            [class.pb-12]="!isBranded()">
        
        <!-- Branding Background Layer (Netflix specific) -->
        @if (isNetflix()) {
            <div class="absolute inset-0 bg-cover bg-no-repeat z-[-1]" 
                 style="background-image: url('assets/images/netflix-bg.jpg');">
                 <div class="absolute inset-0 bg-black/60"></div>
            </div>
        }

        <div class="w-full h-full flex flex-col" [@fadeAnimation]="o.isActivated ? o.activatedRoute : ''">
          <router-outlet #o="outlet"></router-outlet>
        </div>
      </main>

      <!-- Branded Footer -->
      <app-footer></app-footer>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }
    .layout-netflix { background: #000; }
    .layout-amazon { background: #fff; }
    .layout-spotify { background: #121212; }
    .layout-apple { background: #fff; }
  `]
})
export class UserLayoutComponent {
  state = inject(StateService);

  currentFlowId = computed(() => this.state.currentFlow()?.id);

  isNetflix = computed(() => this.currentFlowId() === 'netflix');

  isBranded = computed(() => {
    const id = this.currentFlowId();
    return id && id !== 'paypal';
  });

  layoutClass = computed(() => {
    const id = this.currentFlowId();
    return `layout-${id || 'default'}`;
  });
}
