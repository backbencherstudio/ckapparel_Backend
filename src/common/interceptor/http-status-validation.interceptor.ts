import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, map, throwError } from 'rxjs';

@Injectable()
export class HttpStatusValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: any) => {
        if (data && typeof data === 'object') {
          if (this.isValidHttpStatus(data.statusCode)) {
            response.status(data.statusCode);
          } else if (
            data.statusCode !== undefined &&
            !this.isValidHttpStatus(data.statusCode)
          ) {
            throw new InternalServerErrorException({
              success: false,
              message: 'Invalid status code returned by handler',
            });
          }

          if (data.success === false) {
            const status = this.resolveStatusFromPayload(data, response.statusCode);

            throw new HttpException(
              {
                success: false,
                message: data.message || 'Request failed',
              },
              status,
            );
          }
        }

        return data;
      }),
      catchError((error: any) => {
        if (error instanceof HttpException) {
          const status = error.getStatus();
          if (this.isValidHttpStatus(status)) {
            return throwError(() => error);
          }

          return throwError(
            () =>
              new InternalServerErrorException({
                success: false,
                message: 'Invalid HTTP status code',
              }),
          );
        }

        const status = this.resolveStatusFromError(error);
        const message =
          error?.message ||
          'Unexpected server error. Please try again later.';

        return throwError(
          () =>
            new HttpException(
              {
                success: false,
                message,
              },
              status,
            ),
        );
      }),
    );
  }

  private resolveStatusFromPayload(payload: any, fallbackStatus?: number): number {
    if (this.isValidHttpStatus(payload?.statusCode)) {
      return payload.statusCode;
    }

    if (this.isValidHttpStatus(payload?.status)) {
      return payload.status;
    }

    if (this.isValidHttpStatus(fallbackStatus) && fallbackStatus! >= 400) {
      return fallbackStatus!;
    }

    const errorText = String(payload?.error || payload?.message || '').toLowerCase();

    if (errorText.includes('unauthorized')) {
      return HttpStatus.UNAUTHORIZED;
    }

    if (errorText.includes('forbidden')) {
      return HttpStatus.FORBIDDEN;
    }

    if (errorText.includes('not found')) {
      return HttpStatus.NOT_FOUND;
    }

    if (errorText.includes('conflict')) {
      return HttpStatus.CONFLICT;
    }

    return HttpStatus.BAD_REQUEST;
  }

  private resolveStatusFromError(error: any): number {
    const candidate = error?.statusCode ?? error?.status;
    if (this.isValidHttpStatus(candidate)) {
      return candidate;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private isValidHttpStatus(status: any): status is number {
    return Number.isInteger(status) && status >= 100 && status <= 599;
  }
}
