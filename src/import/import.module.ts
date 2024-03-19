import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from 'src/transaction/entities/transaction.entity';
import { TransactionOutputEntity } from 'src/transaction/entities/transaction-output.entity';
import { TransactionInputEntity } from 'src/transaction/entities/transaction-input.entity';
import { BlockEntity } from 'src/block/entities/block.entity';
import { ExchangeRateEntity } from 'src/exchange-rate/entities/exchange-rate.entity';
import { BitcoindModule } from 'src/bitcoind/bitcoin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      TransactionOutputEntity,
      TransactionInputEntity,
      BlockEntity,
      ExchangeRateEntity,
    ]),
    BitcoindModule,
  ],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
