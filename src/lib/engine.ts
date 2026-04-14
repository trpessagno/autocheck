import { processListing, CarListing } from '../../supabase/functions/process-listing/logic';
import { sendTelegramAlert } from './telegram';

export async function runScraperCycle(config: {
    parseBotKey: string;
    telegramToken: string;
    telegramChatId: string;
    db: any; // Supabase client
    targetQuery?: { brand: string, model: string, year: string };
}) {
    console.log('🚀 Iniciando ciclo de scraping ONLINE con la API pre-compilada de Parse.bot...');

    const brand = config.targetQuery?.brand || 'Toyota';
    const model = config.targetQuery?.model || 'Hilux';
    const year = config.targetQuery?.year || '2020';

    // Format query correctly: e.g. "toyota-hilux-2020"
    const parsedQuery = `${brand}-${model}-${year}`.toLowerCase().replace(/\s+/g, '-');
    const parseBotUrl = `https://api.parse.bot/scraper/b64d50dd-1159-4ad9-8221-3717ff8bb42d/search_cars?query=${parsedQuery}&limit=12`;
    
    console.log(`🌐 Extrayendo datos de: ${parseBotUrl}`);
    
    let rawListings: any[] = [];
    
    try {
        const response = await fetch(parseBotUrl, {
            method: 'GET',
            headers: {
                'X-API-Key': config.parseBotKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error de Parse.bot HTTP ${response.status}: ${errorText}`);
        }

        const json = await response.json();
        // The actual API wraps the response in a { status: 'success', data: { listings: [...] } }
        if (json.data && json.data.listings && Array.isArray(json.data.listings)) {
            rawListings = json.data.listings;
        } else {
             console.error('Estructura recibida:', json);
             throw new Error('Estructura inesperada devuelta por Parse.bot API.');
        }

    } catch (parseBotError) {
        console.error('❌ Parse.bot falló durante la ejecución:', parseBotError);
        throw parseBotError; // rethrow so frontend UI shows the alert
    }

    if (!rawListings || rawListings.length === 0) {
        console.log('⚠️ Parse.bot no extrajo resultados.');
        return;
    }

    console.log(`📦 "Extracted" ${rawListings.length} listings from Parse API. Processing...`);

    // 4. Process each listing
    for (const raw of rawListings) {
        
        // We map `url` from parse output to `source_url` format, and pass it to algorithm
        const formattedListing: CarListing = {
             source_url: raw.url || raw.source_url, // fallback
             title: raw.title,
             brand: raw.brand,
             model: raw.model,
             year: raw.year,
             km: raw.km,
             price_original: raw.price_original,
             currency: raw.currency,
             location: raw.location,
             seller_type: raw.seller_type,
             image_url: raw.image_url
        };

        const processed = await processListing(formattedListing, config.db);
        
        if (processed) {
            // Save to DB
            const { error } = await config.db
                .from('car_listings')
                .upsert(processed, { onConflict: 'source_url' });

            if (error) {
                console.error(`❌ Error saving ${processed.title}:`, error);
                // continue, don't crash loop
                continue;
            }

            // 5. Telegram Alert
            if (processed.is_anomaly && processed.score > 8) {
                console.log(`🔥 Gang detectada! Enviando alerta para ${processed.title}`);
                await sendTelegramAlert(config.telegramToken, config.telegramChatId, processed);
            }
        }
    }

    console.log('🏁 Ciclo de extracción ONLINE completado.');
}
