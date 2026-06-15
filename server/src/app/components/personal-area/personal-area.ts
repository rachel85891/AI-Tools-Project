import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { forkJoin, map, of, catchError } from 'rxjs';
import { User } from '../../models/user-model';
import { UsersService } from '../../services/users-service';
import { AuthService } from '../../services/auth-service';
import { Inject, PLATFORM_ID } from '@angular/core';
import { CategorySrvice } from '../../services/category-srvice';
import { ProviderService } from '../../services/provider-service';
import { Category } from '../../models/category-model';
import { Provider } from '../../models/provider-model';
import { AddCategory } from '../categories/add-category/add-category';
import { AddProvider } from '../providers/add-provider/add-provider';
import { ShowsService } from '../../services/shows-service';
import { ConfirmationService } from 'primeng/api';
import { ToastService } from '../../services/toast-service';

interface PersonalOrderItem {
  id: number;
  showId: number;
  sectionId: number;
  row: number;
  col: number;
  status: number;
  price: number;
}

interface PersonalOrder {
  id: number;
  date: Date | null;
  status: number;
  totalPrice: number;
  items: PersonalOrderItem[];
}

interface PersonalShowInfo {
  title: string;
  date: Date | null;
  time: string;
  show: any | null;
}

@Component({
  selector: 'app-personal-area',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    FloatLabel,
    PasswordModule,
    AddCategory,
    AddProvider,
  ],
  templateUrl: './personal-area.html',
  styleUrls: ['./personal-area.scss'],
})
export class PersonalAreaComponent implements OnInit {
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}
  private usersSrv = inject(UsersService);
  private authSrv = inject(AuthService);
  private categorySrv = inject(CategorySrvice);
  private providerSrv = inject(ProviderService);
  private showsSrv = inject(ShowsService);
  private confirmationService = inject(ConfirmationService);
  private toast = inject(ToastService);

  user = signal<User | null>(null);
  loadError = signal<string | null>(null);
  loadingOrders = signal(false);
  orders = signal<PersonalOrder[]>([]);
  selectedOrder = signal<PersonalOrder | null>(null);
  saving = signal(false);
  isAdmin = signal(false);
  adminDataLoading = signal(false);
  adminDataError = signal<string | null>(null);
  categories = signal<Category[]>([]);
  providers = signal<Provider[]>([]);
  showInfoMap = signal<Record<number, PersonalShowInfo>>({});

  /** Form model for editing (copy so we don't mutate loaded user until save). */
  editUser: User = new User();
  /** Optional new password; only sent when user types something. */
  newPassword = '';
  categoryDraftById: Record<number, string> = {};
  providerDraftById: Record<number, string> = {};

  @ViewChild('addCategoryRef') addCategoryRef!: AddCategory;
  @ViewChild('addProviderRef') addProviderRef!: AddProvider;

  orderCount = computed(() => this.orders().length);
  orderedItemsCount = computed(() =>
    this.orders().reduce((acc, order) => acc + order.items.length, 0),
  );
  totalSpent = computed(() => {
    this.showInfoMap();
    return this.orders().reduce((acc, order) => acc + this.getOrderDisplayTotal(order), 0);
  });
  userFullName = computed(() => {
    const u = this.user();
    if (!u) return '';
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  });

  private trimUser(u: User): User {
    return {
      ...u,
      firstName: (u.firstName ?? '').trim(),
      lastName: (u.lastName ?? '').trim(),
      emailAddress: (u.emailAddress ?? '').trim(),
      phoneNumber: (u.phoneNumber ?? '').trim(),
      password: u.password ?? '',
    };
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const userId = Number(localStorage.getItem('user'));
      if (!userId) {
        const msg = 'יש להתחבר כדי לראות את האזור האישי';
        this.loadError.set(msg);
        this.toast.warn(msg);
        return;
      }
      this.usersSrv.getUserById(userId).subscribe({
        next: (u: any) => {
          this.user.set(u);
          this.editUser = this.trimUser({ ...u, password: '' });
          this.loadAdminManagementIfNeeded(userId);
          this.loadingOrders.set(true);
          const orders = this.normalizeOrdersFromUser(u);
          this.orders.set(orders);
          this.loadingOrders.set(false);
          this.loadShowTitles(orders);
        },
        error: () => {
          const msg = 'לא ניתן לטעון פרטי משתמש';
          this.loadError.set(msg);
          this.toast.error(msg);
        },
      });
    }
  }

  save(): void {
    const u = this.user();
    if (!u?.id) return;
    this.saving.set(true);
    const toSend = this.trimUser({ ...this.editUser, id: u.id });
    if (this.newPassword.trim()) toSend.password = this.newPassword.trim();
    this.usersSrv.updateUser(u.id, toSend).subscribe({
      next: (updated) => {
        this.user.set(updated);
        this.editUser = this.trimUser({ ...updated, password: '' });
        this.newPassword = '';
        this.authSrv.login(String(updated.id), updated.firstName);
        this.toast.success('הפרטים נשמרו בהצלחה.');
        this.saving.set(false);
      },
      error: () => {
        this.toast.error('שגיאה בשמירת הפרטים.');
        this.saving.set(false);
      },
    });
  }

  private loadAdminManagementIfNeeded(userId: number): void {
    this.authSrv.checkIsManager(userId).subscribe({
      next: (isManager) => {
        this.isAdmin.set(isManager);
        if (isManager) {
          this.loadAdminManagementData();
        }
      },
      error: () => {
        this.isAdmin.set(false);
      },
    });
  }

  private loadAdminManagementData(): void {
    this.adminDataLoading.set(true);
    this.adminDataError.set(null);
    forkJoin({
      categories: this.categorySrv.loadCategories(),
      providers: this.providerSrv.loadProviders(),
    }).subscribe({
      next: ({ categories, providers }) => {
        this.categories.set(categories);
        this.providers.set(providers);
        this.syncCategoryDrafts(categories);
        this.syncProviderDrafts(providers);
        this.adminDataLoading.set(false);
      },
      error: () => {
        const msg = 'לא ניתן לטעון נתוני ניהול כרגע.';
        this.adminDataError.set(msg);
        this.toast.error(msg);
        this.adminDataLoading.set(false);
      },
    });
  }

  private syncCategoryDrafts(categories: Category[]): void {
    const nextDrafts: Record<number, string> = {};
    categories.forEach((category) => {
      nextDrafts[category.id] = category.name ?? '';
    });
    this.categoryDraftById = nextDrafts;
  }

  private syncProviderDrafts(providers: Provider[]): void {
    const nextDrafts: Record<number, string> = {};
    providers.forEach((provider) => {
      nextDrafts[provider.id] = provider.name ?? '';
    });
    this.providerDraftById = nextDrafts;
  }

  openAddCategoryDialog(): void {
    this.addCategoryRef?.showDialog();
  }

  openAddProviderDialog(): void {
    this.addProviderRef?.showDialog();
  }

  onCategoryAdded(_created: Category): void {
    this.refreshCategories();
    this.toast.success('הקטגוריה נוספה בהצלחה.');
  }

  onProviderAdded(_created: Provider): void {
    this.refreshProviders();
    this.toast.success('המפיק נוסף בהצלחה.');
  }

  saveCategory(category: Category): void {
    const updatedName = (this.categoryDraftById[category.id] ?? '').trim();
    if (!updatedName) {
      this.toast.error('שם קטגוריה לא יכול להיות ריק.');
      return;
    }
    if (updatedName === (category.name ?? '').trim()) return;

    this.categorySrv.updateCategory({ ...category, name: updatedName }).subscribe({
      next: (updated) => {
        this.categories.update((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.categoryDraftById[updated.id] = updated.name ?? '';
        this.toast.success('הקטגוריה עודכנה בהצלחה.');
      },
      error: () => {
        this.toast.error('עדכון הקטגוריה נכשל.');
      },
    });
  }

  deleteCategory(category: Category): void {
    this.confirmationService.confirm({
      header: 'מחיקת קטגוריה',
      message: `למחוק את הקטגוריה "${category.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'מחיקה',
      rejectLabel: 'ביטול',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.categorySrv.deleteCategory(category.id).subscribe({
          next: () => {
            this.categories.update((current) => current.filter((item) => item.id !== category.id));
            delete this.categoryDraftById[category.id];
            this.toast.success('הקטגוריה נמחקה.');
          },
          error: () => {
            this.toast.error('מחיקת הקטגוריה נכשלה. ייתכן שהיא בשימוש במופעים קיימים.');
          },
        });
      },
    });
  }

  saveProvider(provider: Provider): void {
    const updatedName = (this.providerDraftById[provider.id] ?? '').trim();
    if (!updatedName) {
      this.toast.error('שם מפיק לא יכול להיות ריק.');
      return;
    }
    if (updatedName === (provider.name ?? '').trim()) return;

    const payload: Provider = {
      ...provider,
      name: updatedName,
      profileimgUrl:
        (provider as Provider & { profileImgUrl?: string }).profileimgUrl ??
        (provider as Provider & { profileImgUrl?: string }).profileImgUrl ??
        '',
    };
    this.providerSrv.updateProvider(payload).subscribe({
      next: (updated) => {
        this.providers.update((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.providerDraftById[updated.id] = updated.name ?? '';
        this.toast.success('פרטי המפיק עודכנו.');
      },
      error: () => {
        this.toast.error('עדכון המפיק נכשל.');
      },
    });
  }

  deleteProvider(provider: Provider): void {
    this.confirmationService.confirm({
      header: 'מחיקת מפיק',
      message: `למחוק את המפיק "${provider.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'מחיקה',
      rejectLabel: 'ביטול',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.providerSrv.deleteProvider(provider.id).subscribe({
          next: () => {
            this.providers.update((current) => current.filter((item) => item.id !== provider.id));
            delete this.providerDraftById[provider.id];
            this.toast.success('המפיק נמחק.');
          },
          error: () => {
            this.toast.error('מחיקת המפיק נכשלה. ייתכן שהוא בשימוש במופעים קיימים.');
          },
        });
      },
    });
  }

  getProviderImage(provider: Provider): string {
    const p = provider as Provider & { profileImgUrl?: string };
    const path = p.profileimgUrl ?? p.profileImgUrl ?? '';
    return path ? `https://localhost:44304/${path}` : 'default.png';
  }

  private refreshCategories(): void {
    this.categorySrv.loadCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.syncCategoryDrafts(categories);
      },
      error: () => {
        this.toast.error('טעינת הקטגוריות נכשלה.');
      },
    });
  }

  private refreshProviders(): void {
    this.providerSrv.loadProviders().subscribe({
      next: (providers) => {
        this.providers.set(providers);
        this.syncProviderDrafts(providers);
      },
      error: () => {
        this.toast.error('טעינת המפיקים נכשלה.');
      },
    });
  }
  openOrderDetails(order: PersonalOrder): void {
    this.selectedOrder.set(order);
  }

  closeOrderDetails(): void {
    this.selectedOrder.set(null);
  }

  getShowTitle(showId: number): string {
    if (showId <= 0) return 'מופע';
    return this.showInfoMap()[showId]?.title ?? `מופע #${showId}`;
  }

  getShowImage(showId: number): string {
    if (showId <= 0) return 'default.png';
    const show = this.showInfoMap()[showId]?.show as { imgUrl?: string | null } | undefined;
    const path = show?.imgUrl ?? '';
    return path ? `https://localhost:44304/${path}` : 'default.png';
  }

  getOrderPreviewImage(order: PersonalOrder): string {
    const firstShowId = order.items[0]?.showId ?? 0;
    return this.getShowImage(firstShowId);
  }

  orderStatusLabel(status: number): string {
    if (status === 2) return 'הושלמה';
    if (status === 1) return 'בהמתנה';
    if (status === 0) return 'טיוטה';
    return 'לא ידוע';
  }

  getOrderDisplayDate(order: PersonalOrder): Date | null {
    if (order.date) return order.date;
    const firstShowId = order.items[0]?.showId;
    if (!firstShowId) return null;
    return this.showInfoMap()[firstShowId]?.date ?? null;
  }

  getShowDate(showId: number): Date | null {
    return this.showInfoMap()[showId]?.date ?? null;
  }

  getShowTime(showId: number): string {
    return this.showInfoMap()[showId]?.time ?? '';
  }

  getItemDisplayPrice(item: PersonalOrderItem): number {
    if (item.price > 0) return item.price;
    const show = this.showInfoMap()[item.showId]?.show;
    if (!show) return 0;
    const sectionPrice = this.showsSrv.getSectionPrice(show, item.sectionId);
    return sectionPrice > 0 ? sectionPrice : 0;
  }

  getOrderDisplayTotal(order: PersonalOrder): number {
    if (order.totalPrice > 0) return order.totalPrice;
    return order.items.reduce((sum, item) => sum + this.getItemDisplayPrice(item), 0);
  }

  private loadShowTitles(orders: PersonalOrder[]): void {
    const uniqueShowIds = [
      ...new Set(orders.flatMap((order) => order.items.map((item) => item.showId))),
    ].filter((id) => id > 0);
    if (uniqueShowIds.length === 0) return;

    const requests = uniqueShowIds.map((id) =>
      this.showsSrv.getShowById(id).pipe(
        map((show) => ({
          id,
          title: show?.title?.trim() || `מופע #${id}`,
          date: show?.date ? new Date(show.date) : null,
          time: typeof show?.beginTime === 'string' ? show.beginTime.substring(0, 5) : '',
          show: show ?? null,
        })),
        catchError(() =>
          of({
            id,
            title: `מופע #${id}`,
            date: null,
            time: '',
            show: null,
          }),
        ),
      ),
    );

    forkJoin(requests).subscribe((results) => {
      const nextMap = { ...this.showInfoMap() };
      for (const result of results) {
        nextMap[result.id] = {
          title: result.title,
          date: result.date,
          time: result.time,
          show: result.show,
        };
      }
      this.showInfoMap.set(nextMap);
    });
  }

  private normalizeOrdersFromUser(user: any): PersonalOrder[] {
    const rawOrders = this.toArray(user?.orders ?? user?.Orders);

    return rawOrders
      .map((rawOrder: any, index: number): PersonalOrder => {
        const rawItems = this.toArray(
          rawOrder?.orderedSeats ?? rawOrder?.OrderedSeats ?? rawOrder?.seats,
        );
        const items = rawItems
          .map((rawItem: any) => this.normalizeOrderItem(rawItem))
          .filter((item): item is PersonalOrderItem => item != null);

        const amountFromServer = this.toNumber(
          rawOrder?.price ?? rawOrder?.Price ?? rawOrder?.totalPrice ?? rawOrder?.TotalPrice,
        );
        const totalPrice =
          amountFromServer > 0
            ? amountFromServer
            : items.reduce((sum, item) => sum + item.price, 0);
        const orderStatus = this.toNumber(rawOrder?.status ?? rawOrder?.Status);
        const hasSoldItems = items.some((item) => item.status === 2);
        const isCompleted = orderStatus === 2 || hasSoldItems || totalPrice > 0;

        return {
          id: this.toNumber(rawOrder?.id ?? rawOrder?.Id) || index + 1,
          date: this.toDate(
            rawOrder?.date ??
              rawOrder?.Date ??
              rawOrder?.orderDate ??
              rawOrder?.OrderDate ??
              rawOrder?.purchaseDate ??
              rawOrder?.PurchaseDate ??
              rawOrder?.paymentDate ??
              rawOrder?.PaymentDate ??
              rawOrder?.createdAt ??
              rawOrder?.CreatedAt,
          ),
          status: orderStatus,
          totalPrice,
          items: isCompleted ? items : [],
        };
      })
      .filter((order) => order.items.length > 0)
      .sort((a, b) => {
        const aTime = a.date ? a.date.getTime() : 0;
        const bTime = b.date ? b.date.getTime() : 0;
        return bTime - aTime;
      });
  }

  private normalizeOrderItem(rawItem: any): PersonalOrderItem | null {
    if (rawItem == null || typeof rawItem !== 'object') return null;
    const showId = this.toNumber(rawItem?.showId ?? rawItem?.ShowId);
    const row = this.toNumber(rawItem?.row ?? rawItem?.Row);
    const col = this.toNumber(rawItem?.col ?? rawItem?.Col);
    if (showId <= 0 || row < 0 || col < 0) return null;

    return {
      id: this.toNumber(
        rawItem?.id ?? rawItem?.Id ?? rawItem?.orderedSeatId ?? rawItem?.OrderedSeatId,
      ),
      showId,
      sectionId: this.toNumber(
        rawItem?.sectionSectionType ?? rawItem?.sectionId ?? rawItem?.SectionId,
      ),
      row,
      col,
      status: this.toNumber(rawItem?.status ?? rawItem?.Status),
      price: this.toNumber(rawItem?.price ?? rawItem?.Price),
    };
  }

  private toNumber(v: unknown): number {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private toDate(v: unknown): Date | null {
    if (!v) return null;
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  }

  private toArray(v: unknown): any[] {
    return Array.isArray(v) ? v : [];
  }
}
