import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Provider } from '../models/provider-model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ProviderService {
  providers: Provider[] = [];

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
  }
  /**
   * Build request body for POST /api/Provider.
   * Adjust property names if your API expects different casing.
   */
  private buildProviderBody(provider: Provider): Record<string, unknown> {
    return {
      Name: provider.name ?? '',
      ProfileimgUrl: provider.profileimgUrl ?? '',
    };
  }

  private getCurrentUserId(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('user');
    }
    return null;
  }

  loadProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>('/api/Provider').pipe(
      tap((data) => (this.providers = data)),
    );
  }

  /**
   * POST new provider to server, then reload providers list.
   * Returns observable for success/error handling.
   */
  addProvider(provider: Provider): Observable<Provider> {
    const userId = this.getCurrentUserId();
    const body = this.buildProviderBody(provider);
    return this.http.post<Provider>(`/api/Provider?userId=${userId}`, body).pipe(
      tap((created) => {
        this.providers = [...this.providers, created];
      }),
      catchError((err) => {
        console.error('addProvider failed', err);
        throw err;
      }),
    );
  }

  updateProvider(provider: Provider): Observable<Provider> {
    const userId = this.getCurrentUserId();
    const body = this.buildProviderBody(provider);
    return this.http.put<Provider>(`/api/Provider/${provider.id}?userId=${userId}`, body).pipe(
      tap((updated) => {
        this.providers = this.providers.map((p) => (p.id === updated.id ? updated : p));
      }),
      catchError((err) => {
        console.error('updateProvider failed', err);
        throw err;
      }),
    );
  }

  deleteProvider(id: number): Observable<void> {
    const userId = this.getCurrentUserId();
    return this.http.delete<void>(`/api/Provider/${id}?userId=${userId}`).pipe(
      tap(() => {
        this.providers = this.providers.filter((p) => p.id !== id);
      }),
      catchError((err) => {
        console.error('deleteProvider failed', err);
        throw err;
      }),
    );
  }
}
