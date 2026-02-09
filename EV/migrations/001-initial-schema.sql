
CREATE TABLE IF NOT EXISTS meter_live (
    meter_id VARCHAR(100) PRIMARY KEY,
    kwh_consumed_ac DECIMAL(10, 3) NOT NULL,
    voltage DECIMAL(8, 2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_live (
    vehicle_id VARCHAR(100) PRIMARY KEY,
    soc DECIMAL(5, 2) NOT NULL CHECK (soc >= 0 AND soc <= 100),
    kwh_delivered_dc DECIMAL(10, 3) NOT NULL,
    battery_temp DECIMAL(5, 2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meter_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meter_id VARCHAR(100) NOT NULL,
    kwh_consumed_ac DECIMAL(10, 3) NOT NULL,
    voltage DECIMAL(8, 2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id VARCHAR(100) NOT NULL,
    soc DECIMAL(5, 2) NOT NULL CHECK (soc >= 0 AND soc <= 100),
    kwh_delivered_dc DECIMAL(10, 3) NOT NULL,
    battery_temp DECIMAL(5, 2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meter_history_meter_timestamp 
    ON meter_history(meter_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_meter_history_timestamp 
    ON meter_history(timestamp);


CREATE INDEX IF NOT EXISTS idx_vehicle_history_vehicle_timestamp 
    ON vehicle_history(vehicle_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_timestamp 
    ON vehicle_history(timestamp);


CREATE TABLE IF NOT EXISTS vehicle_meter_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id VARCHAR(100) NOT NULL,
    meter_id VARCHAR(100) NOT NULL,
    session_start TIMESTAMPTZ,
    session_end TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_meter_mapping_vehicle 
    ON vehicle_meter_mapping(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_meter_mapping_meter 
    ON vehicle_meter_mapping(meter_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_meter_mapping_composite 
    ON vehicle_meter_mapping(vehicle_id, meter_id);


COMMENT ON TABLE meter_live IS 'Operational (hot) store for current meter status. Uses UPSERT strategy.';
COMMENT ON TABLE vehicle_live IS 'Operational (hot) store for current vehicle status. Uses UPSERT strategy.';
COMMENT ON TABLE meter_history IS 'Historical (cold) store for meter telemetry. Append-only INSERT strategy.';
COMMENT ON TABLE vehicle_history IS 'Historical (cold) store for vehicle telemetry. Append-only INSERT strategy.';
COMMENT ON TABLE vehicle_meter_mapping IS 'Mapping table to correlate vehicles with meters during charging sessions.';
