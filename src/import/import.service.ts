import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExchangeRateEntity } from '../exchange-rate/entities/exchange-rate.entity';
import * as fs from 'fs';
import * as csvParser from 'csv-parser';
import { BitcoindService } from 'src/bitcoind/bitcoind.service';
import { BlockEntity } from 'src/block/entities/block.entity';
import { TransactionEntity } from 'src/transaction/entities/transaction.entity';
import { TransactionInputEntity } from 'src/transaction/entities/transaction-input.entity';
import { TransactionOutputEntity } from 'src/transaction/entities/transaction-output.entity';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AddressTransactionEntity } from 'src/transaction/entities/transaction-address.entity';

@Injectable()
export class ImportService implements OnApplicationBootstrap {
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
    @InjectRepository(AddressTransactionEntity)
    private addressTransactionRepository: Repository<AddressTransactionEntity>,
    private bitcoinService: BitcoindService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
  async onApplicationBootstrap() {
    if (process.env.IMPORTBLOCKS === 'true') {
      this.importBlockchainData();
      //this.importExchangeRates();
    }
    if (process.env.IMPORTEXCHANGERATES === 'true') {
      this.importExchangeRates();
    }
  }

  async importBlockchainData(): Promise<void> {
    const latestBlockEntity = await this.blockRepository.find({
        order: { height: 'DESC' },
        take: 1,
    });
    const startHeight = latestBlockEntity[0] ? latestBlockEntity[0].height + 1 : 0;
    const currentBlockCount = await this.bitcoinService.getBlockCount();
    this.logger.info(`Current block count from network: ${currentBlockCount}`);
    this.logger.info(`Starting import from block height: ${startHeight}`);

    for (let height = startHeight; height < currentBlockCount; height++) {
        console.time(`Block ${height} import time`);

        const blockHash = await this.bitcoinService.getBlockHash(height);
        const blockData = await this.bitcoinService.getBlock(blockHash);

        const block = this.blockRepository.create({ ...blockData });
        const savedBlock = await this.blockRepository.save(block);

        for (let i = 0; i < blockData.tx.length; i += 500) {
            const txChunk = blockData.tx
                .slice(i, i + 500)
                .filter((txid) => !this.skipTransaction(txid));
            const transactions = await Promise.all(
                txChunk.map((txid) =>
                    this.bitcoinService.getRawTransaction(txid).catch((error) => {
                        this.logger.error(`Failed to fetch transaction ${txid}: ${error.message}`, error);
                        return null;
                    }),
                )
            ).then((results) => results.filter((tx) => tx !== null));

            const filteredTransactions = transactions.filter((tx) => !this.skipTransaction(tx.txid));
            const transactionEntities = await this.transactionRepository.save(
                filteredTransactions.map((tx) => this.transactionRepository.create({ ...tx, block: savedBlock })).flat()
            );

            let inputs = [];
            let outputs = [];

            for (const [index, tx] of filteredTransactions.entries()) {
                const { vin, vout } = tx;

                for (const input of vin) {
                    const inputEntity = this.mapInputToEntity(input, transactionEntities[index]);
                    inputs.push(inputEntity);

                    const prevOutput = await this.transactionOutputRepository.findOne({
                        where: {
                            transactionId: input.txid,
                            n: input.vout
                        }
                    });

                    if (prevOutput && prevOutput.scriptPubKeyAddress) {
                        await this.addAddressTransaction(
                            prevOutput.scriptPubKeyAddress,
                            transactionEntities[index],
                            'spend',
                            savedBlock,
                            -prevOutput.value,
                            savedBlock.time
                        );
                    }
                }

                for (const output of vout) {
                    const outputEntity = this.mapOutputToEntity(output, transactionEntities[index]);
                    outputs.push(outputEntity);

                    if (outputEntity.scriptPubKeyAddress) {
                        await this.addAddressTransaction(
                            outputEntity.scriptPubKeyAddress,
                            transactionEntities[index],
                            'receive',
                            savedBlock,
                            outputEntity.value,
                            savedBlock.time
                        );
                    }
                }
            }

            await this.transactionInputRepository.save(inputs);
            await this.transactionOutputRepository.save(outputs);

            // Reset the arrays for the next chunk
            inputs = [];
            outputs = [];
        }

        console.timeEnd(`Block ${height} import time`);
        this.logger.info(`Block ${height} imported.`);
    }
    this.logger.info('Blockchain import complete!');
}


private async getAddressFromInput(input): Promise<string | null> {
  if (!input.txid || typeof input.vout !== 'number') {
      return null; // Return null if txid or vout is missing
  }

  // Assuming transactionOutputRepository is available and set up similar to other repositories
  const outputEntity = await this.transactionOutputRepository.findOne({
      where: {
          transactionId: input.txid,
          n: input.vout
      }
  });

  return outputEntity ? outputEntity.scriptPubKeyAddress : null;
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
    const address = this.bitcoinService.getAddressFromScriptPubKey(
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

          const existingExchangeRate =
            await this.exchangeRateRepository.findOne({
              where: { height: blockHeight },
            });
          if (!block || existingExchangeRate) {
            if (!block)
              console.warn(`Block with height ${blockHeight} not found.`);
            if (existingExchangeRate)
              console.warn(
                `Exchange rate for block ${blockHeight} already exists.`,
              );
            continue; // Skip this record if the block was not found
          }

          // Create and save the ExchangeRateEntity
          const exchangeRate = new ExchangeRateEntity();
          exchangeRate.currency = 'USD';
          exchangeRate.rate = rate;
          exchangeRate.height = blockHeight;
          exchangeRate.block = block;

          await this.exchangeRateRepository.save(exchangeRate);
          this.logger.info(
            `Imported exchange rate ${rate} for block ${blockHeight}.`,
          );
        }
        this.logger.info('Exchange rate import complete.');
      });
  }

  // Inside BlockchainImportService class

  async addAddressTransaction(
    address: string,
    transactionEntity: TransactionEntity,
    type: 'receive' | 'spend',
    blockEntity: BlockEntity,
    amount: number,
    time: number,
) {
    // Use a transactional approach to ensure atomicity
    const queryRunner = this.addressTransactionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        let currentBalance = 0;

        // Find the latest transaction for the address to get the current balance within a transaction
        const latestTransaction = await queryRunner.manager.findOne(AddressTransactionEntity, {
            where: { address },
            order: { time: 'DESC' }
        });

        if (latestTransaction) {
            currentBalance = parseFloat(latestTransaction.balance.toString());
        }

        // Update balance based on the transaction type
        const updatedBalance = type === 'receive'
            ? currentBalance + amount
            : currentBalance - amount;

        const addressTransaction = queryRunner.manager.create(AddressTransactionEntity, {
            address,
            transaction: transactionEntity,
            type,
            block: blockEntity,
            time,
            amount,
            balance: updatedBalance
        });

        await queryRunner.manager.save(addressTransaction);
        await queryRunner.commitTransaction();
    } catch (err) {
        // Handle errors and rollback transaction
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        // Release the query runner which is manually instantiated
        await queryRunner.release();
    }
}




  chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  }
}
