import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as BitcoinLib from 'bitcoinjs-lib';
import { ExchangeRateEntity } from '../exchange-rate/entities/exchange-rate.entity';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import { BitcoindService } from 'src/bitcoind/bitcoind.service';
import { bitcoin } from 'bitcoinjs-lib/src/networks';
import { BlockEntity } from 'src/block/entities/block.entity';
import { TransactionEntity } from 'src/transaction/entities/transaction.entity';
import { TransactionInputEntity } from 'src/transaction/entities/transaction-input.entity';
import { TransactionOutputEntity } from 'src/transaction/entities/transaction-output.entity';

@Injectable()
export class ImportService {
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
    private bitcoinService: BitcoindService,
  ) {}

  async importBlockchainData(): Promise<void> {
    const latestBlockEntity = await this.blockRepository.find({
      order: { height: 'DESC' },
      take: 1,
    });
    const startHeight = latestBlockEntity[0]
      ? latestBlockEntity[0].height + 1
      : 0;
    const currentBlockCount = await this.bitcoinService.getBlockCount();

    console.log(`Current block count from network: ${currentBlockCount}`);
    console.log(`Starting import from block height: ${startHeight}`);

    for (let height = startHeight; height < currentBlockCount; height++) {
      console.time(`Block ${height} import time`);

      const blockHash = await this.bitcoinService.getBlockHash(height);
      const blockData = await this.bitcoinService.getBlock(blockHash);

      const block = this.blockRepository.create({ ...blockData });
      const savedBlock = await this.blockRepository.save(block);

      const transactions = await Promise.all(
        blockData.tx.map((txid) =>
          this.bitcoinService.getRawTransaction(txid).catch((error) => {
            console.error(
              `Failed to fetch transaction ${txid}:`,
              error.message,
            );
            throw error;
          }),
        ),
      );
      const filteredTransactions = transactions.filter(
        (tx) => !this.skipTransaction(tx.txid),
      );

      const transactionEntities = filteredTransactions.map((tx) =>
        this.transactionRepository.create({ ...tx, block: savedBlock }),
      );
      // Use chunkArray to save transactions in batches
      for (const chunk of this.chunkArray(transactionEntities, 500)) {
        await this.transactionRepository.save(chunk);
      }

      const inputs = [];
      const outputs = [];

      for (const [index, tx] of filteredTransactions.entries()) {
        const { vin, vout } = tx;
        inputs.push(
          ...vin.map((input) =>
            this.mapInputToEntity(input, transactionEntities[index]),
          ),
        ); // Assume mapInputToEntity is implemented
        outputs.push(
          ...vout.map((output) =>
            this.mapOutputToEntity(output, transactionEntities[index]),
          ),
        ); // Assume mapOutputToEntity is implemented
      }

      // Batch save inputs
      for (const chunk of this.chunkArray(inputs, 500)) {
        await this.transactionInputRepository.save(chunk);
      }

      // Batch save outputs
      for (const chunk of this.chunkArray(outputs, 500)) {
        await this.transactionOutputRepository.save(chunk);
      }

      console.timeEnd(`Block ${height} import time`);
      console.log(
        `Block ${height} imported with ${filteredTransactions.length} transactions.`,
      );
    }
    console.log('Import complete!');
  }

  private mapInputToEntity(input, savedTransaction): TransactionInputEntity {
    return this.transactionInputRepository.create({
      txid: input.txid || null,
      vout: input.vout || null,
      scriptSigAsm: input.scriptSig ? input.scriptSig.asm : null,
      scriptSigHex: input.scriptSig ? input.scriptSig.hex : null,
      sequence: input.sequence,
      coinbase: input.coinbase || null,
      transaction: savedTransaction,
    });
  }

  private mapOutputToEntity(output, savedTransaction): TransactionOutputEntity {
    let address = this.bitcoinService.getAddressFromScriptPubKey(
      output.scriptPubKey,
    ); // Assuming this function exists and correctly extracts the address

    return this.transactionOutputRepository.create({
      value: output.value,
      n: output.n,
      scriptPubKeyAsm: output.scriptPubKey.asm,
      scriptPubKeyHex: output.scriptPubKey.hex,
      scriptPubKeyType: output.scriptPubKey.type,
      scriptPubKeyDesc: output.scriptPubKey.desc || null,
      scriptPubKeyAddress: address,
      transaction: savedTransaction,
    });
  }

  private skipTransaction(txid: string): boolean {
    const skippedTxIds = [
      '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b', // Genesis block
      'e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468', // Duplicate 1
      'd5d27987d2a3dfc724e359870c6644b40e497bdc0589a033220fe15429d88599', // Duplicate 2
    ];
    return skippedTxIds.includes(txid);
  }

  async importExchangeRates() {
    const results = [];
    const filePath = 'data/rates.csv';

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
          exchangeRate.height = blockHeight;
          exchangeRate.block = block;

          await this.exchangeRateRepository.save(exchangeRate);
        }

        console.log('Import completed successfully.');
      });
  }

  chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }
}
