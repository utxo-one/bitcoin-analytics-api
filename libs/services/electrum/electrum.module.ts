import { Module } from '@nestjs/common';
import { ElectrumService } from './electrum.service';

@Module({
  providers: [ElectrumService],
  exports: [ElectrumService],
})
export class ElectrumModule {}
