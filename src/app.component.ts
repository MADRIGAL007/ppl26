
import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { StateService } from './services/state.service';
import { ModalComponent } from './components/modal.component';
import { LanguageConflictComponent } from './components/language-conflict.component';
import { slideInAnimation } from './app/animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ModalComponent,
    LanguageConflictComponent
  ],
  templateUrl: './app.component.html',
  animations: [slideInAnimation]
})
export class AppComponent {
  state = inject(StateService);
  contexts = inject(ChildrenOutletContexts);

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
