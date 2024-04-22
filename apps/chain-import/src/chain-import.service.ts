import { Injectable } from '@nestjs/common';

@Injectable()
export class ChainImportService {
  getHello(): string {
    return 'Hello World!';
  }
}
