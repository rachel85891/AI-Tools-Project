import { Component, DestroyRef, OnInit, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CartService } from '../../services/cart-service';
import { ShowsService } from '../../services/shows-service';
import { OrderConfirmationEmailRequest, UsersService } from '../../services/users-service';
import { AuthService } from '../../services/auth-service';
import { Seat } from '../../models/seat-model';
import { Show } from '../../models/show-model';
import { User } from '../../models/user-model';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ToastService } from '../../services/toast-service';
import { startWith } from 'rxjs';

const STEPS = {
  ORDER_SUMMARY: 1,
  USER_DETAILS: 2,
  PAYMENT: 3,
  CONFIRMATION: 4,
} as const;

/** Snapshot of one item for the order confirmation view. */
export interface ConfirmationItem {
  showTitle: string;
  section: string;
  row: number;
  col: number;
  showDate: Date | string;
  showTime: string;
  price: number;
}

/** Luhn check and basic card validation. */
function luhnCheck(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (isEven) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function cardNumberValidator(control: AbstractControl): ValidationErrors | null {
  const digits = String(control.value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length < 13 || digits.length > 19) return { pattern: true };
  return luhnCheck(digits) ? null : { luhn: true };
}

function expiryValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value || '').trim();
  if (!v) return null;
  const [mm, yy] = v.split(/[/-]/).map((s: string) => s.trim());
  const month = parseInt(mm, 10);
  const year = parseInt(yy?.length === 2 ? '20' + yy : yy, 10);
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return { invalidExpiry: true };
  }
  const now = new Date();
  const exp = new Date(year, month, 0);
  return exp >= now ? null : { expired: true };
}

type PaymentMethod = 'card' | 'paypal';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    FloatLabelModule,
    DatePipe,
  ],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.scss'],
})
export class CheckoutComponent implements OnInit {
  private cartSrv = inject(CartService);
  private showSrv = inject(ShowsService);
  private usersSrv = inject(UsersService);
  private authSrv = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly STEPS = STEPS;
  currentStep = signal<number>(STEPS.ORDER_SUMMARY);
  cartItems: Seat[] = [];
  user = signal<User | null>(null);
  userLoadError = signal<string | null>(null);
  orderConfirmationCode = signal<string>('');
  /** Set after successful placeOrder: order creation date from server. */
  orderCreatedAt = signal<Date | null>(null);
  /** Snapshot of ordered items for confirmation (row, col, show date/time, etc.). */
  confirmationItems = signal<ConfirmationItem[]>([]);
  totalPaid = signal<number>(0);
  emailStatus = signal<'success' | 'error' | null>(null);
  emailStatusMessage = signal<string>('');
  placingOrder = signal<boolean>(false);
  placeOrderError = signal<string | null>(null);
  paymentForm: FormGroup;

  steps = [
    { index: 1, label: 'סיכום הזמנה' },
    { index: 2, label: 'פרטי משתמש' },
    { index: 3, label: 'תשלום' },
    { index: 4, label: 'אישור' },
  ];

  totalToPay(): number {
    return this.cartItems.reduce((sum, s) => sum + this.getSeatPrice(s), 0);
  }

  constructor() {
    effect(() => {
      this.cartItems = this.cartSrv.cart();
    });

    this.paymentForm = this.fb.group({
      paymentMethod: ['card', [Validators.required]],
      cardHolder: [''],
      cardNumber: [
        '',
        [],
      ],
      expiry: [''],
      cvv: [''],
      idNumber: [''],
      paypalEmail: [''],
    });

    this.bindPaymentMethodValidation();
  }

  ngOnInit(): void {
    if (!this.cartSrv.isLoggedIn) {
      this.router.navigate(['/cart']);
      return;
    }
    this.cartSrv.loadCartFromUser(true);
    const userId = this.cartSrv.getCurrentUserId();
    if (userId > 0) {
      this.usersSrv.getUserById(userId).subscribe({
        next: (u) => this.user.set(u),
        error: () => {
          const msg = 'לא ניתן לטעון פרטי משתמש';
          this.userLoadError.set(msg);
          this.toast.error(msg);
        },
      });
    }
  }

