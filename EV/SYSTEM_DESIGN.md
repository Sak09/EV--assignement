# Fleet Platform Backend - System Design

## Architecture Overview

This system implements a high-scale telemetry ingestion and analytics platform for managing 10,000+ Smart Meters and EV Fleets. The architecture follows a **dual-write pattern** with **data temperature separation** to optimize both write-heavy ingestion and read-heavy analytics.

## Core Design Patterns

### 1. Polymorphic Ingestion

The system accepts two distinct telemetry types through a unified ingestion layer:

- **Meter Stream**: `{ meterId, kwhConsumedAc, voltage, timestamp }`
- **Vehicle Stream**: `{ vehicleId, soc, kwhDeliveredDc, batteryTemp, timestamp }`

**Implementation**:
- Type guards (`isMeterTelemetry`, `isVehicleTelemetry`) route telemetry to appropriate handlers
- Separate DTOs with class-validator for type safety
- Unified endpoint (`POST /v1/ingestion/telemetry`) with automatic type detection

### 2. Data Temperature Separation

#### Hot Store (Operational)
- **Tables**: `meter_live`, `vehicle_live`
- **Strategy**: UPSERT (atomic update)
- **Purpose**: Fast dashboard queries for current status
- **Access Pattern**: Single-row lookup by `meterId` or `vehicleId`
- **Performance**: O(1) lookup via primary key

#### Cold Store (Historical)
- **Tables**: `meter_history`, `vehicle_history`
- **Strategy**: INSERT (append-only)
- **Purpose**: Audit trail and long-term analytics
- **Access Pattern**: Time-range queries with indexed filters
- **Performance**: Indexed queries prevent full table scans

### 3. Dual-Write Pattern

Every telemetry ingestion performs two operations:

```typescript
// 1. Append to history (audit trail)
await historyRepository.save(record);

// 2. Update live status (current state)
await liveRepository.upsert(record, ['entityId']);
```

**Benefits**:
- Complete audit trail for compliance and debugging
- Fast current status queries without scanning history
- No data loss if one write fails (can be retried)

## Database Schema Design

### Indexing Strategy

All historical tables use composite indexes for optimal query performance:

```sql
-- Composite index for entity-specific time-range queries
CREATE INDEX idx_vehicle_history_vehicle_timestamp 
    ON vehicle_history(vehicle_id, timestamp);

-- Single-column index for global time-range queries
CREATE INDEX idx_vehicle_history_timestamp 
    ON vehicle_history(timestamp);
```

**Query Optimization**:
- Analytics queries use `WHERE vehicleId = ? AND timestamp >= ? AND timestamp <= ?`
- PostgreSQL uses the composite index, avoiding full table scans
- Time-range filters leverage timestamp index for efficient pruning

### Data Types

- **Energy Values**: `DECIMAL(10, 3)` - Precision for kWh calculations
- **Percentages**: `DECIMAL(5, 2)` - SoC (0-100%) with CHECK constraints
- **Temperatures**: `DECIMAL(5, 2)` - Battery temperature in Celsius
- **Timestamps**: `TIMESTAMPTZ` - Timezone-aware timestamps

## Performance Considerations

### Write Performance

1. **Batch Operations**: Supports batch ingestion for high-throughput scenarios
2. **Connection Pooling**: TypeORM handles connection pooling automatically
3. **Index Maintenance**: Indexes are optimized for write-heavy workloads

### Read Performance

1. **Indexed Queries**: All analytics queries use indexed columns
2. **Query Builder**: TypeORM QueryBuilder generates optimized SQL
3. **Time-Range Filtering**: Narrow time windows reduce data scanned

### Scalability

**Current Capacity**:
- 10,000+ devices × 1 record/minute = 600,000 writes/hour
- With batch operations: ~10,000 writes/second capacity

**Future Optimizations**:
- Table partitioning by month/year for historical data
- Read replicas for analytics queries
- Caching layer (Redis) for live status

## Analytics Endpoint Design

### GET /v1/analytics/performance/:vehicleId

**Query Strategy**:
1. Filter vehicle history by `vehicleId` and `timestamp` range (indexed)
2. Aggregate metrics: `SUM(kwhDeliveredDc)`, `AVG(batteryTemp)`
3. Correlate with meter data (via `meterId` parameter or mapping table)
4. Calculate efficiency ratio: `DC/AC`

**Performance**:
- Uses composite index: `(vehicleId, timestamp)`
- Avoids full table scan
- Typical query time: <100ms for 24-hour window

**Efficiency Calculation**:
```typescript
efficiencyRatio = totalKwhDeliveredDc / totalKwhConsumedAc
// Expected range: 0.85 - 0.95 (85% - 95% efficiency)
// Values < 0.85 indicate hardware fault or energy leakage
```

## Error Handling

- **Validation**: DTOs validate incoming data structure and types
- **Database Errors**: Caught and wrapped in meaningful HTTP errors
- **Not Found**: Returns 404 with descriptive message when no data exists
- **Bad Request**: Returns 400 for invalid telemetry format

## Security Considerations

1. **Input Validation**: All inputs validated via class-validator
2. **SQL Injection**: TypeORM parameterized queries prevent SQL injection
3. **Rate Limiting**: Should be added in production (e.g., via express-rate-limit)
4. **Authentication**: Should be added in production (e.g., JWT tokens)

## Monitoring & Observability

**Recommended Metrics**:
- Ingestion rate (records/second)
- Query latency (p50, p95, p99)
- Database connection pool usage
- Error rates by endpoint

**Recommended Logging**:
- Ingestion success/failure
- Query execution times
- Database connection issues

## Future Enhancements

1. **Charging Session Management**: Track active charging sessions
2. **Real-time Alerts**: Notify on efficiency drops below threshold
3. **Data Retention Policies**: Archive old historical data
4. **GraphQL API**: For flexible frontend queries
5. **WebSocket Support**: Real-time telemetry streaming
