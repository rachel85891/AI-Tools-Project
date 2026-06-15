import { Injectable,Injector,inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { User } from '../models/user-model';
import { CartService } from './cart-service';

export interface OrderConfirmationEmailItem {
  showTitle: string;
  section: string;
  row: number;
  col: number;
  showDate: string;
  showTime: string;
  price: number;
}

export interface OrderConfirmationEmailRequest {
  email: string;
  firstName: string;
  orderCode: string;
  orderDate: string;
  totalPaid: number;
  items: OrderConfirmationEmailItem[];
}

export interface SendOrderConfirmationEmailResponse {
  sent: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})

export class UsersService {
    constructor(private http: HttpClient,private injector: Injector) {}
  private readonly usersUrl = '/api/Users';
  user: User = new User()
  //private cartSrv = inject(CartService);
  /** Returns status and body so caller can treat 204 as failed login. */
  login(email: string, pass: string): Observable<{ status: number; body: any }> {
    const data = {
      password: pass,
      emailAddress: email
    };
    return this.http.post(`${this.usersUrl}/loginUser`, data, { observe: 'response' }).pipe(
      tap(res => {
        const userData=res.body as {id:number | null}
        if (userData && userData.id) {
          localStorage.setItem('user', JSON.stringify(userData.id));
          const cartSrv = this.injector.get(CartService);
          cartSrv.loadCartFromUser(true); 
        }
      }),
      map(res => ({ status: res.status, body: res.body }))
    );
  }

  /** Request a password-reset code sent to the user's email. */
  requestPasswordResetCode(email: string): Observable<{ sent: boolean; message?: string }> {
    return this.http.post<{ sent: boolean; message?: string }>(`${this.usersUrl}/forgot-password`, { email });
  }

  /** Reset password using the code received by email. */
  resetPasswordWithCode(email: string, code: string, newPassword: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.usersUrl}/reset-password`, {
      email,
      code,
      newPassword,
    });
  }

  /** Send a post-checkout order summary email to the user. */
  sendOrderConfirmationEmail(payload: OrderConfirmationEmailRequest): Observable<SendOrderConfirmationEmailResponse> {
    return this.http.post<SendOrderConfirmationEmailResponse>(`${this.usersUrl}/send-order-confirmation`, payload);
  }

  signup(user:User){
    return this.http.post(`${this.usersUrl}/user`, user);
  }

  /** Get user by id for checkout/profile display. */
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.usersUrl}/${id}`);
  }

  /** Update user details on the server. */
  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.usersUrl}/${id}`, user);
  }

  getUserNameById(id:number){
    this.http.get<User>(`api/Users/${id}`).subscribe((data)=>{
      this.user = data
    })
    return this.user.firstName
  }
}
