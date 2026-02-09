import { Repository } from 'typeorm';
import { VehicleHistory } from '../../entities/vehicle-history.entity';
import { VehicleLive } from '../../entities/vehicle-live.entity';
import { VehicleTelemetryDto } from '../dto/vehicle-telemetry.dto';

export class VehicleIngestionService {
  constructor(
    private vehicleHistoryRepository: Repository<VehicleHistory>,
    private vehicleLiveRepository: Repository<VehicleLive>,
  ) {}

 
  async ingest(telemetry: VehicleTelemetryDto): Promise<void> {
    const timestamp = new Date(telemetry.timestamp);

    const historyRecord = this.vehicleHistoryRepository.create({
      vehicleId: telemetry.vehicleId,
      soc: telemetry.soc,
      kwhDeliveredDc: telemetry.kwhDeliveredDc,
      batteryTemp: telemetry.batteryTemp,
      timestamp,
    });
    await this.vehicleHistoryRepository.save(historyRecord);

    await this.vehicleLiveRepository.upsert(
      {
        vehicleId: telemetry.vehicleId,
        soc: telemetry.soc,
        kwhDeliveredDc: telemetry.kwhDeliveredDc,
        batteryTemp: telemetry.batteryTemp,
        timestamp,
      },
      ['vehicleId'], 
    );
  }

  async ingestBatch(telemetryArray: VehicleTelemetryDto[]): Promise<void> {
    const timestampedRecords = telemetryArray.map((t) => ({
      ...t,
      timestamp: new Date(t.timestamp),
    }));

    const historyRecords = timestampedRecords.map((t) =>
      this.vehicleHistoryRepository.create({
        vehicleId: t.vehicleId,
        soc: t.soc,
        kwhDeliveredDc: t.kwhDeliveredDc,
        batteryTemp: t.batteryTemp,
        timestamp: t.timestamp,
      }),
    );
    await this.vehicleHistoryRepository.save(historyRecords);


    const liveRecords = timestampedRecords.map((t) => ({
      vehicleId: t.vehicleId,
      soc: t.soc,
      kwhDeliveredDc: t.kwhDeliveredDc,
      batteryTemp: t.batteryTemp,
      timestamp: t.timestamp,
    }));
    await this.vehicleLiveRepository.upsert(liveRecords, ['vehicleId']);
  }
}
