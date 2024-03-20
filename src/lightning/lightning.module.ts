import { Module } from '@nestjs/common';
import { LightningService } from './lightning.service';
import { LightningController } from './lightning.controller';
import { LndModule } from 'src/lnd/lnd.module';

@Module({
  providers: [LightningService],
  controllers: [LightningController],
  imports: [LndModule],
})
export class LightningModule {}
