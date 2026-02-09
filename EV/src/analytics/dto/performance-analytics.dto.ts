export class PerformanceAnalyticsDto {
  vehicleId: string;
  periodStart: Date;
  periodEnd: Date;
  totalKwhConsumedAc: number;
  totalKwhDeliveredDc: number;
  efficiencyRatio: number; 
  averageBatteryTemp: number;
  recordCount: number;
}
