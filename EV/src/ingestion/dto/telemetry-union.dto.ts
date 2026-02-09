import { MeterTelemetryDto } from './meter-telemetry.dto';
import { VehicleTelemetryDto } from './vehicle-telemetry.dto';


export type TelemetryDto = MeterTelemetryDto | VehicleTelemetryDto;

export function isMeterTelemetry(
  telemetry: TelemetryDto,
): telemetry is MeterTelemetryDto {
  return 'meterId' in telemetry && 'kwhConsumedAc' in telemetry && 'voltage' in telemetry;
}


export function isVehicleTelemetry(
  telemetry: TelemetryDto,
): telemetry is VehicleTelemetryDto {
  return 'vehicleId' in telemetry && 'soc' in telemetry && 'kwhDeliveredDc' in telemetry && 'batteryTemp' in telemetry;
}
