import { Controller, Get } from '@nestjs/common';
import { ImportService } from './import.service';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get('blockchain')
  async importBlockchain() {
    this.importService.importBlockchainData();
  }

  @Get('exchange-rate')
  async importExchangeRate() {
    this.importService.importExchangeRates();
  }
}
