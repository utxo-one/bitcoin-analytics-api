import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ExchangeRateEntity } from '@app/entities/exchange-rate/exchange-rate.entity';

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
