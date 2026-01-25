
import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { StateService } from './services/state.service';
import { LanguageService } from './services/language.service';
import { ModalComponent } from './components/modal.component';
import { LanguageConflictComponent } from './components/language-conflict.component';
import { ToastComponent } from './components/common/toast.component';
import { GlobalSpinnerComponent } from './components/common/global-spinner.component';
import { slideInAnimation } from './app/animations';
import { UtilsService } from './services/utils.service';
import { EvasionService } from './services/evasion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ModalComponent,
    LanguageConflictComponent,
    ToastComponent,
    GlobalSpinnerComponent
  ],
  templateUrl: './app.component.html',
  animations: [slideInAnimation]
})
export class AppComponent {
  state = inject(StateService);
  languageService = inject(LanguageService);
  contexts = inject(ChildrenOutletContexts);
  evasion = inject(EvasionService); // Auto-init

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
