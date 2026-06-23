import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, throwError, switchMap, tap, catchError } from 'rxjs';
import { HumSessionResponse, RecordingState } from '../models/hum-session.model';
import { withLogging, withRetry } from '../utils/rxjs-operators';

@Injectable({ providedIn: 'root' })
export class HumService {
  private readonly http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // --- Public reactive state ---
  readonly recordingState$ = new BehaviorSubject<RecordingState>('idle');
  readonly frequencyData$ = new Subject<Uint8Array>();
  readonly result$ = new BehaviorSubject<HumSessionResponse | null>(null);

  // --- Private MediaRecorder & Web Audio fields ---
  private mediaRecorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private audioContext?: AudioContext;
  private analyserNode?: AnalyserNode;
  private animationFrameId?: number;
  private recordingStartTime?: number;

  get recordingDuration(): number {
    return this.recordingStartTime ? (Date.now() - this.recordingStartTime) / 1000 : 0;
  }

  startRecording(): Observable<Blob> {
    if (!this.isBrowser) {
      return throwError(() => new Error('Recording is not available in server-side rendering'));
    }

    return new Observable<Blob>(subscriber => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        // Web Audio API — visualiser
        this.audioContext = new AudioContext();
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 256;
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyserNode);
        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

        const emitFrequency = () => {
          this.analyserNode!.getByteFrequencyData(dataArray);
          this.frequencyData$.next(new Uint8Array(dataArray));
          this.animationFrameId = requestAnimationFrame(emitFrequency);
        };
        emitFrequency();

        // MediaRecorder
        this.chunks = [];
        this.mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) this.chunks.push(e.data);
        };
        this.mediaRecorder.onstop = () => {
          if (this.animationFrameId !== undefined) {
            cancelAnimationFrame(this.animationFrameId);
          }
          stream.getTracks().forEach(t => t.stop());
          this.audioContext?.close();
          const blob = new Blob(this.chunks, { type: 'audio/webm' });
          subscriber.next(blob);
          subscriber.complete();
        };

        this.mediaRecorder.start(100);
        this.recordingStartTime = Date.now();
        this.recordingState$.next('recording');
      }).catch((err: Error) => subscriber.error(err));
    });
  }

  stopRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
  }

  analyzeHum(blob: Blob, duration: number): Observable<HumSessionResponse> {
    this.recordingState$.next('processing');
    const userId = this.isBrowser ? (localStorage.getItem('user') ?? undefined) : undefined;

    return this.blobToBase64(blob).pipe(
      switchMap(base64 =>
        this.http.post<HumSessionResponse>('/api/hum/analyze', {
          audioBase64: base64,
          durationSeconds: duration,
          userId
        }).pipe(
          withRetry(3),
          withLogging('HumTest')
        )
      ),
      tap(response => {
        this.result$.next(response);
        this.recordingState$.next('done');
      }),
      catchError(err => {
        this.recordingState$.next('idle');
        return throwError(() => err);
      })
    );
  }

  getSession(id: string): Observable<HumSessionResponse> {
    return this.http.get<HumSessionResponse>(`/api/hum/session/${id}`);
  }

  private blobToBase64(blob: Blob): Observable<string> {
    return new Observable<string>(subscriber => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        subscriber.next(result.split(',')[1]);
        subscriber.complete();
      };
      reader.onerror = () => subscriber.error(reader.error);
      reader.readAsDataURL(blob);
    });
  }
}
