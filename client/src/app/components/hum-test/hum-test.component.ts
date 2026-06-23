import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  inject
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { HumFacadeService } from '../../services/hum-facade.service';
import { HumSessionResponse } from '../../models/hum-session.model';
import { ToastService } from '../../services/toast-service';
import { AudioVisualizerComponent } from './audio-visualizer/audio-visualizer.component';
import { GenreResultCardComponent } from './genre-result-card/genre-result-card.component';

type HumUiState = 'idle' | 'recording' | 'processing' | 'results' | 'error';

@Component({
  selector: 'app-hum-test',
  standalone: true,
  imports: [ButtonModule, ProgressSpinnerModule, AudioVisualizerComponent, GenreResultCardComponent],
  templateUrl: './hum-test.component.html',
  styleUrl: './hum-test.component.scss'
})
export class HumTestComponent implements OnDestroy {
  state: HumUiState = 'idle';
  result: HumSessionResponse | null = null;
  errorMessage = '';

  private readonly facade = inject(HumFacadeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(ToastService);

  onMicClick(): void {
    this.state = 'recording';
    this.cdr.detectChanges(); // ensure AudioVisualizerComponent is in DOM before startHumFlow emits
    this.facade.startHumFlow();
    this.toast.info('הקלטה התחילה, זמזם מנגינה…');
  }

  onStopClick(): void {
    this.state = 'processing';
    this.facade.stopAndAnalyze().subscribe({
      next: res => {
        this.result = res;
        this.state = 'results';
        this.toast.success(`זוהה ז'אנר: ${res.detectedGenre}`, 'ניתוח הושלם ✔');
        this.cdr.detectChanges();
      },
      error: (err: Error) => {
        this.errorMessage = err?.message ?? 'שגיאה בניתוח הז\'אנר';
        this.state = 'error';
        this.toast.error(this.errorMessage, 'שגיאה בניתוח');
        this.cdr.detectChanges();
      }
    });
  }

  onRetry(): void {
    this.result = null;
    this.errorMessage = '';
    this.state = 'idle';
  }

  ngOnDestroy(): void {
    if (this.state === 'recording') {
      this.facade.cleanup();
    }
  }
}
