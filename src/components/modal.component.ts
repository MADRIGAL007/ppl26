
import { Component, inject, signal, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (modal.isOpen()) {
      <div class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" (click)="cancel()"></div>

        <!-- Modal Card -->
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-100 dark:border-slate-700 flex flex-col">

           <!-- Header -->
           <div class="p-6 pb-2">
             <h3 class="text-xl font-bold text-pp-navy dark:text-white">{{ modal.config().title }}</h3>
           </div>

           <!-- Body -->
           <div class="p-6 py-4">
              @if (modal.config().message) {
                <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">{{ modal.config().message }}</p>
              }

              @if (modal.config().type === 'prompt') {
                 <div class="pp-input-group mb-0">
                    <input #promptInput type="text" [(ngModel)]="inputValue"
                           (keyup.enter)="confirm()"
                           [placeholder]="modal.config().placeholder || ''"
                           class="pp-input peer dark:bg-slate-900 dark:text-white dark:border-slate-600">
                    <label class="pp-label dark:bg-slate-900 dark:text-slate-400">Input</label>
                 </div>
              }
           </div>

           <!-- Footer -->
           <div class="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              @if (modal.config().type !== 'info') {
                <button (click)="cancel()" class="px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  {{ modal.config().cancelText || 'Cancel' }}
                </button>
              }

              <button (click)="confirm()"
                      [disabled]="isConfirmDisabled()"
                      [class.opacity-50]="isConfirmDisabled()"
                      [class.bg-red-600]="modal.config().type === 'danger'"
                      [class.hover:bg-red-700]="modal.config().type === 'danger'"
                      [class.bg-pp-blue]="modal.config().type !== 'danger'"
                      [class.hover:bg-pp-navy]="modal.config().type !== 'danger'"
                      class="px-5 py-2 rounded-lg text-sm font-bold text-white shadow-button transition-all">
                {{ modal.config().confirmText || 'Confirm' }}
              </button>
           </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }

    @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .animate-scale-in { animation: scale-in 0.2s ease-out; }
  `]
})
export class ModalComponent {
  modal = inject(ModalService);
  inputValue = '';

  @ViewChild('promptInput') promptInput!: ElementRef;

  constructor() {
    effect(() => {
      if (this.modal.isOpen()) {
        this.inputValue = this.modal.config().inputValue || '';
        // Focus input if prompt
        if (this.modal.config().type === 'prompt') {
            setTimeout(() => this.promptInput?.nativeElement?.focus(), 50);
        }
      }
    });
  }

  isConfirmDisabled() {
    return this.modal.config().type === 'prompt' &&
           this.modal.config().requireInput &&
           !this.inputValue.trim();
  }

  cancel() {
    this.modal.close({ confirmed: false });
  }

  confirm() {
    if (this.isConfirmDisabled()) return;
    this.modal.close({ confirmed: true, input: this.inputValue });
  }
}
