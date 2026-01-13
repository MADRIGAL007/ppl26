
import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { StateService } from './services/state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  state = inject(StateService);

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
