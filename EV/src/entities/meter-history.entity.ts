import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

@Entity('meter_history')
@Index(['meterId', 'timestamp'])
export class MeterHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  meterId: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  kwhConsumedAc: number;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  voltage: number;

  @Column({ type: 'timestamptz' })
  @Index()
  timestamp: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
