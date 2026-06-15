import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnChanges,
  Output,
  SimpleChanges,
  effect,
  inject,
} from '@angular/core';
import { interval } from 'rxjs';
import { filter, map, startWith, take, withLatestFrom } from 'rxjs/operators';
import { ShowsService } from '../../services/shows-service';
import { CartService } from '../../services/cart-service';
import { Seat } from '../../models/seat-model';
import { Show, Section } from '../../models/show-model';
import { SECTION_TO_ID } from '../../models/show-model';
import { SeatsService } from '../../services/seats-service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastService } from '../../services/toast-service';

export type SeatState = 'available' | 'mine-unpaid' | 'mine-paid' | 'unavailable';

/** sectionId from DB: 1=HALL, 2=RIGHT_BALCONY, 3=LEFT_BALCONY, 4=CENTER_BALCONY */
const SECTION_ID_TO_MAP = {
  1: (s: Show) => s.hallMap.map,
  2: (s: Show) => s.rightBalMap.map,
  3: (s: Show) => s.leftBalMap.map,
  4: (s: Show) => s.centerBalMap.map,
} as const;

@Component({
  selector: 'app-seats-map',
  imports: [DialogModule, ButtonModule],
  templateUrl: './seats-map.html',
  styleUrl: './seats-map.scss',
})
export class SeatsMap implements OnInit, OnChanges {
  private showSrv: ShowsService = inject(ShowsService);
  private cartSrv: CartService = inject(CartService);
  private seatsSrv: SeatsService = inject(SeatsService);
  private toast = inject(ToastService);
  private cd: ChangeDetectorRef = inject(ChangeDetectorRef);
  orderedSeats: Seat[] = [];

  /** When set, show the map for this show; otherwise use first show in list. */
  @Input() showId: number | null = null;
  /** Emitted when user clicks "מעבר לסל" so parent can close drawer and navigate. */
  @Output() goToCartClick = new EventEmitter<void>();

  /** The show whose seating we render. */
  show: Show | null = null;
  /** Booking closed states for this show. */
  showIsPast = false;
  showIsSoldOut = false;
  /** Current cart items (subscribed in ngOnInit). */
  cartItems: Seat[] = [];
  /** Seat keys for which a lock request is in progress. */
  pendingKeys = new Set<string>();

  /** Seat confirmation dialog: selected seat and its section price (only when dialog open). */
  seatDialogVisible = false;
  selectedSeat: Seat | null = null;
  selectedSeatPrice: number | null = null;
  savingSeat = false;

  /** Remaining seconds until the soonest-expiring seat; null when cart is empty. */
  remainingSeconds$ = interval(1000).pipe(
    startWith(0),
    withLatestFrom(this.cartSrv.soonestExpiresAt$),
    map(([, soonest]) =>
      soonest == null ? null : Math.max(0, Math.ceil((soonest - Date.now()) / 1000)),
    ),
  );
  /** Current remaining seconds (set by subscription) so template can show 0. */
  remainingSeconds: number | null = null;

  /** Cart slider: open when user adds a seat; user can close or open via button. */
  cartSliderVisible = false;
  private initialized = false;

  constructor() {
    effect(() => {
      this.cartItems = this.cartSrv.cart();
    });
  }

