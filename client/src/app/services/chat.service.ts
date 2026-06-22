import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, EMPTY } from 'rxjs';

// ── Public types consumed by components ──────────────────────────────────────

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export interface ChatMessageContext {
  role: 'user' | 'assistant';
  content: string;
}

// ── Backend contract types ────────────────────────────────────────────────────

interface ChatRequest {
  message: string;
  context?: ChatMessageContext[];
}

interface ChatResponse {
  response: string;
  timestamp: string; // ISO-8601 string — C# DateTime serialised by System.Text.Json
  status: 'Success' | 'Fallback' | 'Failure';
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  readonly messages = signal<ChatMessage[]>([]);
  readonly isLoading = signal<boolean>(false);

  sendMessage(messageText: string): void {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    // Snapshot history BEFORE appending the new user turn so the backend
    // receives prior context only (not the message being sent right now).
    const context: ChatMessageContext[] = this.messages().map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    this.messages.update(msgs => [
      ...msgs,
      { sender: 'user', text: trimmed, timestamp: new Date() },
    ]);
    this.isLoading.set(true);

    const body: ChatRequest = {
      message: trimmed,
      context: context.length > 0 ? context : undefined,
    };

    this.http
      .post<ChatResponse>('/api/Chat/send', body, { withCredentials: true })
      .pipe(
        catchError(() => {
          this.messages.update(msgs => [
            ...msgs,
            {
              sender: 'bot',
              text: 'Sorry, something went wrong. Please try again.',
              timestamp: new Date(),
            },
          ]);
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe(res => {
        this.messages.update(msgs => [
          ...msgs,
          {
            sender: 'bot',
            text: res.response,
            timestamp: new Date(res.timestamp),
          },
        ]);
        this.isLoading.set(false);
      });
  }

  initWelcome(userName: string): void {
    if (this.messages().length > 0) return;
    const name = userName && userName !== 'אורח' ? userName : null;
    const greeting = name
      ? `שלום ${name.trim()}! איך אוכל לעזור לך היום?`
      : 'היי! איך אוכל לעזור לך היום?';
    this.messages.set([{ sender: 'bot', text: greeting, timestamp: new Date() }]);
  }

  clearMessages(): void {
    this.messages.set([]);
  }
}
