import { MonoTypeOperatorFunction, pipe, retry, tap, timer } from 'rxjs';

export function withLogging<T>(label: string): MonoTypeOperatorFunction<T> {
  return pipe(
    tap({
      next: val => console.log(`[${label}] →`, val),
      error: err => console.error(`[${label}] ✗`, err),
    })
  );
}

export function withRetry<T>(count: number): MonoTypeOperatorFunction<T> {
  return pipe(
    retry({
      count,
      delay: (_, attempt) => {
        console.warn(`[withRetry] attempt ${attempt}/${count}`);
        return timer(attempt * 500);
      },
    })
  );
}
