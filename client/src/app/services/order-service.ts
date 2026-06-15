import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { CartService } from './cart-service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private readonly URL = 'api/Order'; 

  // 1. הגדרת ה-Subject שמחזיק את רשימת ההזמנות
  private ordersSubject = new BehaviorSubject<any[]>([]);
  
  // 2. חשיפת הנתונים כ-Observable לקומפוננטות
  orders$ = this.ordersSubject.asObservable();

  constructor(private http: HttpClient, private cartSrv: CartService) { 
    // כדאי לטעון את הנתונים הראשוניים מיד עם יצירת ה-Service
    this.refreshOrders();
  }

  // פונקציה פנימית לעדכון ה-Subject
  private setOrders(orders: any[]) {
    this.ordersSubject.next(orders);
  }

  /**
   * טעינה מחדש של כל ההזמנות מהשרת ועדכון המערך המקומי
   */
  refreshOrders(): void {
    this.http.get<any[]>(this.URL).subscribe(orders => {
      this.setOrders(orders || []);
    });
  }

  /**
   * POST /api/Order
   * לאחר הוספה מוצלחת, אנחנו מרעננים את הרשימה
   */
  addOrder(order: any): Observable<any> {
    return this.http.post<any>(this.URL, order).pipe(
      tap(() => this.refreshOrders()) // עדכון אוטומטי של המערך
    );
  }

  /**
   * DELETE /api/Order/{id}
   */
  unLockSeat(id: number, userId: number): Observable<any> {
    const params = new HttpParams().set('userId', userId.toString());
    return this.http.delete<any>(`${this.URL}/${id}`, { params }).pipe(
      tap(() => {
        this.refreshOrders();
        this.cartSrv.refreshCart();
      })
    );
  }

  /**
   * PUT /api/Order/{id}
   */
  checkout(id: number, checkoutDto: any): Observable<any> {
    return this.http.put<any>(`${this.URL}/${id}`, checkoutDto).pipe(
      tap(() => {
        this.refreshOrders();
        this.cartSrv.refreshCart();
      })
    );
  }

  /**
   * GET /api/Order/{id}
   */
  getOrderById(id: number): Observable<any> {
    return this.http.get<any>(`${this.URL}/${id}`);
  }

  /**
   * POST /api/Order/lock
   */
  lockSeat(lockSeatDto: any): Observable<any> {
    return this.http.post<any>(`${this.URL}/lock`, lockSeatDto).pipe(
      tap(() => {
        this.refreshOrders();
        this.cartSrv.refreshCart();
      })
    );
  }
}
