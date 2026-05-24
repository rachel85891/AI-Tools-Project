import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  constructor(private http: HttpClient) {}

  upload(file: File): Observable<any> {
    const formData = new FormData();
    // השם 'file' חייב להיות זהה לשם הפרמטר ב-Controller ב-.NET
    formData.append('file', file, file.name);

    return this.http.post('/api/images/upload', formData);
  }
  // In image-service.ts
  // private baseUrl = 'https://localhost:44304';

  // (path: string | null | undefined): string | null {
  //   if (!path) return null;
  //   if (path.startsWith('http://') || path.startsWith('https://')) return path;
  //   const base = this.baseUrl.replace(/\/$/, '');
  //   const pathNorm = path.startsWith('/') ? path : `/${path}`;
  //   return `${base}${pathNorm}`;
  // }
}
