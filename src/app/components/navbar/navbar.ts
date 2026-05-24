import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../services/auth-service';
import { UsersService } from '../../services/users-service';
import { Inject, PLATFORM_ID } from '@angular/core';
import { CartService } from '../../services/cart-service';
import { ConfirmationService } from 'primeng/api';
import { ToastService } from '../../services/toast-service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private cartSrv = inject(CartService);
  private confirmationService = inject(ConfirmationService);
  private toast = inject(ToastService);
  private navSubscription?: Subscription;
  public authService = inject(AuthService);
  userSrv: UsersService = inject(UsersService);
  // isLoggedIn: boolean = false;
  isLoggedIn = signal<boolean>(false);
  userName: string = 'אורח';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    this.checkLoginStatus();
    this.navSubscription = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.checkLoginStatus());
  }

  ngOnDestroy() {
    this.navSubscription?.unsubscribe();
  }

  // פונקציה שבודקת האם המשתמש מחובר (login שומר ב-'user')
  checkLoginStatus() {
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem('user');
      if (raw) {
        try {
          JSON.parse(raw);
          this.isLoggedIn.set(true);
          this.userName = localStorage.getItem('userName') || 'משתמש';
        } catch {
          this.isLoggedIn.set(false);
        }
      } else {
        this.isLoggedIn.set(false);
      }
    }
  }

  // פונקציית התנתקות
  logout() {
    this.confirmationService.confirm({
      header: 'התנתקות',
      message: 'האם אתה בטוח שברצונך להתנתק?',
      icon: 'pi pi-sign-out',
      acceptLabel: 'כן, התנתק',
      rejectLabel: 'ביטול',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.authService.logout();
        // עדכון הסטטוס כדי שהתצוגה תשתנה מיד
        this.checkLoginStatus();
        this.cartSrv.clearCart();
        this.toast.success('התנתקת בהצלחה.');
        // ניתוב חזרה לדף הבית
        this.router.navigate(['/']);
      },
    });
  }
}
