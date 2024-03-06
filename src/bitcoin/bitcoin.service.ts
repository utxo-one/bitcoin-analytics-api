import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig } from 'axios';
import {
  Block,
  BlockStats,
  BlockchainInfo,
  ChainTxStats,
  Difficulty,
  MempoolInfo,
  Transaction,
} from './bitcoin.types';
import { InjectRepository } from '@nestjs/typeorm';
import { BlockEntity } from './entities/block.entity';
import { Repository } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionInputEntity } from './entities/transaction-input.entity';
import { TransactionOutputEntity } from './entities/transaction-output.entity';
import * as BitcoinLib from 'bitcoinjs-lib';

@Injectable()
export class BitcoinService {
  constructor(
    private configService: ConfigService,
    @InjectRepository(BlockEntity)
    private blockRepository: Repository<BlockEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(TransactionInputEntity)
    private transactionInputRepository: Repository<TransactionInputEntity>,
    @InjectRepository(TransactionOutputEntity)
    private transactionOutputRepository: Repository<TransactionOutputEntity>,
  ) {}

  private rpcUser = this.configService.get<string>('NODE_USERNAME');
  private rpcPassword = this.configService.get<string>('NODE_PASSWORD');
  private rpcUrl = this.configService.get<string>('NODE_RPC_URL');

  private async makeRpcCall<T>(method: string, params: any[] = []): Promise<T> {
    const config: AxiosRequestConfig = {
      url: this.rpcUrl,
      method: 'post',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${this.rpcUser}:${this.rpcPassword}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      data: {
        jsonrpc: '1.0',
        id: method, // Using the method name as the id for simplicity
        method: method,
        params: params,
      },
    };

    try {
      const response = await axios(config);
      if (response.data.error) {
        console.log(`RPC Error: ${response.data.error.message}`);
      }
      return response.data.result; // Automatically extract the result
    } catch (error) {
      console.error(`${method} Error:`, error.message);
      console.log(`Failed to execute ${method}: ${error.message}`);
    }
  }

  async getBlock(blockHash: string): Promise<Block> {
    return this.makeRpcCall('getblock', [blockHash]);
  }

  async getBlockHash(index: number): Promise<string> {
    return this.makeRpcCall('getblockhash', [index]);
  }

  async getBlockCount(): Promise<number> {
    return this.makeRpcCall('getblockcount');
  }

  async getBlockStats(hash_or_height: string | number): Promise<BlockStats> {
    return this.makeRpcCall('getblockstats', [hash_or_height]);
  }

  async getBlockchainInfo(): Promise<BlockchainInfo> {
    return this.makeRpcCall('getblockchaininfo');
  }

  async getDifficulty(): Promise<Difficulty> {
    return this.makeRpcCall('getdifficulty');
  }

  async getMempoolInfo(): Promise<MempoolInfo> {
    return this.makeRpcCall('getmempoolinfo');
  }

  async getChainTxStats(
    nblocks: number,
    blockhash?: string,
  ): Promise<ChainTxStats> {
    const params = blockhash ? [nblocks, blockhash] : [nblocks];
    return this.makeRpcCall('getchaintxstats', params);
  }

  async getRawTransaction(txid: string, verbose = true): Promise<Transaction> {
    return this.makeRpcCall('getrawtransaction', [txid, verbose]);
  }

