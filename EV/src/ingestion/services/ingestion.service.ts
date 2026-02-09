import { Repository } from 'typeorm';
import { MeterIngestionService } from './meter-ingestion.service';
import { VehicleIngestionService } from './vehicle-ingestion.service';
import { MeterTelemetryDto } from '../dto/meter-telemetry.dto';
import { VehicleTelemetryDto } from '../dto/vehicle-telemetry.dto';
import {
  isMeterTelemetry,
  isVehicleTelemetry,
} from '../dto/telemetry-union.dto';
import { MeterHistory } from '../../entities/meter-history.entity';
import { MeterLive } from '../../entities/meter-live.entity';
import { VehicleHistory } from '../../entities/vehicle-history.entity';
import { VehicleLive } from '../../entities/vehicle-live.entity';


export class IngestionService {
  private meterIngestionService: MeterIngestionService;
  private vehicleIngestionService: VehicleIngestionService;

  constructor(
    meterHistoryRepo: Repository<MeterHistory>,
    meterLiveRepo: Repository<MeterLive>,
    vehicleHistoryRepo: Repository<VehicleHistory>,
    vehicleLiveRepo: Repository<VehicleLive>,
  ) {
    this.meterIngestionService = new MeterIngestionService(
      meterHistoryRepo,
      meterLiveRepo,
    );
    this.vehicleIngestionService = new VehicleIngestionService(
      vehicleHistoryRepo,
      vehicleLiveRepo,
    );
  }

  async ingestMeter(telemetry: MeterTelemetryDto): Promise<void> {
    await this.meterIngestionService.ingest(telemetry);
  }

  async ingestVehicle(telemetry: VehicleTelemetryDto): Promise<void> {
    await this.vehicleIngestionService.ingest(telemetry);
  }

  
  async ingestBatch(
    telemetryArray: (MeterTelemetryDto | VehicleTelemetryDto)[],
  ): Promise<void> {
    const meterTelemetry: MeterTelemetryDto[] = [];
    const vehicleTelemetry: VehicleTelemetryDto[] = [];


    for (const telemetry of telemetryArray) {
      if (isMeterTelemetry(telemetry)) {
        meterTelemetry.push(telemetry);
      } else if (isVehicleTelemetry(telemetry)) {
        vehicleTelemetry.push(telemetry);
      }
    }

    const promises: Promise<void>[] = [];
    if (meterTelemetry.length > 0) {
      promises.push(this.meterIngestionService.ingestBatch(meterTelemetry));
    }
    if (vehicleTelemetry.length > 0) {
      promises.push(
        this.vehicleIngestionService.ingestBatch(vehicleTelemetry),
      );
    }

    await Promise.all(promises);
  }
}