  getShow(showId: number | undefined): Show | undefined {
    if (showId == null) return undefined;
    return this.showSrv.findShow(showId);
  }

  getSeatPrice(seat: Seat): number {
    if (seat.price != null && seat.price > 0) return seat.price;
    const show = this.getShow(seat.showId);
    return this.showSrv.getSectionPrice(show ?? null, seat.section);
  }

  get currentStepValue(): number {
    return this.currentStep();
  }

  goNext(): void {
    const step = this.currentStep();
    if (step === STEPS.PAYMENT && !this.paymentForm.valid) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    if (step === STEPS.PAYMENT && step + 1 === STEPS.CONFIRMATION) {
      this.placeOrder();
      return;
    }
    if (step < STEPS.CONFIRMATION) {
      this.currentStep.set(step + 1);
    }
  }

  goPrev(): void {
    const step = this.currentStep();
    if (step > STEPS.ORDER_SUMMARY) {
      this.currentStep.set(step - 1);
    }
  }

  /** Confirm payment: POST order to server, then clear cart and show confirmation. */
  placeOrder(): void {
    const items = this.cartItems;
    const orderItemIds = items.map((s) => s.id).filter((id): id is number => id != null);
    if (orderItemIds.length === 0) {
      const msg = 'אין פריטים לאישור';
      this.placeOrderError.set(msg);
      this.toast.warn(msg);
      return;
    }
    this.placingOrder.set(true);
    this.placeOrderError.set(null);
    const total = this.totalToPay();

    this.cartSrv.confirmOrder(orderItemIds).subscribe({
      next: (res) => {
        this.placingOrder.set(false);
        const code = res.confirmationCode ?? 'TB-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const createdAt = res.date ? new Date(res.date) : new Date();
        const confirmationItems = this.buildConfirmationItems(items);
        this.orderConfirmationCode.set(code);
        this.orderCreatedAt.set(createdAt);
        this.totalPaid.set(total);
        this.confirmationItems.set(confirmationItems);
        this.emailStatus.set(null);
        this.emailStatusMessage.set('');
        this.sendOrderEmail({
          orderCode: code,
          createdAt,
          totalPaid: total,
          items: confirmationItems,
        });
        this.cartSrv.clearCart();
        this.cartItems = [];
        this.currentStep.set(STEPS.CONFIRMATION);
        this.toast.success('ההזמנה בוצעה בהצלחה.');
      },
      error: (err) => {
        this.placingOrder.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'אישור ההזמנה נכשל. נסה שוב.';
        this.placeOrderError.set(msg);
        this.toast.error(msg);
      },
    });
  }

  private buildConfirmationItems(seats: Seat[]): ConfirmationItem[] {
    return seats.map((seat) => {
      const show = this.getShow(seat.showId);
      const price = this.getSeatPrice(seat);
      const date = show?.date;
      const beginTime = show?.beginTime;
      let showTime = '';
      if (beginTime != null) {
        const t = typeof beginTime === 'string' ? beginTime : (beginTime instanceof Date ? beginTime.toTimeString() : '');
        showTime = String(t).substring(0, 5);
      }
      return {
        showTitle: show?.title ?? 'מופע',
        section: typeof seat.section === 'string' ? seat.section : String(seat.section),
        row: seat.row + 1,
        col: seat.col + 1,
        showDate: date ?? '',
        showTime,
        price,
      };
    });
  }