  async importBlockchainData(): Promise<void> {
    // Find the highest block height in the database
    const latestBlockEntity = await this.blockRepository.find({
      order: { height: 'DESC' },
      take: 1,
    });
    const startHeight = latestBlockEntity[0]
      ? latestBlockEntity[0].height + 150000
      : 0;

    const currentBlockCount = await this.getBlockCount();
    console.log(`Current block count from network: ${currentBlockCount}`);
    console.log(`Starting import from block height: ${startHeight}`);

    for (let height = startHeight; height < currentBlockCount; height++) {
      const blockHash = await this.getBlockHash(height);
      const blockData = await this.getBlock(blockHash);

      const block = this.blockRepository.create({
        hash: blockData.hash,
        confirmations: blockData.confirmations,
        size: blockData.size,
        strippedsize: blockData.strippedsize,
        weight: blockData.weight,
        height: blockData.height,
        version: blockData.version,
        versionHex: blockData.versionHex,
        merkleroot: blockData.merkleroot,
        tx: blockData.tx, // Assuming this is an array of transaction IDs
        time: blockData.time,
        mediantime: blockData.mediantime,
        nonce: blockData.nonce,
        bits: blockData.bits,
        difficulty: blockData.difficulty,
        chainwork: blockData.chainwork,
        nTx: blockData.nTx,
        previousblockhash: blockData.previousblockhash,
        nextblockhash: blockData.nextblockhash,
      });

      // Save the block first to ensure it exists for foreign key constraints
      const savedBlock = await this.blockRepository.save(block);

      console.log(`Imported block ${height}...`);

      // Now, import each transaction in the block
      for (const txid of blockData.tx) {
        console.log(`Importing transaction ${txid}...`);

        //skip genesis block
        if (
          txid ===
          '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b'
        ) {
          continue;
        }

        const transactionData = await this.getRawTransaction(txid);
        console.log('transactionData', transactionData);
        console.log('vout', transactionData.vout);
        console.log('vin', transactionData.vin);

        const transaction = await this.transactionRepository.create({
          ...transactionData,
          block: savedBlock,
        });

        const savedTransaction =
          await this.transactionRepository.save(transaction);

        console.log('transaction saved', savedTransaction);

        // Import transaction inputs
        for (const vin of transactionData.vin) {
          console.log('importing inputs', vin);
          if (typeof vin.coinbase === 'string') {
            console.log('coinbase transaction');
            // Handle coinbase transaction input
            const input = this.transactionInputRepository.create({
              transaction: savedTransaction,
              txid: null,
              vout: null,
              scriptSigAsm: null, // Coinbase transactions don't have a scriptSig
              scriptSigHex: null, // Coinbase transactions don't have a scriptSig
              sequence: vin.sequence,
              coinbase: vin.coinbase,
            });
            await this.transactionInputRepository.save(input);
          } else {
            console.log('regular transaction');
            // Handle regular transaction input
            const input = this.transactionInputRepository.create({
              transaction: savedTransaction,
              txid: vin.txid,
              vout: vin.vout,
              scriptSigAsm: vin.scriptSig ? vin.scriptSig.asm : null,
              scriptSigHex: vin.scriptSig ? vin.scriptSig.hex : null,
              sequence: vin.sequence,
            });
            await this.transactionInputRepository.save(input);
          }
        }

        // Import transaction outputs
        // Import transaction outputs
        for (const vout of transactionData.vout) {
          if (!vout.scriptPubKey.asm || vout.scriptPubKey.asm.length < 1) {
            console.error('vout.scriptPubKey.asm is null');
            console.log(vout.scriptPubKey);
            throw new Error('vout.scriptPubKey.asm is null');
          }

          let address = null;

          // Check if the address is directly available
          if (
            vout.scriptPubKey.address &&
            vout.scriptPubKey.address.length > 0
          ) {
            // Note: Bitcoin Core returns addresses in an array, so we take the first one.
            address = vout.scriptPubKey.address;
          } else if (vout.scriptPubKey.asm) {
            // Extracting address or public key from the asm
            const parts = vout.scriptPubKey.asm.split(' ');
            // Checking for P2PK (Pay to Public Key) pattern (public key followed by OP_CHECKSIG)
            if (parts.length >= 2 && parts[1] === 'OP_CHECKSIG') {
              address = parts[0]; // Assuming the public key is the address for this case
            } else {
              // For other patterns, attempt to find a hash-like part (e.g., P2PKH)
              const potentialAddressPart = parts.find(
                (part) => part.length === 40,
              );
              if (potentialAddressPart) {
                address = this.convertHashToAddress(potentialAddressPart); // Placeholder for conversion logic
              }
            }
          }

          const output = await this.transactionOutputRepository.create({
            transaction: savedTransaction,
            value: vout.value,
            n: vout.n,
            scriptPubKeyAsm: vout.scriptPubKey.asm,
            scriptPubKeyHex: vout.scriptPubKey.hex,
            scriptPubKeyType: vout.scriptPubKey.type,
            scriptPubKeyDesc: vout.scriptPubKey.desc
              ? vout.scriptPubKey.desc
              : null,
            scriptPubKeyAddress: address, // Use the extracted address or public key
          });

          await this.transactionOutputRepository.save(output);
        }

        console.log(
          `Imported block ${height} of ${currentBlockCount}, including ${blockData.tx.length} transactions.`,
        );
      }

      console.log('Blockchain data import completed.');
    }
  }

  private async convertHashToAddress(hash: string): Promise<string> {
    const buffer = Buffer.from(hash, 'hex');
    const address = BitcoinLib.address.toBase58Check(
      buffer,
      BitcoinLib.networks.bitcoin.pubKeyHash,
    );
    return address;
  }
}