  ngOnInit(): void {
    this.initialized = true;
    if (this.cartSrv.isLoggedIn) {
      this.cartSrv.loadCartFromUser();
    }
    this.updateShowFromInput();
    if (this.showId == null || this.showId <= 0) {
      this.showSrv.shows$
        .pipe(
          filter((shows) => shows.length > 0),
          take(1),
        )
        .subscribe((shows) => {
          if (!this.show) {
            this.showSrv.getShowById(shows[0].id).subscribe((show) => {
              this.show = show;
              this.refreshShowFlags();
              this.loadOrderedSeats();
              this.cd.detectChanges();
            });
          }
        });
    }
    this.remainingSeconds$.subscribe((sec) => {
      this.remainingSeconds = sec;
      this.cd.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (changes['showId']) {
      this.updateShowFromInput();
    }
  }

  private updateShowFromInput(): void {
    const idToLoad =
      this.showId || (this.showSrv.shows.length > 0 ? this.showSrv.shows[0].id : null);

    if (idToLoad && idToLoad > 0) {
      this.showSrv.getShowById(idToLoad).subscribe((show) => {
        this.show = show;
        this.refreshShowFlags();
        // קריאה מסודרת לטעינת המושבים התפוסים מיד לאחר טעינת המופע
        if (this.show) {
          this.loadOrderedSeats();
        }
      });
    }
  }

  loadOrderedSeats() {
    const idToUse = this.showId ?? this.show?.id;
    if (!idToUse) return;

    this.seatsSrv.getOrderedSeats(idToUse).subscribe({
      next: (seats) => {
        this.orderedSeats = seats;
        // עדכון הסטטוסים במפה הויזואלית בהתאם לנתונים החדשים
        if (this.show) {
          this.applyOrderedSeatsToMap(this.show);
        }
        this.refreshShowFlags();
        this.cd.detectChanges();
      },
      error: (err) => console.error('טעינת מושבים נכשלה', err),
    });
  }

  private toNumber(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  /** Prefer fresh ordered seats from OrderedSeat endpoint; fallback to show.orderedSeats when empty. */
  private getOrderedSeatsSource(show: Show | null = this.show): any[] {
    if (Array.isArray(this.orderedSeats) && this.orderedSeats.length > 0)
      return this.orderedSeats as any[];
    return (show?.orderedSeats ?? []) as any[];
  }

  /** 1..4 section type from multiple backend shapes (sectionSectionType / sectionTypeId / sectionId / DB section id). */
  private resolveOrderedSeatSectionType(dto: any, show: Show | null = this.show): number {
    const direct =
      this.toNumber(dto?.sectionSectionType) ||
      this.toNumber(dto?.sectionTypeId) ||
      this.toNumber(dto?.sectionType);
    if (direct >= 1 && direct <= 4) return direct;

    const sectionId = this.toNumber(dto?.sectionId);
    if (sectionId >= 1 && sectionId <= 4) return sectionId;

    // If sectionId is DB row id, map it back to section type via show.sectionDbIdByType.
    if (sectionId > 4 && show?.sectionDbIdByType) {
      const found = Object.entries(show.sectionDbIdByType).find(
        ([, dbId]) => Number(dbId) === sectionId,
      );
      if (found) return Number(found[0]);
    }

    return 0;
  }

  /** Ordered seat status: 0 available, 1 reserved, 2 sold. */
  private isOrderedSeatTaken(dto: any): boolean {
    const status = this.getOrderedSeatStatus(dto);
    return status === 1 || status === 2;
  }

  private getOrderedSeatUserId(dto: any): number {
    return this.toNumber(dto?.orderUserId ?? dto?.userId);
  }

  private getOrderedSeatStatus(dto: any): number {
    const explicit = this.toNumber(dto?.orderStatus ?? dto?.status ?? dto?.Status);
    if (explicit === 0 || explicit === 1 || explicit === 2) return explicit;
    if (typeof dto?.status === 'boolean') return dto.status ? 1 : 0;
    // Fallback: if backend returned item without explicit status, treat as reserved.
    return 1;
  }

  private refreshShowFlags(): void {
    if (!this.show) {
      this.showIsPast = false;
      this.showIsSoldOut = false;
      return;
    }
    this.showIsPast = this.show.isPast;
    this.showIsSoldOut = this.isShowSoldOut(this.show);
  }

  private isShowSoldOut(show: Show): boolean {
    const sectionIds =
      show.sectionIdsFromApi?.length > 0 ? show.sectionIdsFromApi : [1, 2, 3, 4];
    const seatCountBySection: Record<number, number> = {
      1: show.hallMap?.map?.flat().length ?? 0,
      2: show.rightBalMap?.map?.flat().length ?? 0,
      3: show.leftBalMap?.map?.flat().length ?? 0,
      4: show.centerBalMap?.map?.flat().length ?? 0,
    };
    const totalSeats = sectionIds.reduce((sum, sectionId) => sum + (seatCountBySection[sectionId] ?? 0), 0);
    if (totalSeats <= 0) return false;

    const takenKeys = new Set<string>();
    for (const dto of this.getOrderedSeatsSource(show)) {
      if (!this.isOrderedSeatTaken(dto)) continue;
      const sectionType = this.resolveOrderedSeatSectionType(dto, show);
      if (!sectionIds.includes(sectionType)) continue;
      const rowIndex = this.toNumber(dto.row);
      const colIndex = this.toNumber(dto.col);
      takenKeys.add(`${sectionType}-${rowIndex}-${colIndex}`);
    }
    return takenKeys.size >= totalSeats;
  }

  /** Apply DB seat statuses (0=available, 1=reserved, 2=sold) to the show's map: reset all to available, then mark ordered seats unavailable. */
  private applyOrderedSeatsToMap(show: Show): void {
    const showId = show.id;
    if (!showId) return;
    for (const grid of [show.hallMap, show.rightBalMap, show.leftBalMap, show.centerBalMap]) {
      for (const row of grid.map) {
        for (const seat of row) {
          seat.status = false;
        }
      }
    }
    const seatsToApply = this.getOrderedSeatsSource(show);
    for (const dto of seatsToApply) {
      if (!this.isOrderedSeatTaken(dto)) continue;
      const sectionType = this.resolveOrderedSeatSectionType(dto, show);
      const getMap = SECTION_ID_TO_MAP[sectionType as keyof typeof SECTION_ID_TO_MAP];
      if (!getMap) continue;
      const seatMatrix = getMap(show);
      const rowIndex = this.toNumber(dto.row);
      const colIndex = this.toNumber(dto.col);
      const row = seatMatrix[rowIndex];
      if (row && row[colIndex]) {
        const status = this.getOrderedSeatStatus(dto);
        row[colIndex].status = status !== 0;
        row[colIndex].orderStatus = status;
        row[colIndex].userId = this.getOrderedSeatUserId(dto);
        row[colIndex].sectionSectionType = sectionType;
        const sectionId = this.toNumber(dto.sectionId);
        if (sectionId > 0) row[colIndex].sectionId = sectionId;
      }
    }

    this.cd.detectChanges();
  }
  isSeatDisabled(seat: Seat) {
    const sectionType = SECTION_TO_ID[seat.section] ?? 1;
    return (
      this.showIsPast ||
      this.showIsSoldOut ||
      this.getSeatState(seat) !== 'available' ||
      this.isPending(seat) ||
      !this.hasSectionForShow(sectionType)
    );
  }

  seatKey(seat: Seat): string {
    return `${seat.section}-${seat.row}-${seat.col}`;
  }

  isInCart(seat: Seat): boolean {
    const currentShowId = this.showId ?? this.show?.id ?? null;
    if (currentShowId == null) return false;
    return this.cartItems.some(
      (s) =>
        s.showId === currentShowId &&
        s.section === seat.section &&
        s.row === seat.row &&
        s.col === seat.col,
    );
  }

  isPending(seat: Seat): boolean {
    return this.pendingKeys.has(this.seatKey(seat));
  }

  getSeatState(seat: Seat): SeatState {
    const seatsToCheck = this.getOrderedSeatsSource(this.show);
    const sectionType = SECTION_TO_ID[seat.section] ?? 1;
    const isOrdered = seatsToCheck.find(
      (os: any) =>
        this.isOrderedSeatTaken(os) &&
        this.toNumber(os.row) === seat.row &&
        this.toNumber(os.col) === seat.col &&
        this.resolveOrderedSeatSectionType(os, this.show) === sectionType,
    );

    if (isOrdered) {
      const orderedStatus = this.getOrderedSeatStatus(isOrdered);
      const orderedUserId = this.getOrderedSeatUserId(isOrdered);
      // If seat belongs to current user: status 1 => red (saved/not paid), status 2 => blue (paid).
      if (orderedUserId > 0 && orderedUserId === this.cartSrv.getCurrentUserId()) {
        if (orderedStatus === 2) return 'mine-paid';
        return 'mine-unpaid';
      }
      // Ordered seat of someone else is always disabled/grey.
      return 'unavailable';
    }
    return 'available';
  }

  /** Opens the seat confirmation dialog (details + price). Save sends lock to DB (status 1). */
  onSeatClick(seat: Seat): void {
    if (this.showIsPast || this.showIsSoldOut) return;
    if (!this.cartSrv.isLoggedIn) {
      this.toast.warn('יש להתחבר כדי לשמור מושב.');
      return;
    }
    const state = this.getSeatState(seat);
    if (state !== 'available' || this.isPending(seat)) return;
    const showId = this.showId ?? this.show?.id ?? 0;
    if (!showId) return;
    this.selectedSeat = seat;
    this.selectedSeatPrice = this.getPriceForSeat(seat);
    this.seatDialogVisible = true;
    this.cd.detectChanges();
  }

  getPriceForSeat(seat: Seat): number | null {
    if (!this.show) return null;
    const p =
      this.show.hallMap.section === seat.section
        ? this.show.hallMap.price
        : this.show.leftBalMap.section === seat.section
          ? this.show.leftBalMap.price
          : this.show.rightBalMap.section === seat.section
            ? this.show.rightBalMap.price
            : this.show.centerBalMap.section === seat.section
              ? this.show.centerBalMap.price
              : null;
    return p != null && p > 0 ? p : null;
  }

  closeSeatDialog(): void {
    this.seatDialogVisible = false;
    this.selectedSeat = null;
    this.selectedSeatPrice = null;
    this.savingSeat = false;
    this.cd.detectChanges();
  }

  /** Confirm: validate seat still available then call lock API (DB status → 1). */
  confirmSeatChoice(): void {
    if (!this.selectedSeat) return;
    const showId = this.showId ?? this.show?.id ?? 0;
    if (!showId) return;
    if (this.getSeatState(this.selectedSeat) !== 'available') {
      this.toast.warn('המושב נבחר בינתיים על ידי משתמש אחר.');
      this.loadOrderedSeats();
      this.cd.detectChanges();
      return;
    }
    this.savingSeat = true;
    const key = this.seatKey(this.selectedSeat);
    this.pendingKeys.add(key);
    this.cd.detectChanges();
    const price = this.selectedSeatPrice ?? undefined;
    const seatToAdd: Seat = { ...this.selectedSeat };
    const show = this.show;
    if (show) {
      const sectionType = SECTION_TO_ID[seatToAdd.section];
      const dbId = show.getSectionDbId(sectionType);
      if (dbId != null) seatToAdd.sectionSectionType = dbId;
    }
    this.cartSrv.addSeat(seatToAdd, showId, price).subscribe({
      next: () => {
        this.pendingKeys.delete(key);
        this.savingSeat = false;
        this.cartSliderVisible = true;
        this.toast.success('המושב נשמר בסל בהצלחה.');
        this.closeSeatDialog();
        this.showSrv.getShowById(showId).subscribe((show) => {
          this.show = show;
          this.loadOrderedSeats();
          this.cd.detectChanges();
        });
      },
      error: (err) => {
        this.pendingKeys.delete(key);
        this.savingSeat = false;
        if (err?.status === 401) {
          this.toast.warn('יש להתחבר כדי לשמור מושב.');
          this.cd.detectChanges();
          return;
        }
        const status = err?.status;
        const msg = err?.error?.message ?? err?.message ?? '';
        if (
          status === 409 ||
          status === 400 ||
          /taken|נבחר|occupied|unavailable/i.test(String(msg))
        ) {
          this.toast.warn('המושב נבחר בינתיים על ידי משתמש אחר.');
          this.showSrv.getShowById(showId).subscribe((show) => {
            this.show = show;
            this.loadOrderedSeats();
            this.cd.detectChanges();
          });
        } else {
          this.toast.error('שגיאה בשמירת המושב. נסה שוב.');
        }
        this.cd.detectChanges();
      },
    });
  }

  getSeatTitle(seat: Seat, price: number | null | undefined): string {
    const position = `שורה ${seat.row + 1}, כיסא ${seat.col + 1}`;
    const base = `${position} • ${seat.section}`;
    const p = price != null && price > 0 ? `${price} ₪` : '';

    const state = this.getSeatState(seat);
    if (state === 'mine-unpaid')
      return p ? `${base} • ${p} • שמור עבורך (טרם שולם)` : `${base} • שמור עבורך (טרם שולם)`;
    if (state === 'mine-paid') return p ? `${base} • ${p} • שולם עבורך` : `${base} • שולם עבורך`;
    if (state === 'unavailable') return p ? `${base} • ${p} • לא זמין` : `${base} • לא זמין`;
    return p ? `${base} • ${p} • פנוי` : `${base} • פנוי`;
  }

  formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  goToCart(): void {
    this.cartSliderVisible = false;
    this.cd.detectChanges();
    this.goToCartClick.emit();
  }

  getShowTitleForSeat(seat: Seat): string {
    const id = seat.showId;
    if (id == null) return 'מופע';
    const s = this.showSrv.findShow(id);
    return s?.title ?? 'מופע';
  }

  getShowForSeat(seat: Seat): Show | undefined {
    const id = seat.showId;
    if (id == null) return undefined;
    return this.showSrv.findShow(id);
  }

  /** Display price: seat.price or show's section price. */
  getSeatPrice(seat: Seat): number {
    if (seat.price != null && seat.price > 0) return seat.price;
    const show = this.getShowForSeat(seat);
    return this.showSrv.getSectionPrice(show ?? null, seat.section);
  }

  /** True if this show has the given section (from API). sectionId: 1=HALL, 2=RIGHT_BALCONY, 3=LEFT_BALCONY, 4=CENTER_BALCONY. */
  hasSectionForShow(sectionId: number): boolean {
    return this.show?.sectionIdsFromApi?.includes(sectionId) ?? false;
  }

  /** Message for hover when section is not offered in this show. */
  getSectionUnavailableMessage(sectionId: number): string {
    return 'יציע זה לא זמין במופע זה';
  }

  getSeatTooltip(seat: Seat, sectionId: number, price: number | null | undefined): string {
    if (this.showIsPast) return 'המופע הסתיים ולא ניתן להזמין מושבים';
    if (this.showIsSoldOut) return 'לא נותרו מושבים זמינים במופע זה';
    if (!this.hasSectionForShow(sectionId)) return this.getSectionUnavailableMessage(sectionId);
    return this.getSeatTitle(seat, price);
  }
}
