import {
  Component,
  ElementRef,
  PLATFORM_ID,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
})
export class ChatbotComponent {
  private readonly chatService = inject(ChatService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isOpen = signal(false);
  readonly messages = this.chatService.messages;
  readonly isLoading = this.chatService.isLoading;

  private readonly messageLog =
    viewChild<ElementRef<HTMLDivElement>>('messageLog');

  inputText = '';

  constructor() {
    effect(() => {
      this.messages();
      this.isLoading();
      if (isPlatformBrowser(this.platformId)) {
        queueMicrotask(() => {
          const el = this.messageLog()?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        });
      }
    });
  }

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.isLoading()) return;
    this.chatService.sendMessage(text);
    this.inputText = '';
  }
}
