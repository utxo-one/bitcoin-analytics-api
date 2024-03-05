import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { BitcoinService } from './bitcoin/bitcoin.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly bitcoinService: BitcoinService) {}

  @Get()
  getHello() {
    return this.bitcoinService.importBlockchainData();
  }
}
