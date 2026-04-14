-- Car Listings Table
CREATE TABLE IF NOT EXISTS car_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    km INTEGER NOT NULL,
    price_original NUMERIC NOT NULL,
    currency TEXT NOT NULL, -- ARS, USD
    price_usd NUMERIC NOT NULL,
    location TEXT,
    seller_type TEXT, -- Particular, Agency
    image_url TEXT,
    is_anomaly BOOLEAN DEFAULT FALSE,
    score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster grouping/median calculation
CREATE INDEX IF NOT EXISTS idx_car_listings_grouping ON car_listings (brand, model, year);

-- Function to calculate median (PostgreSQL doesn't have a built-in median function for numeric types easily)
CREATE OR REPLACE FUNCTION calculate_median(numeric[])
RETURNS numeric AS $$
    SELECT (
        SELECT avg(val)
        FROM (
            SELECT val
            FROM unnest($1) val
            ORDER BY 1
            LIMIT 2 - mod(array_upper($1, 1), 2)
            OFFSET ceil(array_upper($1, 1) / 2.0) - 1
        ) sub
    );
$$ LANGUAGE sql IMMUTABLE;
