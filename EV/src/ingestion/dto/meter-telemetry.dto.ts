import { IsString, IsNumber, IsDateString, IsNotEmpty } from 'class-validator';

export class MeterTelemetryDto {
  @IsString()
  @IsNotEmpty()
  meterId: string;

  @IsNumber()
  @IsNotEmpty()
  kwhConsumedAc: number;

  @IsNumber()
  @IsNotEmpty()
  voltage: number;

  @IsDateString()
  @IsNotEmpty()
  timestamp: string;
}
