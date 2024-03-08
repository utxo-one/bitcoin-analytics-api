import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BlockEntity } from './entities/block.entity';
import { InjectRepository } from '@nestjs/typeorm';

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
