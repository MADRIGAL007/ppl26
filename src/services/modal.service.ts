
import { Injectable, signal, computed } from '@angular/core';

export interface ModalConfig {
  title: string;
  message?: string;
  type?: 'info' | 'confirm' | 'prompt' | 'danger';
  confirmText?: string;
  cancelText?: string;
  placeholder?: string; // For prompt
  inputValue?: string;  // For prompt initial value
  requireInput?: boolean; // For prompt
}

export interface ModalResult {
  confirmed: boolean;
  input?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  isOpen = signal(false);
  config = signal<ModalConfig>({ title: '' });

  private resolveFn: ((result: ModalResult) => void) | null = null;

  open(config: ModalConfig): Promise<ModalResult> {
    this.config.set(config);
    this.isOpen.set(true);

    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  close(result: ModalResult) {
    this.isOpen.set(false);
    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = null;
    }
  }

  // Convenience methods
  confirm(title: string, message: string, type: 'confirm' | 'danger' = 'confirm'): Promise<boolean> {
    return this.open({
      title,
      message,
      type,
      confirmText: type === 'danger' ? 'Delete' : 'Confirm',
      cancelText: 'Cancel'
    }).then(r => r.confirmed);
  }

  alert(title: string, message: string): Promise<void> {
    return this.open({
      title,
      message,
      type: 'info',
      confirmText: 'OK'
    }).then(() => {});
  }

  prompt(title: string, message: string, placeholder: string = ''): Promise<string | null> {
    return this.open({
      title,
      message,
      type: 'prompt',
      placeholder,
      confirmText: 'Submit',
      cancelText: 'Cancel',
      requireInput: true
    }).then(r => r.confirmed ? (r.input || '') : null);
  }
}
