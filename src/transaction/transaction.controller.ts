import { Controller, Get } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get('hash/:hash')
  async getTransactionByHash(hash: string) {
    return await this.transactionService.getTransactionByHash(hash);
  }
}
