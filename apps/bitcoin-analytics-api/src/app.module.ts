import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitcoindModule } from './bitcoind/bitcoin.module';
import { ExchangeRateModule } from './exchange-rate/exchange-rate.module';
import { ImportModule } from './import/import.module';
import { TransactionModule } from './transaction/transaction.module';
import { BlockModule } from './block/block.module';
import { AddressModule } from './address/address.module';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisOptions } from './config/redis.config';
import { LndModule } from './lnd/lnd.module';
import { LightningModule } from './lightning/lightning.module';
import { WinstonModule } from 'nest-winston';
import { ElectrumModule } from './electrum/electrum.module';
import * as winston from 'winston';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.registerAsync(RedisOptions),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
      logging: ['error'],
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple(),
          ),
        }),
      ],
    }),
    BitcoindModule,
    ExchangeRateModule,
    ImportModule,
    BlockModule,
    TransactionModule,
    AddressModule,
    LndModule,
    LightningModule,
    ElectrumModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
