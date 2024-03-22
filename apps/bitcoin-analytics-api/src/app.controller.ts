import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { BitcoindService } from './bitcoind/bitcoind.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly bitcoinService: BitcoindService,
  ) {}
}
