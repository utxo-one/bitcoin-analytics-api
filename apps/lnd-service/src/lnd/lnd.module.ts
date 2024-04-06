import { Module } from '@nestjs/common';
import { LndService } from './lnd.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LnChannel, LnPolicy } from '@app/entities/graph/ln_channel';
import { LnNode } from '@app/entities/graph/ln_node';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([LnNode, LnChannel, LnPolicy]),
  ],
  providers: [LndService],
  exports: [LndService],
})
export class LndModule {}
