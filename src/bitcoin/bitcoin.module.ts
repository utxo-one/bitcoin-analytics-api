import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitcoinService } from './bitcoin.service';
import { BlockEntity } from './entities/block.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionOutputEntity } from './entities/transaction-output.entity';
import { TransactionInputEntity } from './entities/transaction-input.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BlockEntity, TransactionEntity, TransactionInputEntity, TransactionOutputEntity]),
  ],
  providers: [BitcoinService],
  exports: [BitcoinService], // Export BitcoinService if it will be used outside this module
})
export class BitcoinModule {}
