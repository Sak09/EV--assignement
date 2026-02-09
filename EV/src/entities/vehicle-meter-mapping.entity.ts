import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vehicle_meter_mapping')
@Index(['vehicleId', 'meterId'])
@Index(['vehicleId'])
@Index(['meterId'])
export class VehicleMeterMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  vehicleId: string;

  @Column({ type: 'varchar', length: 100 })
  @Index()
  meterId: string;

  @Column({ type: 'timestamptz', nullable: true })
  sessionStart: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sessionEnd: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
