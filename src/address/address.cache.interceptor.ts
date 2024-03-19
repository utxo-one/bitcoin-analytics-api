import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AddressCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  getCacheKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    const address = request.params.address;
    return `address:${address}`;
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const key = this.getCacheKey(context);
    const ttl = 30; // cache time to live in seconds

    const cachedResponse = await this.cacheManager.get(key);
    if (cachedResponse) {
      return of(cachedResponse);
    }

    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheManager.set(key, response, ttl);
      }),
    );
  }
}
