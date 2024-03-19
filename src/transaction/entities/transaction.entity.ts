import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BlockEntity } from '../../block/entities/block.entity';
import { TransactionInputEntity } from './transaction-input.entity';
import { TransactionOutputEntity } from './transaction-output.entity';
import { TransactionDetail } from 'src/bitcoind/bitcoind.types';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: true })
  txid: string;

  @Column()
  hash: string;

  @Column('bigint')
  version: number;

  @Column()
  size: number;

  @Column()
  vsize: number;

  @Column()
  weight: number;

  @Column('bigint')
  locktime: number;

  @OneToMany(() => TransactionInputEntity, (vin) => vin.transaction, {
    cascade: false,
  })
  vin: TransactionInputEntity[];

  @OneToMany(() => TransactionOutputEntity, (vout) => vout.transaction, {
    cascade: false,
  })
  vout: TransactionOutputEntity[];

  // currently dropping hex as it may be redundant
  // @Column('text')
  // hex: string;

  @Column()
  @Index()
  blockhash: string;

  @ManyToOne(() => BlockEntity, (block) => block.transactions)
  block: BlockEntity;

  @Column()
  confirmations: number;

  @Column('bigint')
  time: number;

  @Column('bigint')
  blocktime: number;

  // Serialize walletconflicts array as JSON. Ensure your DB supports JSON type. For others, consider 'text' and serialize manually.
  @Column('json', { nullable: true })
  walletconflicts: string;

  @Column({ nullable: true })
  comment: string;

  // Use 'enum' type for known values. Adjust column type if your database doesn't support ENUM.
  @Column('varchar', { nullable: true })
  bip125_replaceable: 'yes' | 'no' | 'unknown';

  // Assuming details will be stored as a JSON string or similar. Adjust according to your application's needs.
  @Column('json', { nullable: true })
  details: TransactionDetail[];
}
