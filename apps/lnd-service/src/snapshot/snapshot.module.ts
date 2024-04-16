import { Module } from '@nestjs/common';
import { SnapshotService } from './snapshot.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Snapshot } from '@app/entities/snapshot/snapshot';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Snapshot])],
  providers: [SnapshotService],
})
export class SnapshotModule {}
