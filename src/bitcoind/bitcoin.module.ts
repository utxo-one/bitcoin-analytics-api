import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitcoindService } from './bitcoind.service';
import { BlockEntity } from '../block/entities/block.entity';
import { TransactionInputEntity } from '../transaction/entities/transaction-input.entity';
import { ExchangeRateEntity } from '../exchange-rate/entities/exchange-rate.entity';
import { TransactionEntity } from 'src/transaction/entities/transaction.entity';
import { TransactionOutputEntity } from 'src/transaction/entities/transaction-output.entity';

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
