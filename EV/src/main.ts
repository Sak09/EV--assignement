import 'reflect-metadata';
import * as dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DatabaseConfig } from './config/database.config';
import { MeterHistory } from './entities/meter-history.entity';
import { MeterLive } from './entities/meter-live.entity';
import { VehicleHistory } from './entities/vehicle-history.entity';
import { VehicleLive } from './entities/vehicle-live.entity';
import { IngestionService } from './ingestion/services/ingestion.service';
import { AnalyticsService } from './analytics/services/analytics.service';
import { NotFoundError } from './analytics/errors/not-found.error';
import { MeterTelemetryDto } from './ingestion/dto/meter-telemetry.dto';
import { VehicleTelemetryDto } from './ingestion/dto/vehicle-telemetry.dto';
import {
  isMeterTelemetry,
  isVehicleTelemetry,
} from './ingestion/dto/telemetry-union.dto';


dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const dbConfig = new DatabaseConfig();
const dataSource = new DataSource(dbConfig.createTypeOrmOptions());

let ingestionService: IngestionService;
let analyticsService: AnalyticsService;

async function initializeServices() {
  const meterHistoryRepo = dataSource.getRepository(MeterHistory);
  const meterLiveRepo = dataSource.getRepository(MeterLive);
  const vehicleHistoryRepo = dataSource.getRepository(VehicleHistory);
  const vehicleLiveRepo = dataSource.getRepository(VehicleLive);

  ingestionService = new IngestionService(
    meterHistoryRepo,
    meterLiveRepo,
    vehicleHistoryRepo,
    vehicleLiveRepo,
  );

  analyticsService = new AnalyticsService(
    vehicleHistoryRepo,
    dataSource.getRepository(MeterHistory),
  );
}

async function validateDto(
  req: Request,
  res: Response,
  next: NextFunction,
  DtoClass: any,
) {
  const dto = plainToInstance(DtoClass, req.body);
  const errors = await validate(dto);

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.map((error) => ({
        property: error.property,
        constraints: error.constraints,
      })),
    });
  }

  req.body = dto;
  next();
}


app.post(
  '/v1/ingestion/telemetry',
  async (req: Request, res: Response) => {
    try {
      const telemetry = req.body;

      if (isMeterTelemetry(telemetry)) {
        const dto = plainToInstance(MeterTelemetryDto, telemetry);
        const errors = await validate(dto);
        if (errors.length > 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors,
          });
        }
        await ingestionService.ingestMeter(dto);
        return res.status(202).json({ status: 'accepted', type: 'meter' });
      } else if (isVehicleTelemetry(telemetry)) {
        const dto = plainToInstance(VehicleTelemetryDto, telemetry);
        const errors = await validate(dto);
        if (errors.length > 0) {
          return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors,
          });
        }
        await ingestionService.ingestVehicle(dto);
        return res.status(202).json({ status: 'accepted', type: 'vehicle' });
      } else {
        return res.status(400).json({
          status: 'error',
          message:
            'Invalid telemetry format. Must be either Meter or Vehicle telemetry.',
        });
      }
    } catch (error: any) {
      return res.status(400).json({
        status: 'error',
        message: `Failed to ingest telemetry: ${error.message}`,
      });
    }
  },
);


app.post(
  '/v1/ingestion/meter',
  async (req: Request, res: Response, next: NextFunction) => {
    await validateDto(req, res, next, MeterTelemetryDto);
  },
  async (req: Request, res: Response) => {
    try {
      await ingestionService.ingestMeter(req.body);
      res.status(202).json({ status: 'accepted', type: 'meter' });
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: `Failed to ingest meter telemetry: ${error.message}`,
      });
    }
  },
);


app.post(
  '/v1/ingestion/vehicle',
  async (req: Request, res: Response, next: NextFunction) => {
    await validateDto(req, res, next, VehicleTelemetryDto);
  },
  async (req: Request, res: Response) => {
    try {
      await ingestionService.ingestVehicle(req.body);
      res.status(202).json({ status: 'accepted', type: 'vehicle' });
    } catch (error: any) {
      res.status(400).json({
        status: 'error',
        message: `Failed to ingest vehicle telemetry: ${error.message}`,
      });
    }
  },
);


app.post('/v1/ingestion/batch', async (req: Request, res: Response) => {
  try {
    const telemetryArray = req.body;
    if (!Array.isArray(telemetryArray)) {
      return res.status(400).json({
        status: 'error',
        message: 'Request body must be an array',
      });
    }

    await ingestionService.ingestBatch(telemetryArray);
    res.status(202).json({
      status: 'accepted',
      count: telemetryArray.length,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: `Failed to ingest batch: ${error.message}`,
    });
  }
});


app.get('/v1/analytics/performance/:vehicleId', async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const hours = req.query.hours
      ? parseInt(req.query.hours as string, 10)
      : 24;
    const meterId = req.query.meterId as string | undefined;

    let result;
    if (meterId) {
      result = await analyticsService.getVehiclePerformanceWithMeterCorrelation(
        vehicleId,
        meterId,
        hours,
      );
    } else {
      result = await analyticsService.getVehiclePerformance(vehicleId, hours);
    }

    res.json(result);
  } catch (error: any) {
    if (error instanceof NotFoundError || error.status === 404) {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    res.status(500).json({
      status: 'error',
      message: `Failed to get analytics: ${error.message}`,
    });
  }
});


app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Fleet Platform Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      ingestion: {
        polymorphic: 'POST /v1/ingestion/telemetry',
        meter: 'POST /v1/ingestion/meter',
        vehicle: 'POST /v1/ingestion/vehicle',
        batch: 'POST /v1/ingestion/batch',
      },
      analytics: {
        performance: 'GET /v1/analytics/performance/:vehicleId',
      },
      health: 'GET /health',
    },
  });
});


app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});


async function bootstrap() {
  try {
    await dataSource.initialize();
    console.log('Database connected successfully');

    await initializeServices();
    console.log('Services initialized');
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Fleet Platform Backend running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
