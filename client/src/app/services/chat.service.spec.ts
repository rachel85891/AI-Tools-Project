import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Fails the test if any HTTP request was made but not asserted
    httpController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sendMessage() immediately pushes user message to signal before HTTP resolves', () => {
    // Act — signals update synchronously; no flush needed for this assertion
    service.sendMessage('Hello');

    const msgs = service.messages();
    expect(msgs.length).toBe(1);
    expect(msgs[0].sender).toBe('user');
    expect(msgs[0].text).toBe('Hello');
    expect(service.isLoading()).toBe(true);

    // Flush the pending request so afterEach verify() passes
    httpController.expectOne('/api/Chat/send').flush({
      response: 'reply',
      timestamp: new Date().toISOString(),
      status: 'Success',
    });
  });

  it('sendMessage() appends bot response and clears isLoading after successful HTTP response', () => {
    service.sendMessage('Hello');

    // Verify request shape
    const req = httpController.expectOne('/api/Chat/send');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.message).toBe('Hello');
    expect(req.request.withCredentials).toBe(true);

    // Simulate successful API response
    req.flush({
      response: 'Here are the available shows.',
      timestamp: '2024-06-01T10:00:00.000Z',
      status: 'Success',
    });

    const msgs = service.messages();
    expect(msgs.length).toBe(2);
    expect(msgs[1].sender).toBe('bot');
    expect(msgs[1].text).toBe('Here are the available shows.');
    expect(service.isLoading()).toBe(false);
  });

  it('sendMessage() appends error bot message and clears isLoading when HTTP request fails', () => {
    service.sendMessage('Hello');

    const req = httpController.expectOne('/api/Chat/send');
    req.error(new ProgressEvent('error'));

    const msgs = service.messages();
    expect(msgs.length).toBe(2);
    expect(msgs[1].sender).toBe('bot');
    expect(msgs[1].text).toContain('went wrong');
    expect(service.isLoading()).toBe(false);
  });

  it('sendMessage() does nothing when called with a blank string', () => {
    service.sendMessage('   ');

    expect(service.messages().length).toBe(0);
    expect(service.isLoading()).toBe(false);
    httpController.expectNone('/api/Chat/send');
  });
});
