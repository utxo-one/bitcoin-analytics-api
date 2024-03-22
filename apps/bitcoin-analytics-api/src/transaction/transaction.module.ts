import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '../../../../libs/entities/src/transaction/transaction.entity';
import { TransactionOutputEntity } from '../../../../libs/entities/src/transaction/transaction-output.entity';
import { TransactionInputEntity } from '../../../../libs/entities/src/transaction/transaction-input.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TransactionEntity,
      TransactionOutputEntity,
      TransactionInputEntity,
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}
