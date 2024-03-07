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
  ScriptPubKey,
  Transaction,
  TransactionOutput,
} from './bitcoin.types';
import { InjectRepository } from '@nestjs/typeorm';
import { BlockEntity } from './entities/block.entity';
import { Repository } from 'typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionInputEntity } from './entities/transaction-input.entity';
import { TransactionOutputEntity } from './entities/transaction-output.entity';
import * as BitcoinLib from 'bitcoinjs-lib';
import { ExchangeRateEntity } from './entities/exchange-rate.entity';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';

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
    @InjectRepository(ExchangeRateEntity)
    private exchangeRateRepository: Repository<ExchangeRateEntity>,
  ) {}

  private rpcUser = this.configService.get<string>('NODE_USERNAME');
  private rpcPassword = this.configService.get<string>('NODE_PASSWORD');
  private rpcUrl = this.configService.get<string>('NODE_RPC_URL');

  async importBlockchainData(): Promise<void> {
    // Find the highest block height in the database
    const latestBlockEntity = await this.blockRepository.find({
      order: { height: 'DESC' },
      take: 1,
    });
    const startHeight = latestBlockEntity[0]
      ? latestBlockEntity[0].height + 1
      : 0;

    const currentBlockCount = await this.getBlockCount();
    console.log(`Current block count from network: ${currentBlockCount}`);
    console.log(`Starting import from block height: ${startHeight}`);

    for (let height = startHeight; height < currentBlockCount; height++) {
      const blockHash = await this.getBlockHash(height);
      const blockData = await this.getBlock(blockHash);

      const block = this.blockRepository.create({
        ...blockData,
      });

      const savedBlock = await this.blockRepository.save(block);

      for (const txid of blockData.tx) {
        //skip genesis block and the two duplicates
        if (
          txid ===
            '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b' ||
          txid ===
            'e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468' ||
          txid ===
            'd5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599'
        ) {
          continue;
        }

        const transactionData = await this.getRawTransaction(txid);

        const transaction = await this.transactionRepository.create({
          ...transactionData,
          block: savedBlock,
        });

        const savedTransaction =
          await this.transactionRepository.save(transaction);

        // Import transaction inputs
        for (const vin of transactionData.vin) {
          const input = this.transactionInputRepository.create({
            transaction: savedTransaction,
            txid: vin.txid ? vin.txid : null,
            vout: vin.vout ? vin.vout : null,
            scriptSigAsm: vin.scriptSig ? vin.scriptSig.asm : null,
            scriptSigHex: vin.scriptSig ? vin.scriptSig.hex : null,
            sequence: vin.sequence,
            coinbase: vin.coinbase ? vin.coinbase : null,
          });
          await this.transactionInputRepository.save(input);
        }

        for (const vout of transactionData.vout) {
          let address = this.getAddressFromScriptPubKey(vout.scriptPubKey);

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
      }
      console.log(`Imported block ${height}...`);
    }
    console.log('Import complete!');
  }

  async importExchangeRates(filePath: string) {
    const results = [];

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        for (const result of results) {
          const blockHeight = parseInt(result['Block Height'], 10);
          const rate = parseFloat(result['Exchange Rate']);

          // Look up the BlockEntity by height
          const block = await this.blockRepository.findOne({
            where: { height: blockHeight },
          });

          if (!block) {
            console.warn(`Block with height ${blockHeight} not found.`);
            continue; // Skip this record if the block was not found
          }

          // Create and save the ExchangeRateEntity
          const exchangeRate = new ExchangeRateEntity();
          exchangeRate.currency = 'USD';
          exchangeRate.rate = rate;
          exchangeRate.block = block;

          await this.exchangeRateRepository.save(exchangeRate);
        }

        console.log('Import completed successfully.');
      });
  }

  private getAddressFromScriptPubKey(scriptPubKey: ScriptPubKey): string {
    let address = null;

    // Check if the address is directly available
    if (scriptPubKey.address && scriptPubKey.address.length > 0) {
      // Note: Bitcoin Core returns addresses in an array, so we take the first one.
      address = scriptPubKey.address;
    } else if (scriptPubKey.asm) {
      // Extracting address or public key from the asm
      const parts = scriptPubKey.asm.split(' ');
      // Checking for P2PK (Pay to Public Key) pattern (public key followed by OP_CHECKSIG)
      if (parts.length >= 2 && parts[1] === 'OP_CHECKSIG') {
        address = parts[0]; // Assuming the public key is the address for this case
      } else {
        // For other patterns, attempt to find a hash-like part (e.g., P2PKH)
        const potentialAddressPart = parts.find((part) => part.length === 40);
        if (potentialAddressPart) {
          address = this.convertHashToAddress(potentialAddressPart); // Placeholder for conversion logic
        }
      }
    }

    return address;
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

  async getBlockByHeight(height: number): Promise<Block> {
    return this.blockRepository.findOne({ where: { height } });
  }

  async getTransactionByHash(hash: string): Promise<TransactionEntity> {
    return this.transactionRepository.findOne({
      where: { hash },
      relations: ['vin', 'vout'],
    });
  }

  async getExchangeRateByBlockHeight(
    height: number,
  ): Promise<ExchangeRateEntity> {
    return this.exchangeRateRepository.findOne({
      where: { block: { height } },
    });
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

  private async convertHashToAddress(hash: string): Promise<string> {
    const buffer = Buffer.from(hash, 'hex');
    const address = BitcoinLib.address.toBase58Check(
      buffer,
      BitcoinLib.networks.bitcoin.pubKeyHash,
    );
    return address;
  }
}
