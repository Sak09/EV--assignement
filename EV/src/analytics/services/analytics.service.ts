import { NotFoundError } from '../errors/not-found.error';
import { Repository } from 'typeorm';
import { VehicleHistory } from '../../entities/vehicle-history.entity';
import { MeterHistory } from '../../entities/meter-history.entity';
import { PerformanceAnalyticsDto } from '../dto/performance-analytics.dto';

export class AnalyticsService {
  constructor(
    private vehicleHistoryRepository: Repository<VehicleHistory>,
    private meterHistoryRepository: Repository<MeterHistory>,
  ) {}

  async getVehiclePerformance(
    vehicleId: string,
    hours: number = 24,
  ): Promise<PerformanceAnalyticsDto> {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - hours * 60 * 60 * 1000);
    const vehicleRecords = await this.vehicleHistoryRepository
      .createQueryBuilder('vh')
      .where('vh.vehicleId = :vehicleId', { vehicleId })
      .andWhere('vh.timestamp >= :periodStart', { periodStart })
      .andWhere('vh.timestamp <= :periodEnd', { periodEnd })
      .orderBy('vh.timestamp', 'ASC')
      .getMany();

    if (vehicleRecords.length === 0) {
      throw new NotFoundError(
        `No telemetry data found for vehicle ${vehicleId} in the last ${hours} hours`,
      );
    }
    const totalKwhDeliveredDc = vehicleRecords.reduce(
      (sum, record) => sum + Number(record.kwhDeliveredDc),
      0,
    );
    const averageBatteryTemp =
      vehicleRecords.reduce(
        (sum, record) => sum + Number(record.batteryTemp),
        0,
      ) / vehicleRecords.length;

 
    const meterRecords = await this.meterHistoryRepository
      .createQueryBuilder('mh')
      .where('mh.timestamp >= :periodStart', { periodStart })
      .andWhere('mh.timestamp <= :periodEnd', { periodEnd })
      .orderBy('mh.timestamp', 'ASC')
      .getMany();


    const totalKwhConsumedAc = meterRecords.reduce(
      (sum, record) => sum + Number(record.kwhConsumedAc),
      0,
    );


    const efficiencyRatio =
      totalKwhConsumedAc > 0
        ? totalKwhDeliveredDc / totalKwhConsumedAc
        : null;

    return {
      vehicleId,
      periodStart,
      periodEnd,
      totalKwhConsumedAc,
      totalKwhDeliveredDc,
      efficiencyRatio: efficiencyRatio || 0,
      averageBatteryTemp,
      recordCount: vehicleRecords.length,
    };
  }

 
  async getVehiclePerformanceWithMeterCorrelation(
    vehicleId: string,
    meterId: string,
    hours: number = 24,
  ): Promise<PerformanceAnalyticsDto> {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - hours * 60 * 60 * 1000);

    const vehicleRecords = await this.vehicleHistoryRepository
      .createQueryBuilder('vh')
      .where('vh.vehicleId = :vehicleId', { vehicleId })
      .andWhere('vh.timestamp >= :periodStart', { periodStart })
      .andWhere('vh.timestamp <= :periodEnd', { periodEnd })
      .orderBy('vh.timestamp', 'ASC')
      .getMany();

    if (vehicleRecords.length === 0) {
      throw new NotFoundError(
        `No telemetry data found for vehicle ${vehicleId} in the last ${hours} hours`,
      );
    }

    const meterRecords = await this.meterHistoryRepository
      .createQueryBuilder('mh')
      .where('mh.meterId = :meterId', { meterId })
      .andWhere('mh.timestamp >= :periodStart', { periodStart })
      .andWhere('mh.timestamp <= :periodEnd', { periodEnd })
      .orderBy('mh.timestamp', 'ASC')
      .getMany();

    const totalKwhDeliveredDc = vehicleRecords.reduce(
      (sum, record) => sum + Number(record.kwhDeliveredDc),
      0,
    );
    const averageBatteryTemp =
      vehicleRecords.reduce(
        (sum, record) => sum + Number(record.batteryTemp),
        0,
      ) / vehicleRecords.length;

   
    const totalKwhConsumedAc = meterRecords.reduce(
      (sum, record) => sum + Number(record.kwhConsumedAc),
      0,
    );

   
    const efficiencyRatio =
      totalKwhConsumedAc > 0
        ? totalKwhDeliveredDc / totalKwhConsumedAc
        : 0;

    return {
      vehicleId,
      periodStart,
      periodEnd,
      totalKwhConsumedAc,
      totalKwhDeliveredDc,
      efficiencyRatio,
      averageBatteryTemp,
      recordCount: vehicleRecords.length,
    };
  }
}
