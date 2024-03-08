import { Controller, Get } from '@nestjs/common';
import { BlockService } from './block.service';

@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Get('height/:height')
  async getBlockByHeight(height: number) {
    return this.blockService.getBlockByHeight(height);
  }

  @Get('hash/:hash')
  async getBlockByHash(hash: string) {
    return this.blockService.getBlockByHash(hash);
  }
}
