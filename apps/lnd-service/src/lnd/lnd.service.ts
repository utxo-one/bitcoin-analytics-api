import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
  AuthenticatedLnd,
  GetWalletInfoResult,
  GetNodeResult,
  authenticatedLndGrpc,
  getWalletInfo,
  getNode,
  getChannel,
  subscribeToGraph,
  GetChannelResult,
} from 'lightning';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Queue, Worker } from 'bullmq';
import {
  ChannelClosed,
  ChannelUpdated,
  Feature,
  NodeUpdated,
} from './lnd.types';
import { InjectRepository } from '@nestjs/typeorm';
import { LnNode } from '@app/entities/graph/ln_node';
import { Repository } from 'typeorm';
import { LnChannel, LnPolicy } from '@app/entities/graph/ln_channel';
import { EventEmitter } from 'events';

@Injectable()
export class LndService implements OnApplicationBootstrap {
  private sub: EventEmitter;
  private readonly lnd: AuthenticatedLnd;
  private readonly channelQueue: Queue;
  private readonly updateNodeQueue: Queue;
  private readonly redisConnection: { host: string; port: number };

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @InjectRepository(LnNode)
    private readonly lnNodeRepository: Repository<LnNode>,
    @InjectRepository(LnChannel)
    private readonly lnChannelRepository: Repository<LnChannel>,
    @InjectRepository(LnPolicy)
    private readonly lnPolicyRepository: Repository<LnPolicy>,
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
  async onApplicationBootstrap() {
    this.logger.info('LndService has been initialized');
    try {
      const nodePublicKey = await this.getInfo();
      this.logger.info('Node public key:', { nodePublicKey });
      await this.subscribeToGraph();
    } catch (error) {
      this.logger.error(
        'Error getting node public key and subscribing to lnd graph updates',
        {
          error,
        },
      );
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
          await this.updateClosedChannel(channel_closed);
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
    const walletInfo: GetWalletInfoResult = await getWalletInfo({
      lnd: this.lnd,
    });
    this.logger.info('Wallet info:', { walletInfo });
    return walletInfo;
  }

  async updateClosedChannel(channel: ChannelClosed) {
    const channelEntity = await this.lnChannelRepository.findOne({
      where: { channel_id: channel.id },
    });

    if (channelEntity) {
      this.logger.info('Updating closed channel:', channel);
      channelEntity.close_height = channel.close_height;
      await this.lnChannelRepository.update(channelEntity.id, channelEntity);
    } else {
      const lndChannel: GetChannelResult = await getChannel({
        lnd: this.lnd,
        id: channel.id,
      });

      if (lndChannel) {
        this.logger.info('Adding new closed channel:', { channel });
        const newChannel: Omit<
          LnChannel,
          'id' | 'created_at' | 'updated_at' | 'policies' | 'open_height'
        > = {
          channel_id: channel.id,
          capacity: channel.capacity,
          transaction_id: channel.transaction_id,
          transaction_vout: channel.transaction_vout,
          close_height: channel.close_height,
        };

        await this.lnChannelRepository.save(newChannel);
      } else {
        this.logger.info('Channel not found in graph:', { channel });
      }
    }
  }

  async updateChannel(channel: ChannelUpdated | GetChannelResult) {
    const channelEntity = await this.findOrCreateLnChannel(channel);

    if (!channelEntity) {
      this.logger.error('Failed to update channel:', { channelId: channel.id });
      return;
    }

    try {
      const lndChannel: GetChannelResult = await this.getChannelDetails(
        channel.id,
      );
      const channelPolicies = this.mapChannelPolicies(lndChannel.policies);

      await this.updateLnChannel(channelEntity, channel.capacity);
      await this.updateLnPolicies(channelEntity, channelPolicies);
    } catch (error) {
      this.logger.error('Error finding or creating channel:', {
        channel,
        error,
      });
    }
  }

  private async findOrCreateLnChannel(
    channel: ChannelUpdated | GetChannelResult,
  ): Promise<LnChannel | undefined> {
    try {
      const existingChannel = await this.lnChannelRepository.findOne({
        where: { channel_id: channel.id },
      });

      if (existingChannel) {
        this.logger.info('Updating existing channel event:', channel);
        return existingChannel;
      }

      this.logger.info('Adding new channel event:', channel);
      const newChannel: Partial<LnChannel> = {
        channel_id: channel.id,
        capacity: channel.capacity,
        transaction_id: channel.transaction_id,
        transaction_vout: channel.transaction_vout,
      };

      return this.lnChannelRepository.save(newChannel);
    } catch (error) {
      this.logger.error('Error finding or creating channel:', {
        channel,
        error,
      });
    }
  }

  private async getChannelDetails(
    channelId: string,
  ): Promise<GetChannelResult> {
    return getChannel({ lnd: this.lnd, id: channelId });
  }

  private mapChannelPolicies(
    policies: any[],
  ): Omit<LnPolicy, 'id' | 'channel' | 'updated_at' | 'created_at'>[] {
    return policies.map((policy) => ({
      channel_id: policy.channel_id,
      base_fee_mtokens: policy.base_fee_mtokens,
      cltv_delta: policy.cltv_delta || 0,
      fee_rate: policy.fee_rate || 0,
      is_disabled: policy.is_disabled || false,
      max_htlc_mtokens: policy.max_htlc_mtokens,
      min_htlc_mtokens: policy.min_htlc_mtokens,
      public_key: policy.public_key,
      updated_at: policy.updated_at || new Date().toISOString(),
    }));
  }

  private async updateLnChannel(
    channel: LnChannel,
    capacity: number,
  ): Promise<void> {
    if (capacity !== undefined) {
      channel.capacity = capacity;
      await this.lnChannelRepository.save(channel);
    }
  }

  private async updateLnPolicies(
    channel: LnChannel,
    policies: Omit<LnPolicy, 'id' | 'channel' | 'updated_at' | 'created_at'>[],
  ) {
    const policiesToSave = policies.map((policy) => ({
      channel,
      ...policy,
      channel_id: channel.channel_id,
    }));

    const existingPolicies = await this.lnPolicyRepository.find({
      where: { channel_id: channel.channel_id },
    });

    policiesToSave.forEach(async (policy) => {
      if (!policy.base_fee_mtokens) {
        this.logger.error('Policy has no base_fee_mtokens:', policy);
        return;
      }
      const existingPolicy = existingPolicies.find(
        (p) => p.public_key === policy.public_key,
      );

      if (!existingPolicy) {
        await this.lnPolicyRepository.save(policy);
        return;
      }

      const isPolicyChanged = Object.keys(policy)
        .filter(
          (key) => !['id', 'channel', 'updated_at', 'created_at'].includes(key),
        )
        .some((key) => policy[key] !== existingPolicy[key]);

      if (isPolicyChanged) {
        await this.lnPolicyRepository.save(policy);
      }
    });
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

    const nodeDetails: GetNodeResult = await getNode({
      lnd: this.lnd,
      public_key: node.public_key,
    });

    nodeDetails.channels.map(async (channel) => {
      const channelEntity = await this.lnChannelRepository.findOne({
        where: { channel_id: channel.id },
      });

      if (!channelEntity) {
        const channelDetails = await getChannel({
          id: channel.id,
          lnd: this.lnd,
        });
        await this.updateChannel(channelDetails);
      }
    });

    this.logger.debug('Node details:', nodeDetails);

    if (existingNode) {
      this.logger.info('Updating existing node:', node);
      this.lnNodeRepository.update(existingNode.id, nodeEntity);
    } else {
      this.logger.info('Adding new node:', node);
      await this.lnNodeRepository.save(nodeEntity);
    }
  }
}
