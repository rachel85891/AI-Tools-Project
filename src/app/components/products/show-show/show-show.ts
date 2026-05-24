import {
  Component,
  Output,
  EventEmitter,
  Input,
  inject,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  ChangeDetectorRef,
  OnInit,
} from '@angular/core';
import { ShowsService } from '../../../services/shows-service';
import { Sector, Show, TargetAudience, Section, SECTION_TO_ID } from '../../../models/show-model';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DatePipe } from '@angular/common';
import { ProviderService } from '../../../services/provider-service';
import { CarouselModule } from 'primeng/carousel';
import { CategorySrvice } from '../../../services/category-srvice';
import { ProgressSpinnerModule } from 'primeng/progressspinner'; //
import { TooltipModule } from 'primeng/tooltip';
import { Provider } from '../../../models/provider-model';
import { Observable, Subscription, interval, of } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { ImageService } from '../../../services/image-service';
import { Category } from '../../../models/category-model';
import { SeatsService } from '../../../services/seats-service';
import { Seat } from '../../../models/seat-model';

interface SectionAvailability {
  sectionId: number;
  sectionLabel: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
}

interface SectionDefinition {
  sectionId: number;
  sectionLabel: string;
  getMap: (show: Show) => Seat[][];
}
@Component({
  selector: 'app-show-show',
  imports: [
    AvatarModule,
    ButtonModule,
    DatePipe,
    CarouselModule,
    AvatarModule,
    ProgressSpinnerModule,
    TooltipModule,
  ],
  templateUrl: './show-show.html',
  styleUrl: './show-show.scss',
})
export class ShowShow implements OnInit, OnChanges, OnDestroy {
  showSrv: ShowsService = inject(ShowsService);
  private cd = inject(ChangeDetectorRef);
  categoreySrv: CategorySrvice = inject(CategorySrvice);
  providerSrv: ProviderService = inject(ProviderService);
  private seatsSrv: SeatsService = inject(SeatsService);
  providers: Provider[] = [];
  providers$: Observable<Provider[]> | undefined;
  categories: Category[] = [];
  readonly Audience = TargetAudience;
  readonly Sector = Sector;
  currProvider: Provider | undefined;
  imageSrv: ImageService = inject(ImageService);

  private sectionDefinitions: SectionDefinition[] = [
    {
      sectionId: 1,
      sectionLabel: Section.HALL,
      getMap: (show) => show.hallMap?.map ?? [],
    },
    {
      sectionId: 2,
      sectionLabel: Section.RIGHT_BALCONY,
      getMap: (show) => show.rightBalMap?.map ?? [],
    },
    {
      sectionId: 3,
      sectionLabel: Section.LEFT_BALCONY,
      getMap: (show) => show.leftBalMap?.map ?? [],
    },
    {
      sectionId: 4,
      sectionLabel: Section.CENTER_BALCONY,
      getMap: (show) => show.centerBalMap?.map ?? [],
    },
  ];

  @Input()
  showId: number = 0;

  @Output()
  openSeatsMap = new EventEmitter<number>();

  @Output()
  openShowDetails = new EventEmitter<number>();

  showProd: Show = new Show();
  userName: string = 'Michal';
  responsiveOptions: any[] | undefined;
  relatedEvents: Show[] = [];
  sectionAvailability: SectionAvailability[] = [];
  /** Live countdown until show start (e.g. "05:12:06:30" = 5 days 12h 6m 30s). */
  countdownLabel: string = '';
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private seatAvailabilitySubscription: Subscription | null = null;

