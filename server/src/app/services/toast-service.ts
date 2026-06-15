import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private messageService = inject(MessageService);

  add(severity: ToastSeverity, detail: string, summary?: string, life = 3500): void {
    this.messageService.add({
      severity,
      summary: summary ?? this.defaultSummary(severity),
      detail,
      life,
    });
  }

  success(detail: string, summary = 'מצוין!', life = 3500): void {
    this.add('success', detail, summary, life);
  }

  error(detail: string, summary = 'אויש!', life = 4500): void {
    this.add('error', detail, summary, life);
  }

  warn(detail: string, summary = 'הי, שים לב', life = 4000): void {
    this.add('warn', detail, summary, life);
  }

  info(detail: string, summary = 'מידע', life = 3500): void {
    this.add('info', detail, summary, life);
  }

  private defaultSummary(severity: ToastSeverity): string {
    switch (severity) {
      case 'success':
        return 'מצוין!';
      case 'error':
        return 'אויש!';
      case 'warn':
        return 'הי, שים לב';
      default:
        return 'מידע';
    }
  }
}
