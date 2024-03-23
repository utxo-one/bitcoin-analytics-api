import { Module } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRateController } from './exchange-rate.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangeRateEntity } from '@app/entities/exchange-rate/exchange-rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExchangeRateEntity])],
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService],
})
export class ExchangeRateModule {}
