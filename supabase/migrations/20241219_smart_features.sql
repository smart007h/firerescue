-- Smart Features Database Schema Migration
-- Version: 2.0.0
-- Date: 2024-12-19

-- AI Predictive Analytics Tables
CREATE TABLE IF NOT EXISTS ai_risk_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    risk_score DECIMAL(3, 2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'EXTREME')),
    weather_data JSONB,
    historical_data JSONB,
    environmental_data JSONB,
    recommendations JSONB,
    confidence DECIMAL(3, 2) DEFAULT 0.8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS ai_incident_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    priority_score DECIMAL(3, 2) NOT NULL CHECK (priority_score >= 0 AND priority_score <= 1),
    priority_level TEXT NOT NULL CHECK (priority_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    text_analysis JSONB,
    media_analysis JSONB,
    confidence DECIMAL(3, 2) DEFAULT 0.8,
    response_recommendation JSONB,
    estimated_severity TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS ai_resource_optimizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    optimization_timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    active_incidents JSONB,
    available_resources JSONB,
    allocation_plan JSONB,
    efficiency_score DECIMAL(3, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Drone Operations Tables
CREATE TABLE IF NOT EXISTS drone_fleet (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    drone_id TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    capabilities JSONB,
    current_location JSONB,
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    status TEXT NOT NULL CHECK (status IN ('available', 'active', 'maintenance', 'charging', 'offline')),
    last_maintenance TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS drone_missions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mission_id TEXT UNIQUE NOT NULL,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    drone_id TEXT REFERENCES drone_fleet(drone_id) ON DELETE SET NULL,
    mission_type TEXT NOT NULL CHECK (mission_type IN ('reconnaissance', 'damage_assessment', 'search_rescue', 'monitoring')),
    target_location JSONB NOT NULL,
    flight_path JSONB,
    objectives JSONB,
    status TEXT NOT NULL CHECK (status IN ('planning', 'deploying', 'active', 'completed', 'aborted')),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS damage_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mission_id TEXT REFERENCES drone_missions(mission_id) ON DELETE CASCADE,
    structural_damage JSONB,
    fire_extent JSONB,
    hazardous_areas JSONB,
    evacuation_data JSONB,
    thermal_analysis JSONB,
    confidence DECIMAL(3, 2) DEFAULT 0.8,
    recommendations JSONB,
    assessment_images JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS search_rescue_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mission_id TEXT REFERENCES drone_missions(mission_id) ON DELETE CASCADE,
    search_area JSONB NOT NULL,
    victims_detected INTEGER DEFAULT 0,
    victim_locations JSONB,
    search_coverage DECIMAL(3, 2),
    weather_conditions JSONB,
    recommendations JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- IoT Sensor Network Tables
CREATE TABLE IF NOT EXISTS iot_sensors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sensor_id TEXT UNIQUE NOT NULL,
    sensor_type TEXT NOT NULL CHECK (sensor_type IN ('smoke_detector', 'heat_sensor', 'gas_detector', 'water_sensor', 'air_quality', 'structural_monitor')),
    location JSONB NOT NULL,
    building_id TEXT,
    protocol TEXT NOT NULL CHECK (protocol IN ('zigbee', 'wifi', 'lorawan', 'cellular')),
    capabilities JSONB,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance', 'offline')),
    battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS iot_sensor_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sensor_id TEXT REFERENCES iot_sensors(sensor_id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    data_type TEXT NOT NULL,
    value DECIMAL(10, 4) NOT NULL,
    unit TEXT,
    quality_score DECIMAL(3, 2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS iot_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_id TEXT UNIQUE NOT NULL,
    sensor_id TEXT REFERENCES iot_sensors(sensor_id) ON DELETE CASCADE,
    sensor_type TEXT NOT NULL,
    metric TEXT NOT NULL,
    value DECIMAL(10, 4) NOT NULL,
    threshold DECIMAL(10, 4) NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    location JSONB,
    description TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS building_systems (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id TEXT NOT NULL,
    system_type TEXT NOT NULL CHECK (system_type IN ('fire_safety', 'hvac', 'electrical', 'water')),
    system_data JSONB,
    status TEXT NOT NULL CHECK (status IN ('operational', 'warning', 'critical', 'offline')),
    last_inspection TIMESTAMP WITH TIME ZONE,
    next_maintenance TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Blockchain Credentials Tables
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    block_index INTEGER UNIQUE NOT NULL,
    block_hash TEXT UNIQUE NOT NULL,
    previous_hash TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    transactions JSONB,
    nonce INTEGER DEFAULT 0,
    difficulty INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS blockchain_references (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('incident', 'certificate', 'equipment', 'training')),
    block_hash TEXT REFERENCES blockchain_blocks(block_hash),
    record_type TEXT NOT NULL,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS blockchain_certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    certificate_id TEXT UNIQUE NOT NULL,
    certificate_type TEXT NOT NULL CHECK (certificate_type IN ('training', 'response', 'equipment', 'safety')),
    recipient_id UUID REFERENCES auth.users(id),
    issuer_organization TEXT NOT NULL,
    block_hash TEXT REFERENCES blockchain_blocks(block_hash),
    transaction_id TEXT NOT NULL,
    certificate_data JSONB,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    valid_until TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'revoked', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS certificate_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    certificate_id TEXT REFERENCES blockchain_certificates(certificate_id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT TRUE,
    revoked BOOLEAN DEFAULT FALSE,
    suspended BOOLEAN DEFAULT FALSE,
    revocation_reason TEXT,
    revoked_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS equipment_supply_chain (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id TEXT UNIQUE NOT NULL,
    equipment_type TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    block_hash TEXT REFERENCES blockchain_blocks(block_hash),
    supply_chain_data JSONB,
    current_owner UUID REFERENCES auth.users(id),
    current_location JSONB,
    authenticity_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- AR/VR Features Tables
CREATE TABLE IF NOT EXISTS ar_hazard_markers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    hazard_type TEXT NOT NULL CHECK (hazard_type IN ('fire', 'smoke', 'structural_damage', 'electrical', 'chemical', 'biological')),
    location JSONB NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    safety_distance INTEGER DEFAULT 10,
    active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS ar_navigation_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    route_name TEXT NOT NULL,
    start_location JSONB NOT NULL,
    end_location JSONB NOT NULL,
    waypoints JSONB,
    route_type TEXT NOT NULL CHECK (route_type IN ('evacuation', 'response', 'rescue', 'supply')),
    safety_rating INTEGER CHECK (safety_rating >= 1 AND safety_rating <= 5),
    estimated_time INTEGER, -- in seconds
    created_by UUID REFERENCES auth.users(id),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Smart Analytics and Reporting Tables
CREATE TABLE IF NOT EXISTS predictive_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id TEXT NOT NULL,
    equipment_type TEXT NOT NULL,
    health_score DECIMAL(3, 2) CHECK (health_score >= 0 AND health_score <= 1),
    failure_probability DECIMAL(3, 2) CHECK (failure_probability >= 0 AND failure_probability <= 1),
    recommended_action TEXT,
    next_maintenance_date DATE,
    cost_optimization JSONB,
    analysis_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS smart_analytics_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_type TEXT NOT NULL CHECK (report_type IN ('ai_analysis', 'drone_mission', 'iot_monitoring', 'blockchain_audit', 'predictive_maintenance')),
    report_data JSONB NOT NULL,
    generated_by UUID REFERENCES auth.users(id),
    time_period JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_ai_risk_assessments_location ON ai_risk_assessments USING GIST ((location_lat, location_lng));
CREATE INDEX IF NOT EXISTS idx_ai_risk_assessments_created_at ON ai_risk_assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_incident_analyses_incident_id ON ai_incident_analyses(incident_id);
CREATE INDEX IF NOT EXISTS idx_ai_incident_analyses_priority_level ON ai_incident_analyses(priority_level);

CREATE INDEX IF NOT EXISTS idx_drone_missions_incident_id ON drone_missions(incident_id);
CREATE INDEX IF NOT EXISTS idx_drone_missions_status ON drone_missions(status);
CREATE INDEX IF NOT EXISTS idx_drone_missions_created_at ON drone_missions(created_at);

CREATE INDEX IF NOT EXISTS idx_iot_sensors_sensor_type ON iot_sensors(sensor_type);
CREATE INDEX IF NOT EXISTS idx_iot_sensors_status ON iot_sensors(status);
CREATE INDEX IF NOT EXISTS idx_iot_sensor_data_sensor_id ON iot_sensor_data(sensor_id);
CREATE INDEX IF NOT EXISTS idx_iot_sensor_data_timestamp ON iot_sensor_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_iot_alerts_severity ON iot_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_iot_alerts_acknowledged ON iot_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_block_index ON blockchain_blocks(block_index);
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_block_hash ON blockchain_blocks(block_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_references_entity_id ON blockchain_references(entity_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_certificates_certificate_id ON blockchain_certificates(certificate_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_certificates_recipient_id ON blockchain_certificates(recipient_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_certificates_status ON blockchain_certificates(status);

CREATE INDEX IF NOT EXISTS idx_ar_hazard_markers_incident_id ON ar_hazard_markers(incident_id);
CREATE INDEX IF NOT EXISTS idx_ar_hazard_markers_active ON ar_hazard_markers(active);

-- Row Level Security (RLS) Policies
ALTER TABLE ai_risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_incident_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE drone_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockchain_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for different user roles
CREATE POLICY "AI risk assessments viewable by emergency personnel" ON ai_risk_assessments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM firefighters WHERE user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM dispatchers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Drone missions viewable by authorized personnel" ON drone_missions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM firefighters WHERE user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM dispatchers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "IoT alerts viewable by emergency personnel" ON iot_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM firefighters WHERE user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM dispatchers WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Certificates viewable by owner or emergency personnel" ON blockchain_certificates
    FOR SELECT USING (
        recipient_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM firefighters WHERE user_id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM dispatchers WHERE user_id = auth.uid()
        )
    );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_ai_risk_assessments_updated_at BEFORE UPDATE ON ai_risk_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drone_fleet_updated_at BEFORE UPDATE ON drone_fleet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drone_missions_updated_at BEFORE UPDATE ON drone_missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iot_sensors_updated_at BEFORE UPDATE ON iot_sensors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_systems_updated_at BEFORE UPDATE ON building_systems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_supply_chain_updated_at BEFORE UPDATE ON equipment_supply_chain
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ar_hazard_markers_updated_at BEFORE UPDATE ON ar_hazard_markers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ar_navigation_routes_updated_at BEFORE UPDATE ON ar_navigation_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificate_status_updated_at BEFORE UPDATE ON certificate_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO drone_fleet (drone_id, model, capabilities, current_location, battery_level, status) VALUES
('DRONE_001', 'FireHawk Pro', '{"thermal_imaging": true, "optical_zoom": 20, "max_flight_time": 45, "max_range": 5000, "live_streaming": true}', '{"latitude": 40.7128, "longitude": -74.0060}', 85, 'available'),
('DRONE_002', 'SkyGuard X1', '{"thermal_imaging": true, "optical_zoom": 15, "max_flight_time": 30, "max_range": 3000, "live_streaming": true}', '{"latitude": 40.7580, "longitude": -73.9855}', 92, 'available'),
('DRONE_003', 'RescueFalcon', '{"thermal_imaging": false, "optical_zoom": 25, "max_flight_time": 60, "max_range": 8000, "live_streaming": true}', '{"latitude": 40.6892, "longitude": -74.0445}', 67, 'maintenance');

INSERT INTO iot_sensors (sensor_id, sensor_type, location, protocol, status, battery_level) VALUES
('SMOKE_001', 'smoke_detector', '{"latitude": 40.7128, "longitude": -74.0060, "floor": 1, "room": "lobby"}', 'zigbee', 'active', 85),
('HEAT_001', 'heat_sensor', '{"latitude": 40.7128, "longitude": -74.0060, "floor": 2, "room": "kitchen"}', 'wifi', 'active', 92),
('GAS_001', 'gas_detector', '{"latitude": 40.7128, "longitude": -74.0060, "floor": 1, "room": "basement"}', 'lorawan', 'active', 78),
('AIR_001', 'air_quality', '{"latitude": 40.7580, "longitude": -73.9855, "floor": 3, "room": "office"}', 'wifi', 'active', 88);

-- Create views for easier data access
CREATE OR REPLACE VIEW smart_dashboard_summary AS
SELECT 
    (SELECT COUNT(*) FROM ai_incident_analyses WHERE priority_level = 'CRITICAL' AND created_at > NOW() - INTERVAL '24 hours') as critical_incidents_today,
    (SELECT COUNT(*) FROM drone_missions WHERE status = 'active') as active_drone_missions,
    (SELECT COUNT(*) FROM iot_alerts WHERE acknowledged = false AND severity IN ('high', 'critical')) as unacknowledged_critical_alerts,
    (SELECT COUNT(*) FROM blockchain_certificates WHERE status = 'active') as active_certificates,
    (SELECT AVG(risk_score) FROM ai_risk_assessments WHERE created_at > NOW() - INTERVAL '24 hours') as avg_risk_score_today;

CREATE OR REPLACE VIEW emergency_readiness_status AS
SELECT 
    'drone_fleet' as system_type,
    COUNT(*) as total_units,
    COUNT(*) FILTER (WHERE status = 'available') as available_units,
    COUNT(*) FILTER (WHERE status = 'active') as active_units,
    AVG(battery_level) as avg_battery_level
FROM drone_fleet
UNION ALL
SELECT 
    'iot_sensors' as system_type,
    COUNT(*) as total_units,
    COUNT(*) FILTER (WHERE status = 'active') as available_units,
    COUNT(*) FILTER (WHERE status = 'offline') as active_units,
    AVG(battery_level) as avg_battery_level
FROM iot_sensors;

-- Grant permissions to authenticated users
GRANT SELECT ON smart_dashboard_summary TO authenticated;
GRANT SELECT ON emergency_readiness_status TO authenticated;

-- Complete the migration
INSERT INTO public.schema_migrations (version, applied_at) VALUES ('20241219_smart_features', NOW())
ON CONFLICT (version) DO NOTHING;
