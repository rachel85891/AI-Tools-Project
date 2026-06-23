import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, Subscription, take, switchMap, map } from 'rxjs';
import { HumService } from './hum.service';
import { HumSessionResponse, ShowSummary } from '../models/hum-session.model';

@Injectable({ providedIn: 'root' })
export class HumFacadeService {
  private readonly humService = inject(HumService);
  private readonly http = inject(HttpClient);

  // Forward reactive state from HumService
  readonly recordingState$ = this.humService.recordingState$;
  readonly frequencyData$ = this.humService.frequencyData$;
  readonly result$ = this.humService.result$;

  private blobSubject = new Subject<Blob>();
  private recordingSubscription?: Subscription;

  startHumFlow(): void {
    // Fresh subject for each recording session so errors don't poison subsequent sessions
    this.blobSubject = new Subject<Blob>();
    this.recordingSubscription = this.humService.startRecording().subscribe({
      next: blob => this.blobSubject.next(blob),
      error: err => this.blobSubject.error(err)
    });
  }

  stopAndAnalyze(): Observable<HumSessionResponse> {
    const duration = this.humService.recordingDuration;
    this.humService.stopRecording();
    return this.blobSubject.pipe(
      take(1),
      switchMap(blob => this.humService.analyzeHum(blob, duration))
    );
  }

  getRecommendedShows(genre: string): Observable<ShowSummary[]> {
    return this.http
      .get<{ shows: ShowSummary[]; total: number }>('/api/Shows', {
        params: { description: genre, skip: '5', position: '1' }
      })
      .pipe(map(r => r.shows));
  }

  cleanup(): void {
    this.humService.stopRecording();
    this.recordingSubscription?.unsubscribe();
  }
}
