import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { ChatbotComponent } from './chatbot.component';
import { ChatService, ChatMessage } from '../../../services/chat.service';

// ── Shared mock state — reset in beforeEach ───────────────────────────────────
const messagesSignal = signal<ChatMessage[]>([]);
const isLoadingSignal = signal<boolean>(false);

const mockChatService: Partial<ChatService> = {
  messages: messagesSignal,
  isLoading: isLoadingSignal,
  sendMessage: vi.fn(),
  clearMessages: vi.fn(),
};

// ── Suite ─────────────────────────────────────────────────────────────────────
describe('ChatbotComponent', () => {
  let fixture: ComponentFixture<ChatbotComponent>;
  let component: ChatbotComponent;
  let nativeEl: HTMLElement;

  beforeEach(async () => {
    // Reset shared signal state and spy call history before each test
    messagesSignal.set([]);
    isLoadingSignal.set(false);
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      // Standalone component goes in imports, not declarations
      imports: [ChatbotComponent],
      providers: [{ provide: ChatService, useValue: mockChatService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatbotComponent);
    component = fixture.componentInstance;
    nativeEl = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Test C (required) ───────────────────────────────────────────────────────
  it('clicking FAB toggles isOpen signal and shows/hides the chat window in the DOM', () => {
    const fab = nativeEl.querySelector<HTMLButtonElement>('.chat-fab')!;

    // Initially closed
    expect(component.isOpen()).toBe(false);
    expect(nativeEl.querySelector('.chat-window')).toBeNull();

    // First click — open
    fab.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(true);
    expect(nativeEl.querySelector('.chat-window')).not.toBeNull();

    // Second click — close
    fab.click();
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    expect(nativeEl.querySelector('.chat-window')).toBeNull();
  });

  // ── Test D (required) ───────────────────────────────────────────────────────
  it('renders loading indicator when isLoading signal is true', () => {
    // Open the chat window so the message area is rendered
    component.toggle();
    fixture.detectChanges();

    // Loading indicator should NOT be present yet
    expect(nativeEl.querySelector('.chat-bubble--loading')).toBeNull();

    // Simulate the service setting isLoading to true
    isLoadingSignal.set(true);
    fixture.detectChanges();

    expect(nativeEl.querySelector('.chat-bubble--loading')).not.toBeNull();
    expect(nativeEl.querySelector('.chat-skeleton')).not.toBeNull();
    expect(nativeEl.querySelectorAll('.chat-skeleton__dot').length).toBe(3);
  });

  // ── Bonus: send() delegates to service ─────────────────────────────────────
  it('send() calls chatService.sendMessage with the current inputText and clears the field', () => {
    component.toggle();
    fixture.detectChanges();

    component.inputText = 'What shows are on?';
    component.send();

    expect(mockChatService.sendMessage).toHaveBeenCalledWith('What shows are on?');
    expect(component.inputText).toBe('');
  });

  it('send() does nothing when inputText is blank', () => {
    component.toggle();
    fixture.detectChanges();

    component.inputText = '   ';
    component.send();

    expect(mockChatService.sendMessage).not.toHaveBeenCalled();
  });
});
