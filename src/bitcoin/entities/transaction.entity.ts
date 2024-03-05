import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BlockEntity } from './block.entity';
import { TransactionInputEntity } from './transaction-input.entity';
import { TransactionOutputEntity } from './transaction-output.entity';
import { TransactionDetail } from '../bitcoin.types';

@Entity('transactions')
export class TransactionEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    txid: string;

    @Column()
    hash: string;

    @Column()
    version: number;

    @Column()
    size: number;

    @Column()
    vsize: number;

    @Column()
    weight: number;

    @Column()
    locktime: number;

    @OneToMany(() => TransactionInputEntity, vin => vin.transaction, { cascade: true })
    vin: TransactionInputEntity[];

    @OneToMany(() => TransactionOutputEntity, vout => vout.transaction, { cascade: true })
    vout: TransactionOutputEntity[];

    @Column('text')
    hex: string;

    @Column()
    blockhash: string;

    @ManyToOne(() => BlockEntity, block => block.transactions)
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
