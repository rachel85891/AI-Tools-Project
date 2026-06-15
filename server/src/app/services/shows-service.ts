import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable, of } from 'rxjs';
import { Category } from '../models/category-model';
import { CategorySrvice } from './category-srvice';
import { Sector, Show, TargetAudience, SECTION_ID_MAP, Section } from '../models/show-model';
import { OrderedSeatDto } from '../models/show-model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, tap, catchError } from 'rxjs/operators';
import { SeatMap } from '../models/map-model';

@Injectable({
  providedIn: 'root',
})

export class ShowsService {
  shows: Show[] = [];
  categories: Category[] = [];
  audiences:TargetAudience[]=Object.values(TargetAudience)
  sectors:Sector[]=Object.values(Sector)
  // הוסף משתנה BehaviorSubject כדי לנהל את הנתונים
  private showsSubject = new BehaviorSubject<Show[]>([]);
  shows$ = this.showsSubject.asObservable(); // זה מה שהקומפוננטה תירשם אליו
  /** Upcoming shows for carousel only – not affected by filters/paging. */
  private upcomingShowsSubject = new BehaviorSubject<Show[]>([]);
  upcomingShows$ = this.upcomingShowsSubject.asObservable();
  /** Set when loadShows fails (e.g. 404 – backend not running). Cleared on success. */
  private showsLoadErrorSubject = new BehaviorSubject<string | null>(null);
  showsLoadError$ = this.showsLoadErrorSubject.asObservable();
  constructor(private http: HttpClient, private categorySrv: CategorySrvice) {}

  /** Ensure we always send an array of numbers for category filter (handles object/value quirks). */
  private normalizeCategoryIds(categoryId: unknown): number[] {
    if (categoryId == null) return [];
    if (Array.isArray(categoryId)) {
      return categoryId
        .map((item) => (typeof item === 'number' ? item : (item as { id?: number })?.id))
        .filter((id): id is number => typeof id === 'number' && !isNaN(id));
    }
    const single = typeof categoryId === 'number' ? categoryId : Number(categoryId);
    return !isNaN(single) ? [single] : [];
  }

  /** Map one API show item to Show model (sections, maps, orderedSeats). */
  private mapShowFromApi(item: any): Show {
    const show = new Show(item);
    show.date = new Date(item.date);
    if (item.beginTime) show.beginTime = item.beginTime.substring(0, 5);
    if (item.endTime) show.endTime = item.endTime.substring(0, 5);
    if (item.sections && Array.isArray(item.sections)) {
      show.sectionIdsFromApi = item.sections
        .map((s: any) => Number(s.sectionTypeId ?? s.sectionType ?? s.id))
        .filter((n: number) => !isNaN(n) && n >= 1 && n <= 4);
      item.sections.forEach((sec: any) => {
        const sectionTypeId = Number(sec.sectionTypeId ?? sec.sectionType ?? sec.id);
        const sectionDbId = Number(sec.id);
        if (!isNaN(sectionDbId) && sectionDbId > 0) {
          show.sectionDbIdByType[sectionTypeId] = sectionDbId;
        }
        const sectionType = SECTION_ID_MAP[sectionTypeId];
        if (sectionType) {
          const price = typeof sec.price === 'number' ? sec.price : (Number(sec.price) || 0);
          const mapObj = new SeatMap(price, sectionType);
          switch (sectionType) {
            case Section.HALL: show.hallMap = mapObj; break;
            case Section.RIGHT_BALCONY: show.rightBalMap = mapObj; break;
            case Section.LEFT_BALCONY: show.leftBalMap = mapObj; break;
            case Section.CENTER_BALCONY: show.centerBalMap = mapObj; break;
          }
        }
      });
    }
    show.orderedSeats = Array.isArray(item.orderedSeats)
      ? item.orderedSeats.map((s: any) => {
          const sectionId = Number(s.sectionId ?? s.SectionId ?? 0);
          const directSectionType = Number(s.sectionSectionType ?? s.sectionTypeId ?? s.sectionType ?? 0);
          let sectionSectionType = !isNaN(directSectionType) ? directSectionType : 0;
          if (sectionSectionType < 1 || sectionSectionType > 4) {
            if (sectionId >= 1 && sectionId <= 4) {
              sectionSectionType = sectionId;
            } else if (sectionId > 4) {
              const byDbId = Object.entries(show.sectionDbIdByType).find(([, dbId]) => Number(dbId) === sectionId);
              sectionSectionType = byDbId ? Number(byDbId[0]) : 0;
            }
          }
          const status = Number(s.status ?? s.Status ?? 1);
          return {
            sectionId: !isNaN(sectionId) ? sectionId : 0,
            row: Number(s.row ?? 0),
            col: Number(s.col ?? 0),
            orderUserId: Number(s.orderUserId ?? s.userId ?? s.UserId ?? 0),
            sectionSectionType: !isNaN(sectionSectionType) ? sectionSectionType : 0,
            status: !isNaN(status) ? status : 1,
          };
        })
      : [];
    const sectionPrices = [
      show.hallMap?.price,
      show.leftBalMap?.price,
      show.rightBalMap?.price,
      show.centerBalMap?.price,
    ].filter((p): p is number => typeof p === 'number' && p > 0);
    if (sectionPrices.length > 0 && (show.minPrice == null || show.minPrice === 0)) {
      show.minPrice = Math.min(...sectionPrices);
    }
    return show;
  }

