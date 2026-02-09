import { IsString, IsNumber, IsDateString, IsNotEmpty, Min, Max } from 'class-validator';

export class VehicleTelemetryDto {
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  soc: number; 

  @IsNumber()
  @IsNotEmpty()
  kwhDeliveredDc: number;

  @IsNumber()
  @IsNotEmpty()
  batteryTemp: number; 

  @IsDateString()
  @IsNotEmpty()
  timestamp: string;
}
