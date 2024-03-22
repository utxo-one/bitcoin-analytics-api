import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionOutputEntity } from '@app/entities/transaction/transaction-output.entity';
import { TransactionEntity } from '@app/entities/transaction/transaction.entity';
import { TransactionInputEntity } from '@app/entities/transaction/transaction-input.entity';
import { BlockEntity } from '@app/entities/block/block.entity';
import { ExchangeRateEntity } from '../../../../libs/entities/src/exchange-rate/exchange-rate.entity';
import { AddressTransactionEntity } from '@app/entities/transaction/transaction-address.entity';
import { BitcoindModule } from '../bitcoind/bitcoin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      TransactionOutputEntity,
      TransactionInputEntity,
      BlockEntity,
      ExchangeRateEntity,
      AddressTransactionEntity,
    ]),
    BitcoindModule,
  ],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
