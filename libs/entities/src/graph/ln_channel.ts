import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
} from 'typeorm';

@Entity('ln_channels')
export class LnChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  @Index('idx_ln_channel_channel_id', { unique: true })
  channel_id: string;

  @Column({ nullable: true })
  capacity: number;

  @Column({ nullable: true })
  open_height: number;

  @Column({ nullable: true })
  close_height: number;

  @Column({ nullable: true })
  transaction_id: string;

  @Column()
  transaction_vout: number;

  @OneToMany(() => LnPolicy, (policy) => policy.id)
  policies: LnPolicy[];

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}

//ln_policies table
@Entity('ln_policies')
export class LnPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  channel_id: string;

  @Column({ nullable: true })
  base_fee_mtokens: string;

  @Column({ nullable: true })
  cltv_delta: number;

  @Column({ nullable: true })
  fee_rate: number;

  @Column({ nullable: true })
  is_disabled: boolean;

  @Column({ nullable: true })
  max_htlc_mtokens: string;

  @Column({ nullable: true })
  min_htlc_mtokens: string;

  @Column()
  public_key: string;

  @ManyToOne(() => LnChannel, (channel) => channel.id, {
    eager: false,
    nullable: false,
  })
  channel: LnChannel;

  @Column({ nullable: true })
  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