  ngOnInit() {
    this.loadProviders();
    this.responsiveOptions = [
      {
        breakpoint: '1024px',
        numVisible: 3,
        numScroll: 3,
      },
      {
        breakpoint: '768px',
        numVisible: 2,
        numScroll: 2,
      },
      {
        breakpoint: '560px',
        numVisible: 1,
        numScroll: 1,
      },
    ];
    this.categoreySrv.categories$.subscribe((data) => {
      this.categories = data;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['showId']) {
      this.loadShowDetails();
    }
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.stopSeatAvailabilityRefresh();
  }

  /** Build show start Date from date + beginTime (string "HH:mm" or Date). */
  getShowStartDate(show: Show): Date | null {
    if (!show?.date) return null;
    const d = new Date(show.date);
    const bt = show.beginTime;
    if (typeof bt === 'string' && bt) {
      const parts = bt.trim().split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      d.setHours(h, m, 0, 0);
    } else if (bt instanceof Date) {
      d.setHours(bt.getHours(), bt.getMinutes(), 0, 0);
    }
    return d;
  }

  private stopCountdown(): void {
    if (this.countdownTimer != null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private startCountdown(): void {
    this.stopCountdown();
    this.updateCountdown();
    this.countdownTimer = setInterval(() => this.updateCountdown(), 1000);
  }

  private stopSeatAvailabilityRefresh(): void {
    if (this.seatAvailabilitySubscription) {
      this.seatAvailabilitySubscription.unsubscribe();
      this.seatAvailabilitySubscription = null;
    }
  }

  private startSeatAvailabilityRefresh(showId: number): void {
    this.stopSeatAvailabilityRefresh();
    this.seatAvailabilitySubscription = interval(4000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.seatsSrv.getOrderedSeats(showId).pipe(
            catchError((err) => {
              console.error('Error loading ordered seats for availability', err);
              return of([] as Seat[]);
            }),
          ),
        ),
      )
      .subscribe((orderedSeats) => {
        if (this.showProd.id !== showId) return;
        this.updateSectionAvailability(orderedSeats);
      });
  }

  private loadShowDetails(): void {
    if (!this.showId) {
      this.showProd = new Show();
      this.relatedEvents = [];
      this.sectionAvailability = [];
      this.stopSeatAvailabilityRefresh();
      this.stopCountdown();
      this.cd.detectChanges();
      return;
    }

    this.showSrv.getShowById(this.showId).subscribe({
      next: (show) => {
        this.showProd = show;
        this.updateRelatedEvents();
        this.startCountdown();
        this.updateSectionAvailability([]);
        this.startSeatAvailabilityRefresh(show.id);
        this.cd.detectChanges();
      },
      error: () => {
        this.showProd = this.showSrv.findShow(this.showId) ?? new Show();
        this.updateRelatedEvents();
        this.startCountdown();
        this.updateSectionAvailability([]);
        this.startSeatAvailabilityRefresh(this.showId);
        this.cd.detectChanges();
      },
    });
  }

  private updateRelatedEvents(): void {
    this.relatedEvents = this.showSrv.shows.filter(
      (element) =>
        element.categoryId === this.showProd.categoryId && element.id !== this.showProd.id,
    );
  }

  private resolveSectionTypeForSeat(seat: Seat): number {
    if (seat.sectionSectionType != null && seat.sectionSectionType >= 1 && seat.sectionSectionType <= 4) {
      return seat.sectionSectionType;
    }
    return SECTION_TO_ID[seat.section] ?? 0;
  }

  private updateSectionAvailability(orderedSeats: Seat[]): void {
    const sectionIds =
      this.showProd.sectionIdsFromApi?.length > 0
        ? this.showProd.sectionIdsFromApi
        : this.sectionDefinitions.map((section) => section.sectionId);

    this.sectionAvailability = this.sectionDefinitions
      .filter((section) => sectionIds.includes(section.sectionId))
      .map((section) => {
        const totalSeats = section.getMap(this.showProd).flat().length;
        const takenSeats = orderedSeats.filter((seat) => {
          const status = seat.orderStatus ?? (seat.status ? 1 : 0);
          return (
            (status === 1 || status === 2) &&
            this.resolveSectionTypeForSeat(seat) === section.sectionId
          );
        }).length;
        return {
          sectionId: section.sectionId,
          sectionLabel: section.sectionLabel,
          totalSeats,
          availableSeats: Math.max(0, totalSeats - takenSeats),
          price: this.getSectionPrice(section.sectionId),
        };
      })
      .filter((section) => section.totalSeats > 0);
    this.cd.detectChanges();
  }

  private getSectionPrice(sectionId: number): number {
    switch (sectionId) {
      case 1:
        return this.showProd.hallMap?.price ?? 0;
      case 2:
        return this.showProd.rightBalMap?.price ?? 0;
      case 3:
        return this.showProd.leftBalMap?.price ?? 0;
      case 4:
        return this.showProd.centerBalMap?.price ?? 0;
      default:
        return 0;
    }
  }

  get totalAvailableSeats(): number {
    return this.sectionAvailability.reduce((sum, section) => sum + section.availableSeats, 0);
  }

  get isSoldOut(): boolean {
    if (this.sectionAvailability.length > 0) {
      return this.totalAvailableSeats <= 0;
    }
    return this.showProd.isFull;
  }

  getAvailabilitySeverity(availableSeats: number): 'soldout' | 'critical' | 'warning' | 'normal' {
    if (availableSeats <= 0) return 'soldout';
    if (availableSeats <= 5) return 'critical';
    if (availableSeats <= 10) return 'warning';
    return 'normal';
  }

  /** Set countdownLabel to "DD:HH:MM:SS" (days : hours : minutes : seconds) until show start. */
  updateCountdown(): void {
    const start = this.getShowStartDate(this.showProd);
    if (!start) {
      this.countdownLabel = '--:--:--:--';
      this.cd.detectChanges();
      return;
    }
    const now = Date.now();
    const ms = start.getTime() - now;
    if (ms <= 0) {
      this.countdownLabel = 'המופע כבר התקיים';
      this.cd.detectChanges();
      return;
    }
    const sec = Math.floor(ms / 1000) % 60;
    const min = Math.floor(ms / (1000 * 60)) % 60;
    const hrs = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    this.countdownLabel = [
      days.toString().padStart(2, '0'),
      hrs.toString().padStart(2, '0'),
      min.toString().padStart(2, '0'),
      sec.toString().padStart(2, '0'),
    ].join(':');
    this.cd.detectChanges();
  }

  // get (): Date | null {
  //     if (!this.showProd.beginTime || !this.showProd.endTime || !this.showProd.date) return null;
  //     const start = new Date(this.showProd.date);
  //     const startTime = new Date(this.showProd.beginTime);
  //     const Time = new Date(this.showProd.endTime);
  //     start.setHours(startTime.getHours());
  //     start.setMinutes(startTime.getMinutes());
  //     const end = new Date(start);
  //     end.setHours(start.getHours() + Time.getHours());
  //     end.setMinutes(start.getMinutes() + Time.getMinutes());
  //     return end;
  // }

  get endsNextDay(): boolean {
    const end = this.showProd.endTime;
    if (!end || !this.showProd.date) return false;

    const startDate = new Date(this.showProd.date).getDate();
    return new Date(end).getDate() !== startDate;
  }
  get currentProvider() {
    return this.providers.find((p) => p.id === this.showProd.providerId);
  }

  private loadProviders() {
    this.providerSrv.loadProviders().subscribe({
      next: (providers) => {
        this.providers = providers;
      },
      error: (err) => {
        console.error('Error loading providers', err);
      },
    });
  }
}
