import { Controller, Get } from '@nestjs/common';
import { LndService } from 'src/lnd/lnd.service';

@Controller('lightning')
export class LightningController {
  constructor(private readonly lndService: LndService) {}

  @Get('info')
  async getInfo() {
    return this.lndService.getInfo();
  }

  @Get('channels')
  async getChannels() {
    return this.lndService.getAllChannels();
  }

  @Get('graph')
  async getGraph() {
    return this.lndService.subscrbeToChannelGraph();
  }
}
