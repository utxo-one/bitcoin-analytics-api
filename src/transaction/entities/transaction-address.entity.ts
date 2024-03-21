import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { TransactionEntity } from './transaction.entity'; // Adjust the import path as needed
import { BlockEntity } from 'src/block/entities/block.entity';

@Entity('address_transactions')
export class AddressTransactionEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    @Index()
    address: string;

    @ManyToOne(() => TransactionEntity, transaction => transaction.id)
    transaction: TransactionEntity;

    @ManyToOne(() => BlockEntity, block => block.id)
    block: BlockEntity;

    @Column({
        type: 'enum',
        enum: ['receive', 'spend']
    })
    type: 'receive' | 'spend';

    @Column()
    time: number;

    @Column('decimal', { precision: 18, scale: 8 })
    amount: number;

    @Column('decimal', { precision: 18, scale: 8, default: 0 })
    balance: number; // Running balance

    @UpdateDateColumn()
    lastUpdate: Date;
}
