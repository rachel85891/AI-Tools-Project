import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { User } from '../../../models/user-model';
import { UsersService } from '../../../services/users-service';
import { AuthMessageService } from '../../../services/auth-message-service';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../services/auth-service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    FloatLabel,
    PasswordModule,
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  userSrv: UsersService = inject(UsersService);
  newUser: User = new User();
  private router = inject(Router);
  private authMessage = inject(AuthMessageService);
  private authService = inject(AuthService);
  signup() {
    this.userSrv.signup(this.newUser).subscribe({
      next: (response: any) => {
        this.authService.login(response.id, response.firstName);
        this.authMessage.showSuccess('נרשמת בהצלחה!');
        this.router.navigate(['/shows']);
      },
      error: (err) => {
        console.error('קרתה שגיאה:', err);
        const msg = err?.error?.message ?? err?.message ?? 'הרשמה נכשלה. נסה שוב.';
        this.authMessage.showError(msg);
      },
    });
  }
}
