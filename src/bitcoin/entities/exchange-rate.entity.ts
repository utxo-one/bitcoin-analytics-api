import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';
import { BlockEntity } from './block.entity';

@Entity('exchange_rates')
export class ExchangeRateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  currency: string;

  @Column('double')
  rate: number;

  @OneToOne(() => BlockEntity, { eager: false })
  @JoinColumn()
  block: BlockEntity;
}
