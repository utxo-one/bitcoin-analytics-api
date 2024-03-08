import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockEntity } from './entities/block.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BlockEntity])],
  controllers: [BlockController],
  providers: [BlockService],
})
export class BlockModule {}
