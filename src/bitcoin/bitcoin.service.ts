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
      console.log(`${method} Response:`, response.data);
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
    const count = await this.blockRepository.count();
    if (count > 0) {
      console.log('Blocks already imported.');
      return;
    }
  
    const currentBlockCount = await this.getBlockCount();
    console.log(`Current block count: ${currentBlockCount}`);
  
    for (let height = 0; height < currentBlockCount; height++) {
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
  
      // Now, import each transaction in the block
      for (const txid of blockData.tx) {
        console.log(`Importing transaction ${txid}...`);

        //skip genesis block
        if (txid === '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b') {
            continue;
        }

        const transactionData = await this.getRawTransaction(txid);

        const transaction = this.transactionRepository.create({
            ...transactionData,
            block: savedBlock,
          });
          
       const savedTransaction = await this.transactionRepository.save(transaction);

        // Import transaction inputs
        for (const vin of transactionData.vin) {
            if (typeof vin.coinbase === 'string') {
                console.log("coinbase transaction");
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
                console.log("regular transaction");
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
        for (const vout of transactionData.vout) {

          const output = this.transactionOutputRepository.create({
            transaction: savedTransaction,
            value: vout.value,
            n: vout.n,
            scriptPubKeyAsm: vout.scriptPubKey.asm,
            scriptPubKeyHex: vout.scriptPubKey.hex,
            scriptPubKeyType: vout.scriptPubKey.type,
            scriptPubKeyAddress: vout.scriptPubKey.addresses ? vout.scriptPubKey.addresses.join(', ') : null, // Handle multiple addresses
          });
          await this.transactionOutputRepository.save(output);
        }
      }
  
      console.log(`Imported block ${height} of ${currentBlockCount}, including ${blockData.tx.length} transactions.`);
    }
  
    console.log('Blockchain data import completed.');
  }
  
  
}
