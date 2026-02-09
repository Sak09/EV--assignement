# Fleet Platform Backend

A high-scale backend system for managing Smart Meter and EV Fleet telemetry ingestion and analytics, built with Node.js, Express, and PostgreSQL.

## System Architecture

### Core Design Principles

1. **Polymorphic Ingestion**: Handles two distinct telemetry streams (Meter and Vehicle) arriving every 60 seconds
2. **Data Temperature Separation**: 
   - **Hot Store (Operational)**: Fast access for current status via UPSERT operations
   - **Cold Store (Historical)**: Append-only INSERT for audit trail and long-term analytics
3. **Performance Optimization**: Indexed queries prevent full table scans on historical data

### Database Schema

#### Operational (Hot) Tables
- `meter_live`: Current meter status (UPSERT strategy)
- `vehicle_live`: Current vehicle status (UPSERT strategy)

#### Historical (Cold) Tables
- `meter_history`: Append-only meter telemetry (INSERT strategy)
- `vehicle_history`: Append-only vehicle telemetry (INSERT strategy)

All historical tables are indexed on `(entityId, timestamp)` and `timestamp` for efficient time-range queries.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js (TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Validation**: class-validator, class-transformer

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (create `.env` file):
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=fleet_platform
NODE_ENV=development
PORT=3000
```

4. Create PostgreSQL database:
```sql
CREATE DATABASE fleet_platform;
```

5. Run the application:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Ingestion Endpoints

#### POST `/v1/ingestion/telemetry`
Polymorphic endpoint that accepts either Meter or Vehicle telemetry.

**Meter Telemetry Example:**
```json
{
  "meterId": "METER-001",
  "kwhConsumedAc": 150.5,
  "voltage": 240.0,
  "timestamp": "2026-02-09T10:00:00Z"
}
```

**Vehicle Telemetry Example:**
```json
{
  "vehicleId": "VEHICLE-001",
  "soc": 85.5,
  "kwhDeliveredDc": 45.2,
  "batteryTemp": 28.5,
  "timestamp": "2026-02-09T10:00:00Z"
}
```

#### POST `/v1/ingestion/meter`
Meter-specific ingestion endpoint.

#### POST `/v1/ingestion/vehicle`
Vehicle-specific ingestion endpoint.

#### POST `/v1/ingestion/batch`
Batch ingestion for high-throughput scenarios. Accepts an array of telemetry objects.

### Analytics Endpoints

#### GET `/v1/analytics/performance/:vehicleId`
Returns 24-hour performance summary for a vehicle.

**Query Parameters:**
- `hours` (optional): Time window in hours (default: 24)
- `meterId` (optional): Specific meter ID for precise correlation

**Response:**
```json
{
  "vehicleId": "VEHICLE-001",
  "periodStart": "2026-02-08T10:00:00Z",
  "periodEnd": "2026-02-09T10:00:00Z",
  "totalKwhConsumedAc": 150.5,
  "totalKwhDeliveredDc": 135.2,
  "efficiencyRatio": 0.898,
  "averageBatteryTemp": 28.5,
  "recordCount": 1440
}
```

**Efficiency Ratio**: DC/AC ratio. Values below 0.85 may indicate hardware faults or energy leakage.

## Data Flow

1. **Ingestion**: Telemetry arrives via POST endpoints
2. **Validation**: DTOs validate incoming data structure
3. **Dual Write**:
   - INSERT into history table (append-only)
   - UPSERT into live table (current status)
4. **Analytics**: Queries use indexed timestamp ranges to avoid full table scans

## Performance Considerations

- **Indexing**: All historical tables have composite indexes on `(entityId, timestamp)` and `timestamp`
- **Query Optimization**: Analytics queries use indexed timestamp filters
- **Batch Operations**: Supports batch ingestion for high-throughput scenarios
- **Connection Pooling**: TypeORM handles connection pooling automatically

## Production Recommendations

1. **Database Partitioning**: Consider partitioning historical tables by month/year for better performance
2. **Vehicle-Meter Mapping**: Implement a `charging_session` or `vehicle_meter_mapping` table for accurate correlation
3. **Caching**: Add Redis for frequently accessed live status data
4. **Monitoring**: Implement logging and metrics (e.g., Prometheus)
5. **Rate Limiting**: Add rate limiting for ingestion endpoints
6. **Migrations**: Use TypeORM migrations in production (set `synchronize: false`)

## Testing

Example curl commands:

```bash
# Ingest meter telemetry
curl -X POST http://localhost:3000/v1/ingestion/meter \
  -H "Content-Type: application/json" \
  -d '{
    "meterId": "METER-001",
    "kwhConsumedAc": 150.5,
    "voltage": 240.0,
    "timestamp": "2026-02-09T10:00:00Z"
  }'

# Ingest vehicle telemetry
curl -X POST http://localhost:3000/v1/ingestion/vehicle \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "VEHICLE-001",
    "soc": 85.5,
    "kwhDeliveredDc": 45.2,
    "batteryTemp": 28.5,
    "timestamp": "2026-02-09T10:00:00Z"
  }'

# Get analytics
curl http://localhost:3000/v1/analytics/performance/VEHICLE-001?hours=24
```

## License

UNLICENSED
