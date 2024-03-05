import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TransactionEntity } from './transaction.entity';

@Entity('transaction_outputs')
export class TransactionOutputEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TransactionEntity, transaction => transaction.vout)
  @JoinColumn({ name: 'transactionId' })
  transaction: TransactionEntity;

  @Column()
  transactionId: string;

  @Column('decimal', { precision: 16, scale: 8 })
  value: number;

  @Column()
  n: number;

  @Column('text', { nullable: true })
  scriptPubKeyAsm: string;

  @Column('text', { nullable: true })
  scriptPubKeyHex: string;

  @Column({ nullable: true })
  scriptPubKeyType: string;

  @Column({ nullable: true })
  scriptPubKeyAddress: string;
}
