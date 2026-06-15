import { Injectable } from '@angular/core';
import { ToastService } from './toast-service';

@Injectable({ providedIn: 'root' })
export class AuthMessageService {
  constructor(private toast: ToastService) {}

  showSuccess(message: string): void {
    this.toast.success(message);
  }

  showError(message: string): void {
    this.toast.error(message);
  }
}
