require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

async function test() {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await db.from('car_listings').upsert({
        source_url: 'https://test.com/auto',
        title: 'Toyota Hilux 2020',
        brand: 'Toyota',
        model: 'Hilux',
        year: 2020,
        km: 50000,
        price_original: 45000,
        currency: 'USD',
        price_usd: 45000,
        is_anomaly: false,
        score: 0,
        location: 'CABA',
        seller_type: 'Particular',
        image_url: 'https://test.com/image.jpg'
    }, { onConflict: 'source_url' });

    console.log('Result:', { data, error });
}
test();