  private _loadShowsInit() {
    // this.loadShows();
    
    // הזרקת הנתונים מה-Service לתוך המשתנה המקומי
    this.categorySrv.categories$.subscribe(data => {
      this.categories = data;
    });
  }

  public getFilteredShows(filters: any) {
    this.loadShows(filters, false);
  }

  /** Load upcoming shows for carousel only (no filters, no paging). Independent of getFilteredShows. */
  loadUpcomingShows(): void {
    this.loadShows({ skip: 200, position: 1 }, true);
  }

  private loadShows(filters: any = {}, forUpcoming: boolean = false) {
    let params = new HttpParams();
    if (filters.description) {
      params = params.set('description', filters.description);
    }

    if (typeof filters.minPrice === 'number') params = params.set('minPrice', filters.minPrice.toString());
    if (typeof filters.maxPrice === 'number') params = params.set('maxPrice', filters.maxPrice.toString());

    params = params.set('skip', filters.skip?.toString() ?? '1000');
    params = params.set('position', filters.position?.toString() ?? '1');
    params = params.set('sortField',filters.sortField?.toString()??'Title')
    params = params.set('sortOrder',filters.sortOrder?.toString()??'1')

    const categoryIds = this.normalizeCategoryIds(filters.categoryId);
    if (categoryIds.length > 0) {
      categoryIds.forEach((id) => {
        params = params.append('categoryIdS', id.toString());
      });
    }

    if (filters.sectors && filters.sectors.length > 0) {
      filters.sectors.forEach((sector: string) => {
        params = params.append('sectors', sector);
      });
    }

    if (filters.audiences && filters.audiences.length > 0) {
      filters.audiences.forEach((audience: string) => {
        params = params.append('audiences', audience);
      });
    }
    this.http.get<any[]>('/api/Shows', { params })
    .pipe(
      map(data => data.map(item => this.mapShowFromApi(item)))
    ).subscribe({
      next: (shows) => {
        this.showsLoadErrorSubject.next(null);
        if (forUpcoming) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const upcoming = [...shows]
            .filter((s) => new Date(s.date) >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 15);
          this.upcomingShowsSubject.next(upcoming);
          return;
        }
        this.shows = shows;
        this.showsSubject.next(shows); // עדכון כל מי שמאזין
      },
      error: (error) => {
        console.error('Error loading shows:', error);
        const msg = error?.status === 404
          ? 'שרת ה-API לא זמין (404). וודא שהשרת רץ ב־https://localhost:44304'
          : (error?.error?.message || error?.message || 'טעינת המופעים נכשלה');
        this.showsLoadErrorSubject.next(msg);
        // אם יש שגיאה, עדכון עם מערך ריק כדי לא לשבור את הקומפוננטות
        this.showsSubject.next([]);
      }
    });
  }
  private buildAddShowBody(show: Show): Record<string, unknown> {
    const dateStr = show.date instanceof Date
      ? show.date.toISOString().slice(0, 10)
      : String(show.date).slice(0, 10);
    const beginTimeStr = this.formatTimeForServer(show.beginTime);
    const endTimeStr = this.formatTimeForServer(show.endTime);

    return {
      Title: show.title,
      Date: dateStr,
      BeginTime: beginTimeStr,
      EndTime: endTimeStr,
      Audience: show.audience,
      Sector: show.sector,
      Description: show.description ?? '',
      ImgUrl: show.imgUrl ?? '',
      ProviderId: show.providerId,
      CategoryId: show.categoryId,
    };
  }
  private buildUpdateShowBody(show: Show): Record<string, unknown> {
    const dateStr = show.date instanceof Date
      ? show.date.toISOString().slice(0, 10)
      : String(show.date).slice(0, 10);
    const beginTimeStr = this.formatTimeForServer(show.beginTime);
    const endTimeStr = this.formatTimeForServer(show.endTime);

    return {
      Id: show.id,
      Title: show.title,
      Date: dateStr,
      BeginTime: beginTimeStr,
      EndTime: endTimeStr,
      Audience: show.audience,
      Sector: show.sector,
      Description: show.description ?? '',
      ImgUrl: show.imgUrl ?? '',
      ProviderId: show.providerId,
      CategoryId: show.categoryId,
    };
  }

  private formatTimeForServer(value: string | Date | undefined): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.substring(0, 5);
    if (value instanceof Date) {
      const h = value.getHours().toString().padStart(2, '0');
      const m = value.getMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    }
    return '';
  }

  /** POST new show to server, then reload shows list. Returns observable for success/error handling. */
  addShow(show: Show): Observable<Show> {
    const userId = localStorage.getItem('user');
    const body = this.buildAddShowBody(show);
    return this.http.post<Show>(`/api/Shows?userId=${userId}`, body).pipe(
      tap(() => this.loadShows({})),
      catchError((err) => {
        console.error('addShow failed', err);
        throw err;
      }),
    );
  }

  /** PUT update show on server, then reload shows list. Returns observable for success/error handling. */
  updateShow(show: Show): Observable<Show> {
    const userId = localStorage.getItem('user');
    const body = this.buildUpdateShowBody(show);
    return this.http.put<Show>(`/api/Shows/${show.id}?userId=${userId}`, body).pipe(
      tap(() => this.loadShows({})),
      catchError((err) => {
        console.error('updateShow failed', err);
        throw err;
      }),
    );
  }

  deleteShow(id: number): Observable<void> {
    const userId = localStorage.getItem('user');
    return this.http.delete<void>(`/api/Shows/${id}?userId=${userId}`).pipe(
      tap(() => this.loadShows({})),
      catchError((err) => {
        console.error('deleteShow failed', err);
        throw err;
      }),
    );
  }

  /** Admin cleanup helper: fetch a broad first page so login can detect old ended shows. */
  getShowsForAdminCleanup(limit: number = 5000): Observable<Show[]> {
    const params = new HttpParams()
      .set('skip', limit.toString())
      .set('position', '1')
      .set('sortField', 'Date')
      .set('sortOrder', '1');
    return this.http.get<any[]>('/api/Shows', { params }).pipe(
      map((data) => data.map((item) => this.mapShowFromApi(item)))
    );
  }

  /** Admin cleanup helper: delete selected show ids without per-show confirm prompts. */
  deleteShowsByIds(ids: number[]): Observable<void[]> {
    const userId = localStorage.getItem('user');
    const validIds = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0);
    if (!userId || validIds.length === 0) {
      return of([] as void[]);
    }
    const requests = validIds.map((id) => this.http.delete<void>(`/api/Shows/${id}?userId=${userId}`));
    return forkJoin(requests).pipe(
      tap(() => this.loadShows({})),
      catchError((err) => {
        console.error('deleteShowsByIds failed', err);
        throw err;
      }),
    );
  }


  findShow(id: number): Show | undefined {
    const s = this.shows.find(p => p.id === id);
    if (s) return s;
    return this.upcomingShowsSubject.getValue().find(p => p.id === id);
  }

  /**
   * Get show by id (for seats map). Returns show with orderedSeats from API.
   * On 404 or error, returns show from cache with orderedSeats = [] so map can still render.
   */
  getShowById(id: number): Observable<Show> {
    return this.http.get<any>(`/api/Shows/${id}`).pipe(
      map((item) => this.mapShowFromApi(item)),
      catchError(() => {
        const s = this.findShow(id);
        if (s) {
          s.orderedSeats = s.orderedSeats ?? [];
          return of(s);
        }
        return of(new Show({ id, orderedSeats: [] }));
      })
    );
  }

  /** Section price for a show (for cart/slider when seat.price is missing). Accepts Section enum or sectionId number. */
  getSectionPrice(show: Show | undefined | null, section: Section | number): number {
    if (!show) return 0;
    const sec: Section = typeof section === 'number' ? (SECTION_ID_MAP[section] ?? Section.HALL) : section;
    if (show.hallMap?.section === sec) {
      const p = show.hallMap?.price;
      return p != null && typeof p === 'number' ? p : (Number(p) || 0);
    }
    if (show.leftBalMap?.section === sec) {
      const p = show.leftBalMap?.price;
      return p != null && typeof p === 'number' ? p : (Number(p) || 0);
    }
    if (show.rightBalMap?.section === sec) {
      const p = show.rightBalMap?.price;
      return p != null && typeof p === 'number' ? p : (Number(p) || 0);
    }
    if (show.centerBalMap?.section === sec) {
      const p = show.centerBalMap?.price;
      return p != null && typeof p === 'number' ? p : (Number(p) || 0);
    }
    return 0;
  }

  categoryById(id:number){
    return this.categories.find(c=>c.id === id)?.name
}
showsFromProvider(providerId:number){
  return this.shows.filter(p=>p.providerId === providerId)
}
showsFromCategory(categoryId:number){
  return this.shows.filter(p=>p.categoryId === categoryId)
}
addSection(price: number | undefined | null, showId: number, sectionType: number): Observable<any> {
  const body = {
    price: price,
    showId: showId,
    sectionType: sectionType
  };
  return this.http.post<any>('/api/Section', body);
}

}

