import { Component, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Sector, Show, TargetAudience } from '../../models/show-model';
import { ShowsService } from '../../services/shows-service';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AddShow } from './add-show/add-show';
import { CategorySrvice } from '../../services/category-srvice';
import { DrawerModule } from 'primeng/drawer';
import { ShowShow } from './show-show/show-show';
import { SeatsMap } from '../seats-map/seats-map';
import { Category } from '../../models/category-model';
import { CommonModule, DatePipe } from '@angular/common';
import { CarouselModule } from 'primeng/carousel';
import { SliderModule } from 'primeng/slider';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { SelectItem } from 'primeng/api';
import { DataViewModule } from 'primeng/dataview';
import { SelectModule } from 'primeng/select';
import { PaginatorModule } from 'primeng/paginator';
import { Observable } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { ImageService } from '../../services/image-service';
import { EditShow } from './edit-show/edit-show';
import { AuthService } from '../../services/auth-service';
import { ConfirmationService } from 'primeng/api';
import { ToastService } from '../../services/toast-service';
@Component({
  selector: 'app-shows',
  imports: [
    ButtonModule,
    AddShow,
    CardModule,
    DrawerModule,
    ShowShow,
    SeatsMap,
    CarouselModule,
    CheckboxModule,
    FormsModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SliderModule,
    DatePipe,
    CommonModule,
    DataViewModule,
    SelectModule,
    PaginatorModule,
    EditShow,
  ],
  templateUrl: './show.html',
  styleUrl: './show.scss',
})
export class ShowsComponent {
  authService: AuthService = inject(AuthService);
  readonly TargetAudience = TargetAudience;
  readonly Sector = Sector;
  private categorySrv = inject(CategorySrvice);
  showSrv: ShowsService = inject(ShowsService);
  shows$: Observable<Show[]> = this.showSrv.shows$;
  shows: Show[] = this.showSrv.shows;
  pro: Show = new Show();
  visible: boolean = false;
  pId: number = 0;
  pTitle: string = '';
  /** Separate drawer: only seat map (opened by "לבחירת מקום"). */
  seatsDrawerVisible: boolean = false;
  seatsDrawerShowId: number = 0;
  seatsDrawerTitle: string = '';
  categories: Category[] = [];
  audiences: TargetAudience[] = this.showSrv.audiences;
  sectors: Sector[] = this.showSrv.sectors;
  selectedCategories: any[] = [];
  selectedAudiences: any[] = [];
  priceRange: number[] = [0, 1000];
  selectedSectors: any[] = [];
  searchTerm: string = '';
  responsiveOptions: any;
  sortOptions: SelectItem[] = [];
  sortOrder: number = 1;
  sortField: string = 'title';
  /** Paging: skip = items per page, position = 1-based page number */
  pageSize: number = 12;
  currentPage: number = 1;
  /** Total records for paginator; if API doesn't return total, we estimate so "Next" appears when we got a full page. */
  get totalRecords(): number {
    if (this.shows.length < this.pageSize) {
      return (this.currentPage - 1) * this.pageSize + this.shows.length;
    }
    return (this.currentPage * this.pageSize) + 1;
  }
  upcomingShows: Show[] = [];
  showsLoadError: string | null = null;
  private cd = inject(ChangeDetectorRef);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private toast = inject(ToastService);
  imageSrv: ImageService = inject(ImageService);
  showToEdit: Show | null = null;
  @ViewChild('editShowRef') editShowRef!: EditShow;
  /** Called after add-show succeeds; list refreshes when service loadShows() completes (shows$). */
  addShow(_p: Show) {}

  getAll() {
    this.shows = this.showSrv.shows;
  }

  ngOnInit() {
    this.shows = this.showSrv.shows;
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

    this.sortOptions = [
      { label: 'מחיר: מהנמוך לגבוה', value: 'price' },
      { label: 'מחיר: מהגבוה לנמוך', value: '!price' },
      { label: 'פופולריות', value: 'popularity' },
      { label: 'שם המופע (א-ת)', value: 'title' }
    ];
    this.showSrv.loadUpcomingShows();
    this.showSrv.upcomingShows$.subscribe((list) => {
      this.upcomingShows = list;
      this.cd.detectChanges();
    });
    this.showSrv.showsLoadError$.subscribe((err) => {
      this.showsLoadError = err;
      this.cd.detectChanges();
    });
    this.shows$.subscribe((shows) => {
      this.shows = shows; // template binds to this.shows – must update when service emits
      this.cd.detectChanges();
    });

    this.showSrv.getFilteredShows({
      skip: this.pageSize,
      position: this.currentPage,
    });

    this.categorySrv.loadCategories().subscribe();
    this.categorySrv.categories$.subscribe(data => {
      this.categories = data;
    });
  }
  openShow(id: number) {
    this.pId = id;
    this.pTitle = this.showSrv.findShow(id)?.title ?? '';
    this.cd.detectChanges();
    setTimeout(() => {
      this.visible = true;
      this.cd.detectChanges();
    }, 0);
  }
  /** Opens only the seat-map drawer (no card details). */
  toChoosePlace(id: number) {
    this.seatsDrawerShowId = id;
    this.seatsDrawerTitle = this.showSrv.findShow(id)?.title ?? '';
    this.seatsDrawerVisible = true;
  }

