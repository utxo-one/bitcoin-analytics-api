import { Controller, Get } from '@nestjs/common';
import { LndService } from '../lnd/lnd.service';

@Controller('lightning')
export class LightningController {
  constructor(private readonly lndService: LndService) {}

  @Get('info')
  async getInfo() {
    return this.lndService.getInfo();
  }
}
