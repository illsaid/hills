-- Add RPC function for FireScore point-in-polygon query
CREATE OR REPLACE FUNCTION get_fire_zone(lat DOUBLE PRECISION, lon DOUBLE PRECISION)
RETURNS TABLE (zone_class TEXT, source TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT f.zone_class, f.source
    FROM fire_zones f
    WHERE ST_Covers(f.geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography)
    ORDER BY 
        CASE f.zone_class 
            WHEN 'VERY_HIGH' THEN 1 
            WHEN 'HIGH' THEN 2 
            ELSE 3 
        END
    LIMIT 1;
END;
$$;
