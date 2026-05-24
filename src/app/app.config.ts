// import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes'; // ייבוא הפונקציה להגדרה מחדש של ערכת הנושא
import Lara from '@primeuix/themes/lara';
import { MessageService, ConfirmationService } from 'primeng/api';

import { routes } from './app.routes';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

// הגדרת Preset מותאם אישית שדורס את צבעי ה-Primary לירוק לכחול
const MyPreset = definePreset(Lara, {
    semantic: {
        primary: {
            50: '{blue.50}',
            100: '{blue.100}',
            200: '{blue.200}',
            300: '{blue.300}',
            400: '{blue.400}',
            500: '{blue.500}',
            600: '{blue.600}',
            700: '{blue.700}',
            800: '{blue.800}',
            900: '{blue.900}',
            950: '{blue.950}'
        }
    }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: MyPreset, // שימוש ב-Preset המותאם שיצרנו במקום ב-Lara המקורי
        options: {
          darkModeSelector: '.my-app-dark',
        },
      },
      ripple: true,
    }),
    provideHttpClient(
      withFetch(),
    ),
    MessageService,
    ConfirmationService,
  ],
};