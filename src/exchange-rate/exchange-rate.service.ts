import { Injectable } from '@nestjs/common';
import { ExchangeRateEntity } from './entities/exchange-rate.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BlockEntity } from 'src/block/entities/block.entity';

@Injectable()
export class ExchangeRateService {
  constructor(
    @InjectRepository(ExchangeRateEntity)
    private readonly exchangeRateRepository: Repository<ExchangeRateEntity>,
  ) {}

  async getExchangeRateByBlockHeight(
    height: number,
  ): Promise<ExchangeRateEntity> {
    return this.exchangeRateRepository.findOne({
      where: { height: height },
    });
  }
}