  /** Called from show-show when user clicks "לבחירת מקום" there; opens seats drawer and closes details. */
  openSeatsDrawer(showId: number) {
    this.visible = false;
    this.toChoosePlace(showId);
  }

  /** Called from show-show "עוד בקטגוריה" when user clicks "..." on a related show; switch details drawer to that show. */
  openShowDetailsFromDrawer(showId: number) {
    this.pId = showId;
    this.pTitle = this.showSrv.findShow(showId)?.title ?? '';
    this.cd.detectChanges();
  }

  /** Close seats drawer and navigate to cart (called from seats-map "מעבר לסל"). */
  closeSeatsDrawerAndGoToCart() {
    this.seatsDrawerVisible = false;
    this.router.navigate(['/cart']);
  }

  onSortChange(event: any) {
    const value = event.value;
    if (value.indexOf('!') === 0 ) {
      this.sortOrder = -1; // סדר יורד
      this.sortField = value.substring(1, value.length);
    } else {
      this.sortOrder = 1; // סדר עולה
      this.sortField = value;
    }
    this.applyFilters();
  }

  /** Keep priceRange as a proper array and apply filters (fixes slider showing 0 after change). */
  onPriceRangeChange(ev: { value?: number | number[] }) {
    const val = ev?.value;
    if (Array.isArray(val) && val.length === 2) {
      this.priceRange = [val[0], val[1]];
    }
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategories = [];
    this.selectedAudiences = [];
    this.selectedSectors = [];
    this.priceRange = [0, 1000];
    this.sortOrder = 1;
    this.sortField = 'title';
    this.currentPage = 1;
    this.showSrv.getFilteredShows({
      skip: this.pageSize,
      position: this.currentPage,
    });
  }

  /** Strip to Hebrew + spaces so backend Contains() matches DB (DB may have different emoji). */
  private hebrewOnly(val: string): string {
    return val ? val.replace(/[^\u0590-\u05FF\s]/g, '').trim() : '';
  }

  /** Full range = no price filter so backend returns shows with no Sections too (e.g. 1060, 1070). */
  private readonly fullPriceRange = [0, 1000] as const;

  applyFilters() {
    const [minP, maxP] = this.priceRange;
    const useFullRange = minP === this.fullPriceRange[0] && maxP === this.fullPriceRange[1];
    const filterParams = {
      description: this.searchTerm?.trim() ?? '',
      categoryId: this.selectedCategories ?? [],
      audiences: (this.selectedAudiences ?? []).map((a) => this.hebrewOnly(a)).filter(Boolean),
      sectors: (this.selectedSectors ?? []).map((s) => this.hebrewOnly(s)).filter(Boolean),
      minPrice: useFullRange ? undefined : minP,
      maxPrice: useFullRange ? undefined : maxP,
      sortField: this.sortField,
      sortOrder: this.sortOrder,
      skip: this.pageSize,
      position: this.currentPage,
    };
    this.showSrv.getFilteredShows(filterParams);
  }

  onPageChange(event: { page?: number; first?: number; rows?: number }) {
    const page = event.page ?? 0;
    this.currentPage = page + 1; // PrimeNG page is 0-based, API position is 1-based
    this.applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getAllShows() {
    return this.showSrv.shows$;
  }

  deleteShow(id: number) {
    this.confirmationService.confirm({
      header: 'מחיקת מופע',
      message: 'האם אתה בטוח שברצונך למחוק את המופע?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'מחיקה',
      rejectLabel: 'ביטול',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.showSrv.deleteShow(id).subscribe({
          next: () => {
            this.shows = this.shows.filter((s) => s.id !== id);
            this.toast.success('המופע נמחק בהצלחה.');
            this.cd.detectChanges();
          },
          error: () => {
            this.toast.error('מחיקת המופע נכשלה.');
          },
        });
      },
    });
  }

  editShow(id: number) {
    this.showToEdit = this.showSrv.findShow(id) ?? null;
    setTimeout(() => this.editShowRef?.showDialog(), 0);
    this.cd.detectChanges();
  }

  updateShow(show: Show) {
    this.shows = this.shows.map((s) => s.id === show.id ? show : s);
    this.cd.detectChanges();
  }
}
