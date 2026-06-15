import { Section } from "./show-model";

export class Seat {
  id?: number; // set by backend when seat is locked (order item id)
  status: boolean = false;
  /** Ordered seat status from backend: 0=available, 1=reserved(not paid), 2=sold(paid). */
  orderStatus?: number;
  userId: number = 0;
  row: number = 0;
  col: number = 0;
  section: Section = Section.HALL;
  /** Set when adding to cart: show id for display and for backend orderedSeats. */
  showId?: number;
  /** Price for this section (for cart display and total). */
  price?: number;
  /** DB section row id for this show (sent to lock API; distinct from section type 1–4). */
  sectionId?:number;
  sectionSectionType?: number;
  orderId:number=0;
}
