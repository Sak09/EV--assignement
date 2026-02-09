import { DataSourceOptions } from 'typeorm';
import { MeterHistory } from '../entities/meter-history.entity';
import { MeterLive } from '../entities/meter-live.entity';
import { VehicleHistory } from '../entities/vehicle-history.entity';
import { VehicleLive } from '../entities/vehicle-live.entity';

export class DatabaseConfig {
  createTypeOrmOptions(): DataSourceOptions {
    return {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'fleet_platform',
      entities: [MeterHistory, MeterLive, VehicleHistory, VehicleLive],
      synchronize: process.env.NODE_ENV !== 'production', 
      logging: process.env.NODE_ENV === 'development',
      migrations: ['dist/migrations/*.js'],
      migrationsRun: false,
    };
  }
}
