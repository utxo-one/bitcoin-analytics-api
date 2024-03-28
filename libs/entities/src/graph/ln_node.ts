import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ln_node')
export class LnNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  alias: string;

  @Column()
  color: string;

  @Column('simple-json')
  features: {
    bit: number;
    is_known: boolean;
    is_required: boolean;
    type?: string;
  }[];

  @Column()
  @Index('idx_ln_node_public_key', { unique: true })
  public_key: string;

  @Column('simple-array', { nullable: true })
  sockets: string[];

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
