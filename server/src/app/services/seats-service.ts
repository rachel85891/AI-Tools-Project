import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Seat } from '../models/seat-model';
import { SECTION_ID_MAP } from '../models/show-model';

/** Seat status from DB: 0 = available, 1 = reserved (10 min), 2 = sold. */

@Injectable({
  providedIn: 'root',
})
export class SeatsService {
  constructor(private http: HttpClient) {}

  private toNumber(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  /** Normalize backend section fields to section type id 1..4. */
  private resolveSectionType(dto: any): number {
    const direct =
      this.toNumber(dto?.sectionSectionType) ||
      this.toNumber(dto?.sectionTypeId) ||
      this.toNumber(dto?.sectionType);
    if (direct >= 1 && direct <= 4) return direct;

    const sectionId = this.toNumber(dto?.sectionId);
    if (sectionId >= 1 && sectionId <= 4) return sectionId;

    return 0;
  }

  /** Get ordered (reserved/sold) seats for a show from GET /api/OrderedSeat/showId/{showId}. */
  getOrderedSeats(showId: number): Observable<Seat[]> {
    return this.http.get<any[]>(`/api/OrderedSeat/showId/${showId}`).pipe(
      map((data) =>
        data.map((dto) => {
          const seat = new Seat();
          seat.id = this.toNumber(dto.id);
          seat.row = this.toNumber(dto.row);
          seat.col = this.toNumber(dto.col);
          seat.userId = this.toNumber(dto.orderUserId ?? dto.userId ?? dto.UserId);
          /** 1 = reserved, 2 = sold => unavailable on map */
          const rawStatus = dto.status ?? dto.Status;
          const parsedStatus = rawStatus == null ? 1 : this.toNumber(rawStatus);
          const statusNum = parsedStatus === 0 || parsedStatus === 1 || parsedStatus === 2 ? parsedStatus : 1;
          seat.orderStatus = statusNum;
          seat.status = statusNum !== 0;
          const sectionType = this.resolveSectionType(dto);
          if (sectionType >= 1 && sectionType <= 4) {
            seat.sectionSectionType = sectionType;
            seat.section = SECTION_ID_MAP[sectionType];
          }
          const sectionDbId = this.toNumber(dto.sectionId ?? dto.SectionId);
          if (sectionDbId > 0) seat.sectionId = sectionDbId;
          seat.showId = this.toNumber(dto.showId ?? dto.ShowId);
          seat.orderId = this.toNumber(dto.orderId ?? dto.OrderId);
          return seat;
        })
      )
    );
  }
}

