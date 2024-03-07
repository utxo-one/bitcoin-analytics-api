import { Controller, Get, Param } from '@nestjs/common';
import { BitcoinService } from './bitcoin.service';

@Controller('bitcoin')
export class BitcoinController {
  constructor(private readonly bitcoinService: BitcoinService) {}

  @Get('block/height/:height')
  getBlockByHeight(@Param('height') height: number) {
    console.log('height', height);
    return this.bitcoinService.getBlockByHeight(height);
  }

  @Get('transaction/:txid')
  getTransactionByHash(@Param('txid') txid: string) {
    return this.bitcoinService.getTransactionByHash(txid);
  }

  @Get('rates/:height')
  getRates(@Param('height') height: number) {
    return this.bitcoinService.getExchangeRateByBlockHeight(height);
  }
}
