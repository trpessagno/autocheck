import { processListing, CarListing } from '../../supabase/functions/process-listing/logic';

// Telegram temporalmente deshabilitado
// import { sendTelegramAlert } from './telegram';

export async function runScraperCycle(config: {
    parseBotKey: string;
    telegramToken: string;
    telegramChatId: string;
    db: any; // Supabase client
    targetQuery?: { brand: string, model: string, year: string };
}) {
    console.log('🚀 Iniciando scraping a través de Parse.bot (Proxy Network) para evadir IP Block de ML...');

    const brand = config.targetQuery?.brand || 'Toyota';
    const model = config.targetQuery?.model || 'Hilux';
    const year = config.targetQuery?.year || '2020';

    const query = `${brand}-${model}-${year}`.toLowerCase().replace(/\s+/g, '-');
    
    // Parse.bot Precompiled API Endpoint
    const url = `https://api.parse.bot/scraper/b64d50dd-1159-4ad9-8221-3717ff8bb42d/search_cars?query=${query}&limit=48`;
    
    console.log(`🌐 Fetching: ${url}`);
    
    let rawListings: CarListing[] = [];
    
    try {
        const response = await fetch(url, {
            headers: {
                'X-API-Key': config.parseBotKey
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Parse.bot falló: ${response.statusText}`);
        }

        const json = await response.json();
        
        // Parse.bot wraps response in data.listings
        if (json.data && json.data.listings && Array.isArray(json.data.listings)) {
            rawListings = json.data.listings.map((item: any) => ({
                title: item.title || '',
                source_url: item.url || item.link || '',
                image_url: item.image || item.image_url || '',
                price_original: parseInt(item.price?.toString().replace(/\D/g, '')) || 0,
                currency: item.currency === 'U$S' || item.currency === 'USD' ? 'USD' : 'ARS',
                brand,
                model,
                year: parseInt(item.year?.toString()) || parseInt(year),
                km: parseInt(item.kilometers?.toString().replace(/\D/g, '')) || 0,
                location: item.location || 'Desconocido',
                seller_type: item.seller_type || 'Particular'
            }));
        } else {
            console.error('Structura inesperada:', json);
            return { count: 0, error: 'La API de Parse.bot devolvió una estructura vacía o inválida.' };
        }

    } catch (scrapeError: any) {
        console.error('❌ Fallo Parse.bot:', scrapeError);
        return { count: 0, error: scrapeError.message };
    }

    if (!rawListings || rawListings.length === 0) {
        return { count: 0, error: 'No se encontraron autos para esta búsqueda.' };
    }

    console.log(`📦 Encontrados ${rawListings.length} autos en Parse.bot. Insertando en Supabase...`);

    let processedCount = 0;
    let lastError = '';
    for (const raw of rawListings) {
        if (!raw.source_url) continue;

        const processed = await processListing(raw, config.db);
        
        if (processed) {
            let { error } = await config.db
                .from('car_listings')
                .upsert(processed, { onConflict: 'source_url' });

            if (error && error.message.includes('schema cache') && processed.image_url) {
                delete processed.image_url;
                const retry = await config.db.from('car_listings').upsert(processed, { onConflict: 'source_url' });
                error = retry.error;
            }

            if (error) {
                console.error(`❌ Error BD:`, error.message);
                lastError = error.message;
                continue;
            }
            
            processedCount++;
        }
    }

    return { count: processedCount, error: processedCount === 0 ? `Cero insertados. Error: ${lastError}` : '' };
}
