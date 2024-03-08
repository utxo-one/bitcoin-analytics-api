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
    // Find the highest block height in the database
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
      const blockHash = await this.bitcoinService.getBlockHash(height);
      const blockData = await this.bitcoinService.getBlock(blockHash);

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

        const transactionData =
          await this.bitcoinService.getRawTransaction(txid);

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
          let address = this.bitcoinService.getAddressFromScriptPubKey(
            vout.scriptPubKey,
          );

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
}
