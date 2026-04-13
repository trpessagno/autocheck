import { getDolarBlue, normalizeToUsd } from '../../src/lib/criptoya';

export interface CarListing {
    source_url: string;
    title: string;
    brand: string;
    model: string;
    year: number;
    km: number;
    price_original: number;
    currency: string;
    location: string;
    seller_type: string;
}

export interface ProcessedListing extends CarListing {
    price_usd: number;
    is_anomaly: boolean;
    score: number;
}

export async function processListing(listing: CarListing, db: any): Promise<ProcessedListing | null> {
    // 1. Anti-scam filters
    const scamKeywords = ['plan de ahorro', 'cuotas', 'financiado', 'anticipo'];
    const titleLower = listing.title.toLowerCase();
    if (scamKeywords.some(kw => titleLower.includes(kw))) {
        console.log(`Skipping scam listing: ${listing.title}`);
        return null;
    }

    // 2. Currency Normalization
    const blueRate = await getDolarBlue();
    const priceUsd = await normalizeToUsd(listing.price_original, listing.currency, blueRate);

    if (priceUsd < 1000) {
        console.log(`Skipping low price listing: ${priceUsd} USD`);
        return null;
    }

    // 3. Anomaly Calculation
    // Group by Brand, Model, Year and KM Range (20k km)
    const kmRange = Math.floor(listing.km / 20000) * 20000;
    
    // In a real Edge Function, this would be a SQL query
    const { data: similarCars } = await db
        .from('car_listings')
        .select('price_usd')
        .eq('brand', listing.brand)
        .eq('model', listing.model)
        .eq('year', listing.year)
        .gte('km', kmRange)
        .lt('km', kmRange + 20000);

    const prices = similarCars?.map((c: any) => c.price_usd) || [];
    
    if (prices.length < 3) {
        // Not enough data for anomaly detection yet, just save it
        return {
            ...listing,
            price_usd: priceUsd,
            is_anomaly: false,
            score: 0
        };
    }

    // Calculate median (simplified here, in SQL we would use the function defined in schema.sql)
    prices.sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;

    const savingsFactor = (median - priceUsd) / median;
    const isAnomaly = savingsFactor >= 0.15;
    
    // Score based on savings factor (0.2 savings = score 8)
    const score = Math.max(0, Math.min(10, (savingsFactor / 0.25) * 10));

    return {
        ...listing,
        price_usd: priceUsd,
        is_anomaly: isAnomaly,
        score: parseFloat(score.toFixed(2))
    };
}
