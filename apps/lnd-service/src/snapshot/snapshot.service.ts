import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue, Worker } from 'bullmq';
import { authenticatedLndGrpc, getNetworkInfo } from 'lightning';

@Injectable()
export class SnapshotService {
  private snapShotQueue: Queue;
  private snapShotWorker: Worker;
  private readonly redisConnection: { host: string; port: number };

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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
        const data = job.data;
        this.logger.info('SnapshotService.snapShotWorker', data);
      },
      { connection: this.redisConnection },
    );
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async snapShot(): Promise<void> {
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
  }
}
