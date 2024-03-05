import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { TransactionEntity } from './transaction.entity';

@Entity('blocks')
export class BlockEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hash: string;

  @Column()
  confirmations: number;

  @Column()
  size: number;

  @Column()
  strippedsize: number;

  @Column()
  weight: number;

  @Column()
  height: number;

  @Column()
  version: number;

  @Column()
  versionHex: string;

  @Column()
  merkleroot: string;

  @Column('simple-array')
  tx: string[];

  @Column()
  time: number;

  @Column()
  mediantime: number;

  @Column({type: 'bigint'})
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

  @OneToMany(() => TransactionEntity, transaction => transaction.block)
  transactions: TransactionEntity[];
}
