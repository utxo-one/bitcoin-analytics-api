import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransactionEntity } from './transaction.entity';

@Entity('transaction_inputs')
export class TransactionInputEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TransactionEntity, (transaction) => transaction.vin)
  @JoinColumn({ name: 'transactionId' })
  transaction: TransactionEntity;

  @Column()
  transactionId: string;

  @Column({ nullable: true})
  txid: string;

  @Column({ nullable: true})
  vout: number;

  @Column('text', { nullable: true })
  scriptSigAsm: string;

  @Column('text', { nullable: true })
  scriptSigHex: string;

  @Column('bigint')
  sequence: number;

  @Column({ nullable: true })
  coinbase: string; // Add this line to your entity
}
