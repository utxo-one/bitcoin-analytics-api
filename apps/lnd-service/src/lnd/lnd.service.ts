import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  authenticatedLndGrpc,
  getWalletInfo,
  subscribeToGraph,
} from 'ln-service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Queue, Worker } from 'bullmq';
import {
  ChannelClosed,
  ChannelUpdated,
  Feature,
  NodeUpdated,
  isChannelClosed,
  isChannelUpdated,
} from './lnd.types';
import { InjectRepository } from '@nestjs/typeorm';
import { LnNode } from '@app/entities/graph/ln_node';
import { Repository } from 'typeorm';
import { LnChannel } from '@app/entities/graph/ln_channel';

@Injectable()
export class LndService implements OnApplicationBootstrap {
  private sub: any;
  private readonly lnd: any;
  private readonly channelQueue: Queue;
  private readonly updateNodeQueue: Queue;
  private readonly redisConnection: { host: string; port: number };

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectRepository(LnNode)
    private readonly lnNodeRepository: Repository<LnNode>,
    @InjectRepository(LnChannel)
    private readonly lnChannelRepository: Repository<LnChannel>,
  ) {
    const { lnd } = authenticatedLndGrpc({
      cert: process.env.LND_CERT,
      macaroon: process.env.LND_MACAROON,
      socket: process.env.LND_HOST,
    });

    this.lnd = lnd;

    this.redisConnection = {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    };

    this.channelQueue = new Queue('channelQueue', {
      connection: this.redisConnection,
    });

    this.updateNodeQueue = new Queue('updateNode', {
      connection: this.redisConnection,
    });
  }

  async subscribeToGraph() {
    this.logger.info('Subscribing to graph updates');
    this.sub = subscribeToGraph({ lnd: this.lnd });

    this.sub.on('channel_updated', (channel_updated) => {
      this.logger.info('Channel updated:', channel_updated);
      this.channelQueue.add('channel_updated', { channel_updated });
    });
    this.sub.on('channel_closed', (channel_closed) => {
      this.logger.info('Channel closed:', channel_closed);
      this.channelQueue.add('channel_closed', { channel_closed });
    });
    this.sub.on('error', (error) => {
      this.logger.error('Error on lnd subscription:', error);
    });

    this.sub.on('node_updated', (node_updated) => {
      this.logger.info('Node updated:', node_updated);
      this.updateNodeQueue.add('node_updated', { node_updated });
    });
  }

  async getInfo() {
    const { public_key: nodePublicKey } = await getWalletInfo({
      lnd: this.lnd,
    });
    return nodePublicKey;
  }

  async updateChannel(channel: ChannelUpdated | ChannelClosed) {
    const existingChannel = await this.lnChannelRepository.findOne({
      where: { channel_id: channel.id },
    });

    if (existingChannel) {
      this.logger.info('Updating existing channel event:', channel);
      const updatedChannel: Omit<
        LnChannel,
        | 'id'
        | 'created_at'
        | 'updated_at'
        | 'announcing_public_key'
        | 'target_public_key'
      > = {
        channel_id: channel.id,
        base_fee_mtokens: isChannelUpdated(channel)
          ? channel.base_fee_mtokens
          : existingChannel.base_fee_mtokens,
        cltv_delta: isChannelUpdated(channel)
          ? channel.cltv_delta
          : existingChannel.cltv_delta,
        fee_rate: isChannelUpdated(channel)
          ? channel.fee_rate
          : existingChannel.fee_rate,
        is_disabled: isChannelUpdated(channel)
          ? channel.is_disabled
          : existingChannel.is_disabled,
        max_htlc_mtokens: isChannelUpdated(channel)
          ? channel.max_htlc_mtokens
          : existingChannel.max_htlc_mtokens,
        min_htlc_mtokens: isChannelUpdated(channel)
          ? channel.min_htlc_mtokens
          : existingChannel.min_htlc_mtokens,
        close_height: isChannelClosed(channel) ? channel.close_height : null,
        capacity: channel.capacity,
        transaction_id: channel.transaction_id,
        transaction_vout: channel.transaction_vout,
      };

      await this.lnChannelRepository.update(existingChannel.id, updatedChannel);
    } else {
      this.logger.info('Adding new channel event:', channel);
      //possible edge case where we receive a channel_closed event before a channel_updated event so we should check if the channel is closed
      const newChannel: Omit<LnChannel, 'id' | 'created_at' | 'updated_at'> = {
        channel_id: channel.id,
        announcing_public_key: isChannelUpdated(channel)
          ? channel.public_keys[0]
          : null,
        target_public_key: isChannelUpdated(channel)
          ? channel.public_keys[1]
          : null,
        base_fee_mtokens: isChannelUpdated(channel)
          ? channel.base_fee_mtokens
          : null,
        cltv_delta: isChannelUpdated(channel) ? channel.cltv_delta : null,
        fee_rate: isChannelUpdated(channel) ? channel.fee_rate : null,
        is_disabled: isChannelUpdated(channel) ? channel.is_disabled : null,
        max_htlc_mtokens: isChannelUpdated(channel)
          ? channel.max_htlc_mtokens
          : null,
        min_htlc_mtokens: isChannelUpdated(channel)
          ? channel.min_htlc_mtokens
          : null,
        close_height: isChannelClosed(channel) ? channel.close_height : null,
        capacity: channel.capacity,
        transaction_id: channel.transaction_id,
        transaction_vout: channel.transaction_vout,
      };

      await this.lnChannelRepository.save({
        ...newChannel,
      });
    }
  }

  async updateNode(node: NodeUpdated) {
    const existingNode = await this.lnNodeRepository.findOne({
      where: { public_key: node.public_key },
    });

    const nodeEntity: Omit<LnNode, 'id' | 'created_at' | 'updated_at'> = {
      alias: node.alias,
      color: node.color,
      features: node.features as Feature[],
      public_key: node.public_key,
      sockets: node.sockets,
    };

    if (existingNode) {
      this.logger.info('Updating existing node:', node);
      this.lnNodeRepository.update(existingNode.id, nodeEntity);
    } else {
      this.logger.info('Adding new node:', node);
      await this.lnNodeRepository.save(nodeEntity);
    }
  }

  async onApplicationBootstrap() {
    this.logger.info('LndService has been initialized');
    try {
      const nodePublicKey = await this.getInfo();
      this.logger.info('Node public key:', nodePublicKey);
      await this.subscribeToGraph();
    } catch (error) {
      this.logger.info('Error getting node public key:', error);
    }

    const channelWorker = new Worker(
      'channelQueue',
      async (job) => {
        const { channel_updated, channel_closed } = job.data;
        if (channel_updated as ChannelUpdated) {
          this.logger.info('Channel updated:', channel_updated);
          await this.updateChannel(channel_updated);
        }
        if (channel_closed as ChannelClosed) {
          this.logger.info('Channel closed:', channel_closed);
          await this.updateChannel(channel_closed);
        }
      },
      { connection: this.redisConnection },
    );

    const nodeWorker = new Worker(
      'updateNode',
      async (job) => {
        const { node_updated } = job.data;
        this.logger.info('Node updated:', node_updated);
        await this.updateNode(node_updated as NodeUpdated);
      },
      { connection: this.redisConnection },
    );

    channelWorker.on('completed', (job) => {
      this.logger.debug(`lnd job ${job.id} has completed.`, { job });
    });

    channelWorker.on('failed', (job, err) => {
      this.logger.error(`${job.id} has failed`, {
        job,
        err,
      });
    });

    nodeWorker.on('completed', (job) => {
      this.logger.debug(`nodeWorker job ${job.id} has completed.`, { job });
    });

    nodeWorker.on('failed', (job, err) => {
      this.logger.error(`nodeWorker ${job.id} has failed`, {
        job,
        err,
      });
    });
  }
}
