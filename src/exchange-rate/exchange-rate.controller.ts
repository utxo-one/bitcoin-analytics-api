import { Controller, Get, Param } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';

@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get('height/:height')
  async getExchangeRateByBlockHeight(@Param('height') height: number) {
    return await this.exchangeRateService.getExchangeRateByBlockHeight(height);
  }
}
