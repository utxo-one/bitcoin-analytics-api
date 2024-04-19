import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ElectrumService {
  constructor(private readonly configService: ConfigService) {}

  private async makeRequest(endpoint: string): Promise<any> {
    const baseUrl = this.configService.get('ELECTRUM_HOST');
    const url = baseUrl + endpoint;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Error while making request to ${url}: ${error.message}`);
    }
  }

  async getAddress(address: string) {
    const endpoint = `/address/${address}`;
    return await this.makeRequest(endpoint);
  }

  async getAddressTransactions(address: string) {
    const endpoint = `/address/${address}/txs`;
    return await this.makeRequest(endpoint);
  }

  async getAddressTransactionsChain(address: string) {
    const endpoint = `/address/${address}/txs/chain`;
    return await this.makeRequest(endpoint);
  }

  async getAddresstransactionsMempool(address: string) {
    const endpoint = `/address/${address}/txs/mempool`;
    return await this.makeRequest(endpoint);
  }

  async getAddressUtxos(address: string) {
    const endpoint = `/address/${address}/utxo`;
    return await this.makeRequest(endpoint);
  }

  async getBlock(blockHash: string) {
    const endpoint = `/block/${blockHash}`;
    return await this.makeRequest(endpoint);
  }

  async getBlockHeader(blockHash: string) {
    const endpoint = `/block/${blockHash}/header`;
    return await this.makeRequest(endpoint);
  }

  async getBlockHeight(blockHeight: number) {
    const endpoint = `/block-height/${blockHeight}`;
    return await this.makeRequest(endpoint);
  }

  async getBlockRaw(blockHash: string) {
    const endpoint = `/block/${blockHash}/raw`;
    return await this.makeRequest(endpoint);
  }

  async getblockStatus(blockHash: string) {
    const endpoint = `/block/${blockHash}/status`;
    return await this.makeRequest(endpoint);
  }

  async getBlockTipHeight() {
    const endpoint = '/block/tip/height';
    return await this.makeRequest(endpoint);
  }

  async getBlockTipHash() {
    const endpoint = '/block/tip/hash';
    return await this.makeRequest(endpoint);
  }

  async getBlockTransactionId(blockHash: string, index: number) {
    const endpoint = `/block/${blockHash}/txid/${index}`;
    return await this.makeRequest(endpoint);
  }

  async getBlockTransactionIds(blockHash: string) {
    const endpoint = `/block/${blockHash}/txids`;
    return await this.makeRequest(endpoint);
  }

  async getBlockTransactions(blockHash: string) {
    const endpoint = `/block/${blockHash}/txs`;
    return await this.makeRequest(endpoint);
  }

  async getMempool() {
    const endpoint = '/mempool';
    return await this.makeRequest(endpoint);
  }

  async getMempoolTransactionIds() {
    const endpoint = '/mempool/txids';
    return await this.makeRequest(endpoint);
  }

  async getMempoolRecent() {
    const endpoint = '/mempool/recent';
    return await this.makeRequest(endpoint);
  }

  async getTransaction(txid: string) {
    const endpoint = `/tx/${txid}`;
    return await this.makeRequest(endpoint);
  }

  async getTransactionHex(txid: string) {
    const endpoint = `/tx/${txid}/hex`;
    return await this.makeRequest(endpoint);
  }

  async getTransactionMerkleblockProof(txid: string) {
    const endpoint = `/tx/${txid}/merkleblock-proof`;
    return await this.makeRequest(endpoint);
  }

  async getTransactionMerkleProof(txid: string) {
    const endpoint = `/tx/${txid}/merkle-proof`;
    return await this.makeRequest(endpoint);
  }

  async getTransactionOutspender(txid: string, index: number) {
    const endpoint = `/tx/${txid}/outspend/${index}`;
    return await this.makeRequest(endpoint);
  }

  async getTransactionOutspends(txid: string) {
    const endpoint = `/tx/${txid}/outspends`;
    return await this.makeRequest(endpoint);
  }

  async getTransactionRaw(txid: string) {
    const endpoint = `/tx/${txid}/raw`;
    return await this.makeRequest(endpoint);
  }

  async getTransactionStatus(txid: string) {
    const endpoint = `/tx/${txid}/status`;
    return await this.makeRequest(endpoint);
  }
}
