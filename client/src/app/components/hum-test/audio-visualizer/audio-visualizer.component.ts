import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  Input,
  PLATFORM_ID,
  ViewChild,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HumFacadeService } from '../../../services/hum-facade.service';

@Component({
  selector: 'app-audio-visualizer',
  standalone: true,
  template: `<canvas #canvas [width]="width" [height]="height" class="viz-canvas"></canvas>`,
  styles: [`
    .viz-canvas {
      border-radius: 10px;
      background: #0f0f1a;
      display: block;
    }
  `]
})
export class AudioVisualizerComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() width = 320;
  @Input() height = 80;

  private readonly facade = inject(HumFacadeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.facade.frequencyData$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.draw(data));
  }

  private draw(data: Uint8Array): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barWidth = (canvas.width / data.length) * 2.5;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const amplitude = data[i] / 255;
      const barHeight = amplitude * canvas.height;
      // Interpolate purple (124,58,237) → coral (249,115,22) by amplitude
      const r = Math.round(124 + (249 - 124) * amplitude);
      const g = Math.round(58 + (115 - 58) * amplitude);
      const b = Math.round(237 + (22 - 237) * amplitude);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
  }
}
