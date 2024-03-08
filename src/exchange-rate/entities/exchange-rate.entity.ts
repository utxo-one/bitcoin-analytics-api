import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { BlockEntity } from '../../block/entities/block.entity';

@Entity('exchange_rates')
export class ExchangeRateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  currency: string;

  @Column('double')
  rate: number;

  @Column()
  height: number;

  @OneToOne(() => BlockEntity, { eager: false })
  @JoinColumn()
  block: BlockEntity;
}
