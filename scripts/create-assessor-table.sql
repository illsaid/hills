-- Parcel Details (Physical Attributes Coverage)
CREATE TABLE IF NOT EXISTS parcel_details (
    apn TEXT PRIMARY KEY, -- Formatted APN (e.g. 5555-002-013)
    ain TEXT, -- Raw AIN (e.g. 5555002013)
    address TEXT,
    city TEXT,
    zip_code TEXT,
    year_built INT,
    sqft INT,
    units INT,
    bedrooms INT,
    bathrooms INT,
    assessed_value NUMERIC, -- Land + Imp
    zoning TEXT,
    use_code TEXT,
    use_type TEXT,
    raw_data JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcel_zip ON parcel_details(zip_code);
CREATE INDEX IF NOT EXISTS idx_parcel_ain ON parcel_details(ain);
