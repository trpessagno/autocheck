import { ParseBotClient } from './parse-bot';
import { getDolarBlue } from './criptoya';
import { processListing } from '../../supabase/functions/process-listing/logic';
import { sendTelegramAlert } from './telegram';

export async function runScraperCycle(config: {
    parseBotKey: string;
    telegramToken: string;
    telegramChatId: string;
    db: any; // Supabase client
}) {
    const client = new ParseBotClient(config.parseBotKey);
    
    console.log('🚀 Inciando ciclo de scraping...');

    // 1. Dispatch dynamic scraper
    const url = 'https://autos.mercadolibre.com.ar/autos-camionetas/capital-federal/particular/_OrderId_PRICE_ASC';
    const description = 'Extract car listings including title, brand, model, year, km, price_original, currency, location, and seller_type. Return as a list of objects.';
    
    const taskId = await client.dispatch(url, description);
    console.log(`✅ Task dispatched: ${taskId}. Waiting for completion...`);

    // 2. Poll for scraper_id
    const scraperId = await client.pollStatus(taskId);
    console.log(`✅ Scraper generated: ${scraperId}`);

    // 3. Extract data
    const rawListings = await client.extractData<any>(scraperId);
    console.log(`📦 Extracted ${rawListings.length} listings. Processing...`);

    // 4. Process each listing
    for (const raw of rawListings) {
        const processed = await processListing(raw as any, config.db);
        
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
                console.log(`🔥 Ginga detectada! Enviando alerta para ${processed.title}`);
                await sendTelegramAlert(config.telegramToken, config.telegramChatId, processed);
            }
        }
    }

    console.log('🏁 Ciclo completado.');
}
