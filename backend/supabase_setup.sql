-- =============================================================================
-- SmartCity Dash: Supabase Database Schema with PostGIS
-- =============================================================================
-- Run this entire script in Supabase SQL Editor
-- It will set up everything needed for geospatial hazard tracking


-- 1. ENABLE POSTGIS EXTENSION
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS is enabled
SELECT postgis_version();


-- 2. CREATE DRIVERS TABLE (linked to Supabase Auth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    vehicle_type TEXT,
    license_plate TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS (Row Level Security) for drivers
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own driver record
CREATE POLICY "drivers_select_own" ON drivers
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update only their own record
CREATE POLICY "drivers_update_own" ON drivers
    FOR UPDATE USING (auth.uid() = id);


-- 3. CREATE HAZARDS TABLE (Core hazard data with PostGIS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS hazards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    hazard_type TEXT NOT NULL,
    severity_level TEXT NOT NULL,
    confidence_score DECIMAL(3, 3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    description TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for hazards
ALTER TABLE hazards ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read hazards
CREATE POLICY "hazards_select_all" ON hazards
    FOR SELECT USING (TRUE);

-- Policy: Drivers can insert their own hazards
CREATE POLICY "hazards_insert_own" ON hazards
    FOR INSERT WITH CHECK (auth.uid() = driver_id);

-- 4. CREATE GEOSPATIAL INDEXES
-- =============================================================================
-- GIST index for fast spatial queries on location column
CREATE INDEX idx_hazards_location_gist ON hazards USING GIST(location);

-- Index on driver_id for fast lookups
CREATE INDEX idx_hazards_driver_id ON hazards(driver_id);

-- Index on severity_level for filtering
CREATE INDEX idx_hazards_severity ON hazards(severity_level);

-- Index on hazard_type for filtering
CREATE INDEX idx_hazards_type ON hazards(hazard_type);

-- Index on created_at for time-based queries
CREATE INDEX idx_hazards_created_at ON hazards(created_at DESC);


-- 5. CREATE RPC: Insert Hazard Safely
-- =============================================================================
CREATE OR REPLACE FUNCTION insert_hazard(
    p_driver_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_hazard_type TEXT,
    p_severity_level TEXT,
    p_confidence_score DECIMAL
)
RETURNS TABLE (
    id UUID,
    driver_id UUID,
    hazard_type TEXT,
    severity_level TEXT,
    confidence_score DECIMAL,
    latitude DECIMAL,
    longitude DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    INSERT INTO hazards (
        driver_id,
        hazard_type,
        severity_level,
        confidence_score,
        location,
        latitude,
        longitude
    )
    VALUES (
        p_driver_id,
        p_hazard_type,
        p_severity_level,
        p_confidence_score,
        ST_MakeGeography(ST_MakePoint(p_longitude, p_latitude)::geometry),
        p_latitude,
        p_longitude
    )
    RETURNING
        hazards.id,
        hazards.driver_id,
        hazards.hazard_type,
        hazards.severity_level,
        hazards.confidence_score,
        hazards.latitude,
        hazards.longitude,
        hazards.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_hazard TO authenticated;


-- 6. CREATE RPC: Fetch Hazards Within Radius
-- =============================================================================
CREATE OR REPLACE FUNCTION get_hazards_within_radius(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_km DECIMAL DEFAULT 2.0
)
RETURNS TABLE (
    id UUID,
    driver_id UUID,
    hazard_type TEXT,
    severity_level TEXT,
    confidence_score DECIMAL,
    latitude DECIMAL,
    longitude DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    distance_meters INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id,
        h.driver_id,
        h.hazard_type,
        h.severity_level,
        h.confidence_score,
        h.latitude,
        h.longitude,
        h.created_at,
        CAST(
            ST_Distance(
                h.location,
                ST_MakeGeography(ST_MakePoint(p_longitude, p_latitude)::geometry)
            ) AS INT
        ) AS distance_meters
    FROM hazards h
    WHERE ST_DWithin(
        h.location,
        ST_MakeGeography(ST_MakePoint(p_longitude, p_latitude)::geometry),
        p_radius_km * 1000  -- Convert km to meters
    )
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to all users (for nearby hazards endpoint)
GRANT EXECUTE ON FUNCTION get_hazards_within_radius TO anon, authenticated;


-- 7. CREATE MATERIALIZED VIEW FOR DASHBOARD STATS (Optional but useful)
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS hazard_statistics AS
SELECT
    DATE_TRUNC('day', created_at)::DATE AS report_date,
    hazard_type,
    severity_level,
    COUNT(*) AS total_count,
    ROUND(AVG(confidence_score)::NUMERIC, 3) AS avg_confidence_score,
    ROUND(MAX(confidence_score)::NUMERIC, 3) AS max_confidence_score
FROM hazards
GROUP BY report_date, hazard_type, severity_level;

-- Create index on materialized view
CREATE INDEX idx_hazard_statistics_date ON hazard_statistics(report_date DESC);

-- Refresh command (run periodically):
-- REFRESH MATERIALIZED VIEW hazard_statistics;


-- 8. VERIFY SETUP
-- =============================================================================
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('drivers', 'hazards');

-- Check PostGIS is working (with proper type casting)
SELECT ST_Distance(
    ST_GeomFromText('POINT(77.2090 28.6139)', 4326)::geography,
    ST_GeomFromText('POINT(77.2100 28.6150)', 4326)::geography
) AS distance_meters;

-- Check functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('insert_hazard', 'get_hazards_within_radius')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
