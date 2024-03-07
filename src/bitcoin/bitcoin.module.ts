import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitcoinService } from './bitcoin.service';
import { BlockEntity } from './entities/block.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionOutputEntity } from './entities/transaction-output.entity';
import { TransactionInputEntity } from './entities/transaction-input.entity';
import { ExchangeRateEntity } from './entities/exchange-rate.entity';
import { BitcoinController } from './bitcoin.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      BlockEntity,
      TransactionEntity,
      TransactionInputEntity,
      TransactionOutputEntity,
      ExchangeRateEntity,
    ]),
  ],
  providers: [BitcoinService],
  exports: [BitcoinService],
  controllers: [BitcoinController], // Export BitcoinService if it will be used outside this module
})
export class BitcoinModule {}