  private sendOrderEmail(data: {
    orderCode: string;
    createdAt: Date;
    totalPaid: number;
    items: ConfirmationItem[];
  }): void {
    const u = this.user();
    const email = (u?.emailAddress ?? '').trim();
    if (!email) return;

    const payload: OrderConfirmationEmailRequest = {
      email,
      firstName: (u?.firstName ?? '').trim(),
      orderCode: data.orderCode,
      orderDate: data.createdAt.toISOString(),
      totalPaid: data.totalPaid,
      items: data.items.map((item) => ({
        showTitle: item.showTitle,
        section: item.section,
        row: item.row,
        col: item.col,
        showDate: this.toIsoIfValidDate(item.showDate),
        showTime: item.showTime,
        price: item.price,
      })),
    };

    this.usersSrv.sendOrderConfirmationEmail(payload).subscribe({
      next: (r) => {
        if (r?.sent) {
          this.emailStatus.set('success');
          this.emailStatusMessage.set('מייל עם פרטי ההזמנה נשלח אליך בהצלחה.');
          return;
        }
        this.emailStatus.set('error');
        this.emailStatusMessage.set(r?.message || 'ההזמנה בוצעה, אבל לא הצלחנו לשלוח את המייל.');
        this.toast.warn(r?.message || 'לא הצלחנו לשלוח מייל אישור הזמנה.');
      },
      error: () => {
        this.emailStatus.set('error');
        this.emailStatusMessage.set('ההזמנה בוצעה, אבל שליחת המייל נכשלה.');
        // Keep checkout success flow intact even if email sending fails.
        this.toast.warn('ההזמנה בוצעה, אבל שליחת המייל נכשלה.');
      },
    });
  }

  private toIsoIfValidDate(value: Date | string): string {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  isStepActive(stepIndex: number): boolean {
    return this.currentStep() === stepIndex;
  }

  isStepCompleted(stepIndex: number): boolean {
    return this.currentStep() > stepIndex;
  }

  goToEditProfile(): void {
    this.router.navigate(['/personal-area']);
  }

  formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 19);
    return digits.match(/.{1,4}/g)?.join(' ') ?? '';
  }

  onCardNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatCardNumber(input.value);
    this.paymentForm.patchValue({ cardNumber: formatted.replace(/\s/g, '') }, { emitEvent: false });
    input.value = formatted;
  }

  formatExpiry(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  onExpiryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatExpiry(input.value);
    this.paymentForm.patchValue({ expiry: formatted }, { emitEvent: false });
    input.value = formatted;
  }

  onCvvInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 4);
    this.paymentForm.patchValue({ cvv: digits }, { emitEvent: false });
    input.value = digits;
  }

  onIdNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 9);
    this.paymentForm.patchValue({ idNumber: digits }, { emitEvent: false });
    input.value = digits;
  }

  get selectedPaymentMethod(): PaymentMethod {
    const method = this.paymentForm.get('paymentMethod')?.value;
    return method === 'paypal' ? 'paypal' : 'card';
  }

  private bindPaymentMethodValidation(): void {
    const methodControl = this.paymentForm.get('paymentMethod');
    methodControl?.valueChanges
      .pipe(
        startWith(methodControl.value),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((method) => {
        this.applyPaymentMethodValidation(method === 'paypal' ? 'paypal' : 'card');
      });
  }

  private applyPaymentMethodValidation(method: PaymentMethod): void {
    const cardValidators: Record<string, any[]> = {
      cardHolder: [Validators.required, Validators.minLength(2)],
      cardNumber: [Validators.required, cardNumberValidator],
      expiry: [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/), expiryValidator],
      cvv: [Validators.required, Validators.pattern(/^\d{3,4}$/)],
      idNumber: [Validators.required, Validators.pattern(/^\d{9}$/)],
    };

    for (const field of ['cardHolder', 'cardNumber', 'expiry', 'cvv', 'idNumber']) {
      const control = this.paymentForm.get(field);
      if (!control) continue;
      control.setValidators(method === 'card' ? cardValidators[field] : []);
      if (method !== 'card') {
        control.setErrors(null);
      }
      control.updateValueAndValidity({ emitEvent: false });
    }

    const paypalEmailControl = this.paymentForm.get('paypalEmail');
    if (!paypalEmailControl) return;
    paypalEmailControl.setValidators(method === 'paypal' ? [Validators.required, Validators.email] : [Validators.email]);
    if (method !== 'paypal') {
      paypalEmailControl.setErrors(null);
    }
    paypalEmailControl.updateValueAndValidity({ emitEvent: false });
  }

  seatKey(seat: Seat): string {
    return `${seat.section}-${seat.row}-${seat.col}-${seat.id ?? ''}`;
  }

  get userName(): string {
    return this.authSrv.userName() || this.user()?.firstName + ' ' + (this.user()?.lastName ?? '') || 'משתמש';
  }
}
