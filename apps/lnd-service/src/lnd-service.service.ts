import { Injectable } from '@nestjs/common';

@Injectable()
export class LndServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
