import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isLoggedIn = signal<boolean>(false);
  userName = signal<string>('אורח');
  isAdmin = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private http: HttpClient) {
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      this.isLoggedIn.set(!!localStorage.getItem('user'));
      this.userName.set(localStorage.getItem('userName') || 'אורח');
      const userId = localStorage.getItem('user');
      if (userId) {
        this.checkIsManager(Number(userId)).subscribe();
      }
    }
  }

  login(id: string, name: string) {
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      localStorage.setItem('user', id);
      localStorage.setItem('userName', name);
      this.checkIsManager(Number(id)).subscribe();
    }
    this.isLoggedIn.set(true);
    this.userName.set(name);
  }

  logout() {
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('userName');
      this.isAdmin.set(false);
    }
    this.isAdmin.set(false);
    this.isLoggedIn.set(false);
    this.userName.set('אורח');
  }

  checkIsManager(id: number): Observable<boolean> {
    return this.http.get<boolean>(`/api/Users/isManger?id=${id}`).pipe(
      tap((isManager) => {
        this.isAdmin.set(isManager);
      })
    );
  }
}