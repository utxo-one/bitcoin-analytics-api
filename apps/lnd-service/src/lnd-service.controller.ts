import { Controller, Get } from '@nestjs/common';
import { LndServiceService } from './lnd-service.service';

@Controller()
export class LndServiceController {
  constructor(private readonly lndServiceService: LndServiceService) {}

  @Get()
  getHello(): string {
    return this.lndServiceService.getHello();
  }
}
