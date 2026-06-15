import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { UsersService } from '../../../services/users-service';
import { AuthMessageService } from '../../../services/auth-message-service';
import { FloatLabel } from 'primeng/floatlabel';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../services/auth-service';
import { ShowsService } from '../../../services/shows-service';
import { Show } from '../../../models/show-model';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    FloatLabel,
    PasswordModule,
    DialogModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  userSrv: UsersService = inject(UsersService);
  private router = inject(Router);
  private authMessage = inject(AuthMessageService);
  email: string = null as unknown as string;
  pass: string = '';
  private authService = inject(AuthService);
  private showsService = inject(ShowsService);
  private confirmationService = inject(ConfirmationService);

  forgotPasswordVisible = false;
  forgotPasswordStep: 1 | 2 | 3 = 1;
  forgotPasswordEmail = '';
  forgotPasswordCode = '';
  forgotPasswordNewPass = '';
  forgotPasswordError = '';
  sendingCode = false;
  resettingPassword = false;
  /** Shown when login fails (wrong password or user not found). */
  loginError = signal<string>('');
  cleanupDialogVisible = false;
  cleanupSelectionMode = false;
  cleanupActionInProgress = false;
  cleanupError = '';
  cleanupCandidateShows: Show[] = [];
  selectedCleanupShowIds: number[] = [];

  openForgotPasswordDialog() {
    this.forgotPasswordVisible = true;
    this.forgotPasswordStep = 1;
    this.forgotPasswordEmail = this.email || '';
    this.forgotPasswordCode = '';
    this.forgotPasswordNewPass = '';
    this.forgotPasswordError = '';
  }

  closeForgotPasswordDialog() {
    this.forgotPasswordVisible = false;
    this.forgotPasswordStep = 1;
    this.forgotPasswordError = '';
  }

  sendResetCode() {
    const email = this.forgotPasswordEmail?.trim();
    if (!email) {
      this.forgotPasswordError = 'נא להזין כתובת דוא"ל';
      return;
    }
    this.forgotPasswordError = '';
    this.sendingCode = true;
    this.userSrv.requestPasswordResetCode(email).subscribe({
      next: (res) => {
        this.sendingCode = false;
        if (res.sent) {
          this.forgotPasswordStep = 2;
          this.authMessage.showSuccess('קוד אימות נשלח לדוא"ל שלך.');
        } else {
          const msg = res.message || 'לא ניתן לשלוח קוד. נסה שוב.';
          this.forgotPasswordError = msg;
          this.authMessage.showError(msg);
        }
      },
      error: (err) => {
        this.sendingCode = false;
        const msg = err?.error?.message || err?.message || 'שגיאה בשליחת הקוד. ייתכן שהדוא"ל לא רשום.';
        this.forgotPasswordError = msg;
        this.authMessage.showError(msg);
      },
    });
  }

  submitNewPassword() {
    const email = this.forgotPasswordEmail?.trim();
    const code = this.forgotPasswordCode?.trim();
    const newPass = this.forgotPasswordNewPass;
    if (!email || !code) {
      this.forgotPasswordError = 'נא להזין דוא"ל וקוד אימות';
      return;
    }
    if (!newPass || newPass.length < 4) {
      this.forgotPasswordError = 'הסיסמה חייבת להכיל לפחות 4 תווים';
      return;
    }
    this.forgotPasswordError = '';
    this.resettingPassword = true;
    this.userSrv.resetPasswordWithCode(email, code, newPass).subscribe({
      next: (res) => {
        this.resettingPassword = false;
        if (res.success) {
          this.forgotPasswordStep = 3;
          this.authMessage.showSuccess('הסיסמה עודכנה בהצלחה.');
        } else {
          const msg = res.message || 'איפוס הסיסמה נכשל. נסה שוב.';
          this.forgotPasswordError = msg;
          this.authMessage.showError(msg);
        }
      },
      error: (err) => {
        this.resettingPassword = false;
        const msg = err?.error?.message || err?.message || 'שגיאה בעדכון הסיסמה. ייתכן שהקוד לא תקף או שפג תוקפו.';
        this.forgotPasswordError = msg;
        this.authMessage.showError(msg);
      },
    });
  }

  login() {
    this.loginError.set('');
    if (!this.email?.trim()) {
      this.loginError.set('נא להזין כתובת דוא"ל');
      return;
    }
    if (!this.pass?.trim()) {
      this.loginError.set('נא להזין סיסמה');
      return;
    }
    this.userSrv.login(this.email, this.pass).subscribe({
      next: (res: { status: number; body: any }) => {
        if (res.status === 204) {
          const msg = 'כתובת הדוא"ל או הסיסמה שגויים. נסה שוב.';
          this.loginError.set(msg);
          this.authMessage.showError(msg);
          return;
        }
        const response = res.body;
        this.authService.login(response.id, response.firstName);
        this.authMessage.showSuccess('התחברת בהצלחה!');
        this.handlePostLoginFlow(Number(response.id));
      },
      error: (err) => {
        const status = err?.status;
        const body = err?.error;
        const msg = typeof body === 'string' ? body : (body?.message ?? body?.error ?? err?.message);
        if (status === 401 || status === 404) {
          const loginMsg = 'כתובת הדוא"ל או הסיסמה שגויים. נסה שוב.';
          this.loginError.set(loginMsg);
          this.authMessage.showError(loginMsg);
        } else if (msg) {
          this.loginError.set(msg);
          this.authMessage.showError(msg);
        } else {
          const loginMsg = 'ההתחברות נכשלה. נסה שוב.';
          this.loginError.set(loginMsg);
          this.authMessage.showError(loginMsg);
        }
      },
    });
  }

  private handlePostLoginFlow(userId: number) {
    this.authService.checkIsManager(userId).subscribe({
      next: (isManager) => {
        if (!isManager) {
          this.continueToShowsPage();
          return;
        }
        this.openAdminCleanupIfNeeded();
      },
      error: () => {
        this.continueToShowsPage();
      },
    });
  }

  private openAdminCleanupIfNeeded() {
    this.cleanupActionInProgress = true;
    this.showsService.getShowsForAdminCleanup().subscribe({
      next: (shows) => {
        this.cleanupActionInProgress = false;
        const oldShows = shows
          .filter((show) => this.isShowEndedMoreThanTwoWeeksAgo(show))
          .sort((a, b) => this.getShowEndDate(a).getTime() - this.getShowEndDate(b).getTime());

        if (oldShows.length === 0) {
          this.continueToShowsPage();
          return;
        }

        this.cleanupCandidateShows = oldShows;
        this.selectedCleanupShowIds = [];
        this.cleanupSelectionMode = false;
        this.cleanupError = '';
        this.cleanupDialogVisible = true;
      },
      error: () => {
        this.cleanupActionInProgress = false;
        this.continueToShowsPage();
      },
    });
  }

  private getShowEndDate(show: Show): Date {
    const end = new Date(show.date);
    const endTime = show.endTime;

    if (typeof endTime === 'string' && endTime.includes(':')) {
      const [h, m] = endTime.split(':').map((val) => Number(val));
      end.setHours(Number.isFinite(h) ? h : 23, Number.isFinite(m) ? m : 59, 0, 0);
      return end;
    }

    if (endTime instanceof Date) {
      end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
      return end;
    }

    end.setHours(23, 59, 59, 999);
    return end;
  }

  private isShowEndedMoreThanTwoWeeksAgo(show: Show): boolean {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 14);
    return this.getShowEndDate(show).getTime() < threshold.getTime();
  }

  deleteAllOldShows() {
    const showIds = this.cleanupCandidateShows.map((show) => show.id);
    this.confirmationService.confirm({
      header: 'מחיקת מופעים ישנים',
      message: `למחוק את כל ${showIds.length} המופעים הישנים שנמצאו?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'כן, מחיקה',
      rejectLabel: 'ביטול',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.deleteOldShows(showIds),
    });
  }

  openCleanupSelectionMode() {
    this.cleanupSelectionMode = true;
    this.cleanupError = '';
  }

  backToCleanupQuestion() {
    this.cleanupSelectionMode = false;
    this.cleanupError = '';
  }

  deleteSelectedOldShows() {
    const validIds = (this.selectedCleanupShowIds ?? []).filter((id) =>
      this.cleanupCandidateShows.some((show) => show.id === id),
    );
    if (validIds.length === 0) {
      const msg = 'יש לבחור לפחות מופע אחד למחיקה.';
      this.cleanupError = msg;
      this.authMessage.showError(msg);
      return;
    }
    this.confirmationService.confirm({
      header: 'מחיקת מופעים נבחרים',
      message: `למחוק ${validIds.length} מופעים שנבחרו?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'כן, מחיקה',
      rejectLabel: 'ביטול',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => this.deleteOldShows(validIds),
    });
  }

  skipCleanupAndContinue() {
    this.cleanupDialogVisible = false;
    this.cleanupSelectionMode = false;
    this.cleanupError = '';
    this.continueToShowsPage();
  }

  private deleteOldShows(ids: number[]) {
    this.cleanupError = '';
    this.cleanupActionInProgress = true;
    this.showsService.deleteShowsByIds(ids).subscribe({
      next: () => {
        this.cleanupActionInProgress = false;
        this.cleanupDialogVisible = false;
        this.cleanupSelectionMode = false;
        this.authMessage.showSuccess(`נמחקו ${ids.length} מופעים שהסתיימו לפני יותר משבועיים.`);
        this.continueToShowsPage();
      },
      error: () => {
        this.cleanupActionInProgress = false;
        const msg = 'מחיקת המופעים נכשלה. נסה שוב או המשך ללא מחיקה.';
        this.cleanupError = msg;
        this.authMessage.showError(msg);
      },
    });
  }

  private continueToShowsPage() {
    this.router.navigate(['/shows']);
  }
}
