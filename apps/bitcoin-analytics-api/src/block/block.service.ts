import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BlockEntity } from '@app/entities/block/block.entity';

@Injectable()
export class BlockService {
  constructor(
    @InjectRepository(BlockEntity)
    private readonly blockRepository: Repository<BlockEntity>,
  ) {}

  async getBlockByHeight(height: number): Promise<BlockEntity> {
    return this.blockRepository.findOne({ where: { height } });
  }

  async getBlockByHash(hash: string): Promise<BlockEntity> {
    return this.blockRepository.findOne({ where: { hash } });
  }
}
