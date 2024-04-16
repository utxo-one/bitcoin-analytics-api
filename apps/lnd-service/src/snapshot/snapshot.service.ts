import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, Worker } from 'bullmq';
import { authenticatedLndGrpc, getNetworkInfo } from 'lightning';
import { Snapshot } from '@app/entities/snapshot/snapshot';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SnapshotType } from './snapshot.types';

@Injectable()
export class SnapshotService {
  private snapShotQueue: Queue;
  private snapShotWorker: Worker;
  private readonly redisConnection: { host: string; port: number };

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
  ) {
    this.redisConnection = {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    };

    this.snapShotQueue = new Queue('snapShotQueue', {
      connection: this.redisConnection,
    });

    this.snapShotWorker = new Worker(
      'snapShotQueue',
      async (job) => {
        const data: SnapshotType = job.data.networkInfo;
        this.logger.info('SnapshotService.snapShotWorker', data);
        await this.saveSnapshot(data);
      },
      { connection: this.redisConnection },
    );
  }

  private async saveSnapshot(data: SnapshotType): Promise<void> {
    this.logger.info('Saving snapshot');

    try {
      const newSnapshot: Omit<Snapshot, 'id' | 'created_at' | 'updated_at'> = {
        average_channel_size: data.average_channel_size,
        channel_count: data.channel_count,
        max_channel_size: data.max_channel_size,
        median_channel_size: data.median_channel_size,
        min_channel_size: data.min_channel_size,
        node_count: data.node_count,
        not_recently_updated_policy_count:
          data.not_recently_updated_policy_count,
        total_capacity: data.total_capacity,
      };

      await this.snapshotRepository.save(newSnapshot);
    } catch (error) {
      this.logger.error('Error saving snapshot', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async snapShot(): Promise<void> {
    try {
      const { lnd } = authenticatedLndGrpc({
        cert: process.env.LND_CERT,
        macaroon: process.env.LND_MACAROON,
        socket: process.env.LND_HOST,
      });

      const networkInfo = await getNetworkInfo({ lnd });
      this.logger.info('SnapshotService.snapShot', networkInfo);

      await this.snapShotQueue.add('snapShot', {
        networkInfo,
      });
    } catch (error) {
      this.logger.error('Error in snapshot startup', error);
    }
  }
}
