import { Module } from '@nestjs/common';
import { SnapshotService } from './snapshot.service';

@Module({
  providers: [SnapshotService],
})
export class SnapshotModule {}
