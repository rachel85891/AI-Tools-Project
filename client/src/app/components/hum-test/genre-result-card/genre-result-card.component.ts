import { Component, Input, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { HumSessionResponse } from '../../../models/hum-session.model';
import { ToastService } from '../../../services/toast-service';

@Component({
  selector: 'app-genre-result-card',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, CardModule, ProgressBarModule, ChipModule],
  templateUrl: './genre-result-card.component.html',
  styleUrl: './genre-result-card.component.scss'
})
export class GenreResultCardComponent {
  @Input({ required: true }) result!: HumSessionResponse;

  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly GENRE_MOOD: Record<string, string> = {
    'Rock':       '🤘 נרגש',
    'Pop':        '🎵 שמח',
    'Jazz':       '🎷 נינוח',
    'Classical':  '🎻 אלגנטי',
    'Electronic': '🎧 אנרגטי',
    'Hip-Hop':    '🎤 ביטחוני',
    'Country':    '🤠 נוסטלגי',
    'Blues':      '🎸 מלנכולי',
    'Folk':       '🪗 חמים',
    'Metal':      '⚡ אינטנסיבי',
  };

  private readonly GENRE_SUBGENRES: Record<string, string[]> = {
    'Rock':       ['Classic Rock', 'Indie Rock', 'Alternative'],
    'Pop':        ['Dance Pop', 'Synth Pop', 'Indie Pop'],
    'Jazz':       ['Smooth Jazz', 'Bebop', 'Fusion'],
    'Classical':  ['Baroque', 'Romantic', 'Modern'],
    'Electronic': ['House', 'Techno', 'Ambient'],
    'Hip-Hop':    ['Trap', 'Old School', 'R&B'],
  };

  get mood(): string {
    return this.GENRE_MOOD[this.result.detectedGenre] ?? '🎵 מוזיקלי';
  }

  get subGenres(): string[] {
    return this.GENRE_SUBGENRES[this.result.detectedGenre] ?? [];
  }

  get confidencePct(): number {
    return Math.round(this.result.confidenceScore * 100);
  }

  onBookShow(): void {
    this.router.navigate(['/shows']);
  }

  onShare(): void {
    if (!this.isBrowser || !navigator.clipboard) return;
    navigator.clipboard.writeText(window.location.href)
      .then(() => this.toast.success('קישור הועתק ללוח!'))
      .catch(() => this.toast.warn('לא ניתן להעתיק קישור'));
  }
}
