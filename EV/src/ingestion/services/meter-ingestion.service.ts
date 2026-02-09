import { Repository } from 'typeorm';
import { MeterHistory } from '../../entities/meter-history.entity';
import { MeterLive } from '../../entities/meter-live.entity';
import { MeterTelemetryDto } from '../dto/meter-telemetry.dto';

export class MeterIngestionService {
  constructor(
    private meterHistoryRepository: Repository<MeterHistory>,
    private meterLiveRepository: Repository<MeterLive>,
  ) {}

  async ingest(telemetry: MeterTelemetryDto): Promise<void> {
    const timestamp = new Date(telemetry.timestamp);

    const historyRecord = this.meterHistoryRepository.create({
      meterId: telemetry.meterId,
      kwhConsumedAc: telemetry.kwhConsumedAc,
      voltage: telemetry.voltage,
      timestamp,
    });
    await this.meterHistoryRepository.save(historyRecord);

  
    await this.meterLiveRepository.upsert(
      {
        meterId: telemetry.meterId,
        kwhConsumedAc: telemetry.kwhConsumedAc,
        voltage: telemetry.voltage,
        timestamp,
      },
      ['meterId'], 
    );
  }

  
  async ingestBatch(telemetryArray: MeterTelemetryDto[]): Promise<void> {
    const timestampedRecords = telemetryArray.map((t) => ({
      ...t,
      timestamp: new Date(t.timestamp),
    }));

    const historyRecords = timestampedRecords.map((t) =>
      this.meterHistoryRepository.create({
        meterId: t.meterId,
        kwhConsumedAc: t.kwhConsumedAc,
        voltage: t.voltage,
        timestamp: t.timestamp,
      }),
    );
    await this.meterHistoryRepository.save(historyRecords);

    const liveRecords = timestampedRecords.map((t) => ({
      meterId: t.meterId,
      kwhConsumedAc: t.kwhConsumedAc,
      voltage: t.voltage,
      timestamp: t.timestamp,
    }));
    await this.meterLiveRepository.upsert(liveRecords, ['meterId']);
  }
}
