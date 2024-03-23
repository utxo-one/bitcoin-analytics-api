import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from '@app/entities/transaction/transaction.entity';
import { TransactionOutputEntity } from '@app/entities/transaction/transaction-output.entity';
import { TransactionInputEntity } from '@app/entities/transaction/transaction-input.entity';

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
