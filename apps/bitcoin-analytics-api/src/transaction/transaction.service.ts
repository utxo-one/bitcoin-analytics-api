import { Injectable } from '@nestjs/common';
import { TransactionEntity } from '@app/entities/transaction/transaction.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
  ) {}

  async getTransactionByHash(hash: string): Promise<TransactionEntity> {
    return this.transactionRepository.findOne({
      where: { hash },
      relations: ['vin', 'vout'],
    });
  }
}
