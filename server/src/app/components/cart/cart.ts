import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../../services/cart-service';
import { ShowsService } from '../../services/shows-service';
import { Seat } from '../../models/seat-model';
import { Show } from '../../models/show-model';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, CardModule, DatePipe],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
})
export class CartComponent implements OnInit {
  private cartSrv = inject(CartService);
  private showSrv = inject(ShowsService);
  private confirmationService = inject(ConfirmationService);

  readonly unpaidCartItems = this.cartSrv.cart;
  readonly paidCartItems = this.cartSrv.paidUpcoming;
  isLoggedIn = false;

  ngOnInit(): void {
    this.isLoggedIn = this.cartSrv.isLoggedIn;
    this.cartSrv.loadCartFromUser(true);
    this.showSrv.getFilteredShows({});
  }

  get totalToPay(): number {
    return this.unpaidCartItems().reduce((sum, s) => sum + this.getSeatPrice(s), 0);
  }

  get hasPayableItems(): boolean {
    return this.unpaidCartItems().length > 0;
  }

  get paidUpcomingItems(): Seat[] {
    return this.paidCartItems().filter((seat) => this.isSeatShowUpcoming(seat));
  }

  get hasAnyCartItems(): boolean {
    return this.unpaidCartItems().length > 0 || this.paidUpcomingItems.length > 0;
  }

  getShow(showId: number | undefined): Show | undefined {
    if (showId == null) return undefined;
    return this.showSrv.findShow(showId);
  }

  /** Display price: seat.price or show's section price. */
  getSeatPrice(seat: Seat): number {
    if (seat.price != null && seat.price > 0) return seat.price;
    const show = this.getShow(seat.showId);
    return this.showSrv.getSectionPrice(show ?? null, seat.section);
  }

  removeSeat(seat: Seat): void {
    if (this.isPaidSeat(seat)) return;
    this.confirmationService.confirm({
      header: 'הסרת מושב',
      message: 'להסיר את המושב מהסל?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'כן, הסר',
      rejectLabel: 'ביטול',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.cartSrv.removeSeat(seat);
      },
    });
  }

  isPaidSeat(seat: Seat): boolean {
    return seat.orderStatus === 2;
  }

  private isSeatShowUpcoming(seat: Seat): boolean {
    const show = this.getShow(seat.showId);
    if (!show) return true;
    return !show.isPast;
  }

  goToPayment(): void {
    if (!this.isLoggedIn) return;
  }

  seatKey(seat: Seat): string {
    return `${seat.section}-${seat.row}-${seat.col}-${seat.id ?? ''}`;
  }
}
