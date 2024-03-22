import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitcoindService } from './bitcoind.service';
import { BlockEntity } from '@app/entities/block/block.entity';
import { TransactionEntity } from '@app/entities/transaction/transaction.entity';
import { TransactionInputEntity } from '@app/entities/transaction/transaction-input.entity';
import { TransactionOutputEntity } from '@app/entities/transaction/transaction-output.entity';
import { ExchangeRateEntity } from '../../../../libs/entities/src/exchange-rate/exchange-rate.entity';

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
  providers: [BitcoindService],
  exports: [BitcoindService],
  controllers: [], // Export BitcoinService if it will be used outside this module
})
export class BitcoindModule {}
