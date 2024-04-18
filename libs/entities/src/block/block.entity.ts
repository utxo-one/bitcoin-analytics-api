import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
  OneToOne,
} from 'typeorm';
import { TransactionEntity } from '../transaction/transaction.entity';
import { ExchangeRateEntity } from '../exchange-rate/exchange-rate.entity';

@Entity('blocks')
export class BlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  hash: string;

  @Column()
  size: number;

  @Column()
  strippedsize: number;

  @Column()
  weight: number;

  @Column()
  @Index({ unique: true })
  height: number;

  @Column()
  version: number;

  @Column()
  versionHex: string;

  @Column()
  merkleroot: string;

  @Column('json')
  tx: string[];

  @Column()
  time: number;

  @Column()
  mediantime: number;

  @Column({ type: 'bigint' })
  nonce: number;

  @Column()
  bits: string;

  @Column('double')
  difficulty: number;

  @Column()
  chainwork: string;

  @Column()
  nTx: number;

  @Column({ nullable: true })
  previousblockhash: string;

  @Column({ nullable: true })
  nextblockhash: string;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.block)
  transactions: TransactionEntity[];

  @OneToOne(() => ExchangeRateEntity, (exchangeRate) => exchangeRate.block)
  exchangeRate: ExchangeRateEntity;
}
