import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Category } from '../models/category-model';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, BehaviorSubject, throwError, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class CategorySrvice {
  // 1. ניהול הרשימה בתוך Subject כדי שנוכל לעדכן אותה בקלות
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  
  // 2. חשיפת ה-Subject כ-Observable עבור מי שרוצה להירשם אליו
  categories$ = this.categoriesSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private buildCategoryBody(category: Category): Record<string, unknown> {
    return {
      Name: category.name ?? '',
    };
  }

  private getCurrentUserId(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('user');
    }
    return null;
  }

  // תיקון שם הפונקציה מ-loadCategoriers ל-loadCategories
  loadCategories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/Category').pipe(
      tap((data) => {
        // מעדכנים את ה-Subject בנתונים החדשים מהשרת
        this.categoriesSubject.next(data);
      }),
      catchError((err) => {
        console.error('Failed to load categories', err);
        return throwError(() => err);
      })
    );
  }

  // פונקציית עזר לשירות הישן שקרא לה בשם עם ה-r המיותרת
  loadCategoriers() {
     return this.loadCategories();
  }

  addCategory(category: Category): Observable<Category> {
    const userId = this.getCurrentUserId();
    const body = this.buildCategoryBody(category);
    return this.http.post<Category>(`/api/Category?userId=${userId}`, body).pipe(
      tap((created) => {
        // עדכון הרשימה המקומית בזיכרון מיד עם הצלחת הפעולה
        const current = this.categoriesSubject.value;
        this.categoriesSubject.next([...current, created]);
      }),
      catchError((err) => {
        console.error('addCategory failed', err);
        return throwError(() => err);
      })
    );
  
}

  updateCategory(category: Category): Observable<Category> {
    const userId = this.getCurrentUserId();
    const body = this.buildCategoryBody(category);
    return this.http.put<Category>(`/api/Category/${category.id}?userId=${userId}`, body).pipe(
      tap((updated) => {
        const current = this.categoriesSubject.value;
        this.categoriesSubject.next(current.map((c) => (c.id === updated.id ? updated : c)));
      }),
      catchError((err) => {
        console.error('updateCategory failed', err);
        return throwError(() => err);
      })
    );
  }

  deleteCategory(id: number): Observable<void> {
    const userId = this.getCurrentUserId();
    return this.http.delete<void>(`/api/Category/${id}?userId=${userId}`).pipe(
      tap(() => {
        const current = this.categoriesSubject.value;
        this.categoriesSubject.next(current.filter((c) => c.id !== id));
      }),
      catchError((err) => {
        console.error('deleteCategory failed', err);
        return throwError(() => err);
      })
    );
  }
}
