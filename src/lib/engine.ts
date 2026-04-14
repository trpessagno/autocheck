import { ParseBotClient } from './parse-bot';
import { processListing, CarListing } from '../../supabase/functions/process-listing/logic';
import { sendTelegramAlert } from './telegram';

export async function runScraperCycle(config: {
    parseBotKey: string;
    telegramToken: string;
    telegramChatId: string;
    db: any; // Supabase client
    targetQuery?: { brand: string, model: string, year: string };
}) {
    console.log('🚀 Iniciando ciclo de scraping real con Parse.bot...');

    const brand = config.targetQuery?.brand || 'Toyota';
    const model = config.targetQuery?.model || 'Hilux';
    const year = config.targetQuery?.year || '2020';

    const client = new ParseBotClient(config.parseBotKey);

    // Formatear Búsqueda a MercadoLibre MLA
    // Ej: "Toyota", "SW4", "2020" -> "https://autos.mercadolibre.com.ar/toyota-sw4/2020/_OrderId_PRICE_ASC"
    const parsedQuery = encodeURIComponent(`${brand} ${model}`.toLowerCase().trim().replace(/ /g, '-'));
    const url = `https://autos.mercadolibre.com.ar/${parsedQuery}/${year}/_OrderId_PRICE_ASC`;

    const taskDescription = 'Extract car listings including title, brand, model, year, km, price_original, currency, location, seller_type, and the main image_url of the car. Return as a list of objects.';
    
    console.log(`🌐 MercadoLibre URL: ${url}`);
    
    let rawListings: CarListing[] = [];
    
    try {
        rawListings = await client.runFullExtractionPipeline<CarListing>(url, taskDescription);
    } catch (parseBotError) {
        console.error('❌ Parse.bot falló durante la ejecución:', parseBotError);
        throw parseBotError; // rethrow so frontend UI shows the alert
    }

    if (!rawListings || rawListings.length === 0) {
        console.log('⚠️ Parse.bot no extrajo resultados.');
        return;
    }

    console.log(`📦 "Extracted" ${rawListings.length} listings. Processing...`);

    // 4. Process each listing
    for (const raw of rawListings) {
        const processed = await processListing(raw, config.db);
        
        if (processed) {
            // Save to DB
            const { error } = await config.db
                .from('car_listings')
                .upsert(processed, { onConflict: 'source_url' });

            if (error) {
                console.error(`❌ Error saving ${processed.title}:`, error);
                continue;
            }

            // 5. Telegram Alert
            if (processed.is_anomaly && processed.score > 8) {
                console.log(`🔥 Gang detectada! Enviando alerta para ${processed.title}`);
                await sendTelegramAlert(config.telegramToken, config.telegramChatId, processed);
            }
        }
    }

    console.log('🏁 Ciclo de extracción completado.');
}
