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
} from './bitcoind.types';

import * as BitcoinLib from 'bitcoinjs-lib';

@Injectable()
export class BitcoindService {
  constructor(private configService: ConfigService) {}

  private rpcUser = this.configService.get<string>('NODE_USERNAME');
  private rpcPassword = this.configService.get<string>('NODE_PASSWORD');
  private rpcUrl = this.configService.get<string>('NODE_RPC_URL');

  getAddressFromScriptPubKey(scriptPubKey: ScriptPubKey): string {
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
        id: method,
        method: method,
        params: params,
      },
    };

    // Function to delay execution
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios(config);
        if (response.data.error) {
          console.log(`RPC Error: ${response.data.error.message}`);
          // If it's the last attempt, throw the error to be caught by the catch block
          if (attempt === 3) throw new Error(response.data.error.message);
        }
        return response.data.result; // Automatically extract the result
      } catch (error) {
        console.error(`${method} Error:`, error.message);
        console.log(
          `Attempt ${attempt} failed to execute ${method}: ${error.message}`,
        );
        if (attempt < 3) {
          console.log(`Retrying in 1 second...`);
          await delay(10000); // Wait for 1 second before retrying
        } else {
          // If all attempts fail, rethrow the error to handle it or let it propagate
          throw error;
        }
      }
    }
  }

  async convertHashToAddress(hash: string): Promise<string> {
    const buffer = Buffer.from(hash, 'hex');
    const address = BitcoinLib.address.toBase58Check(
      buffer,
      BitcoinLib.networks.bitcoin.pubKeyHash,
    );
    return address;
  }
}
