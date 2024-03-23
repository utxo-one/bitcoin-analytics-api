import { Module } from '@nestjs/common';
import { LndServiceService } from './lnd-service.service';

@Module({
  imports: [],
  providers: [LndServiceService],
})
export class LndServiceModule {}
