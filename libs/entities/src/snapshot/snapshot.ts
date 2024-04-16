import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('snapshots')
export class Snapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  snapshot_id: string;

  @Column({ nullable: false })
  snapshot_height: number;

  @Column({ nullable: false })
  snapshot_hash: string;

  @Column({ nullable: false })
  snapshot_timestamp: number;

  @Column({ nullable: false })
  snapshot_type: string;

  @Column({ nullable: false })
  snapshot_data: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
