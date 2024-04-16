import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  average_channel_size: number;

  @Column({ nullable: false })
  channel_count: number;

  @Column({ nullable: false })
  max_channel_size: number;

  @Column({ nullable: false })
  median_channel_size: number;

  @Column({ nullable: false })
  min_channel_size: number;

  @Column({ nullable: false })
  node_count: number;

  @Column({ nullable: false })
  not_recently_updated_policy_count: number;

  @Column({ nullable: false })
  total_capacity: number;

  @CreateDateColumn({ type: 'timestamp' })
  @Index('idx_snapshot_created_at')
  created_at: Date;
}
