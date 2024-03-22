import { Module } from '@nestjs/common';
import { LndServiceController } from './lnd-service.controller';
import { LndServiceService } from './lnd-service.service';

@Module({
  imports: [],
  controllers: [LndServiceController],
  providers: [LndServiceService],
})
export class LndServiceModule {}
